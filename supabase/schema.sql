-- ReComiendo — esquema de base de datos
-- Ejecutar completo en Supabase → SQL Editor
--
-- Modelo:
--   profiles ─┬─< favoritos >── locales ──< categorias_carta
--             │                    │               │
--             └─< valoraciones >── items_carta ────┘
--
-- Cada usuario valora ÍTEMS de la carta (1 a 5 estrellas, una sola
-- valoración por usuario e ítem). La nota de un local es la sumatoria
-- de TODAS las valoraciones de todos sus ítems dividida por la
-- cantidad de valoraciones, por lo que nunca supera 5.
--
-- Para no recalcular en cada consulta, `rating_suma` y `rating_count`
-- se mantienen con triggers en items_carta y locales, y
-- `rating_promedio` es una columna generada a partir de ambas.

-- ============================================================
-- 1. profiles — perfil público de cada usuario de auth.users
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  nombre      text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. locales
-- ============================================================
create table if not exists public.locales (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  descripcion     text,
  direccion       text,
  comuna          text,
  tipo_cocina     text,
  imagen_url      text,
  latitud         numeric(9, 6),
  longitud        numeric(9, 6),
  owner_id        uuid references public.profiles (id) on delete set null,
  rating_suma     integer not null default 0,
  rating_count    integer not null default 0,
  rating_promedio numeric(3, 2) generated always as (
    case when rating_count = 0 then 0
         else round(rating_suma::numeric / rating_count, 2) end
  ) stored,
  created_at      timestamptz not null default now()
);

create index if not exists locales_rating_idx on public.locales (rating_promedio desc);

-- ============================================================
-- 3. categorias_carta — secciones de la carta (Entradas, Fondos…)
-- ============================================================
create table if not exists public.categorias_carta (
  id        uuid primary key default gen_random_uuid(),
  local_id  uuid not null references public.locales (id) on delete cascade,
  nombre    text not null,
  orden     integer not null default 0,
  unique (local_id, nombre)
);

-- ============================================================
-- 4. items_carta — cada plato/bebida de la carta de un local
-- ============================================================
create table if not exists public.items_carta (
  id              uuid primary key default gen_random_uuid(),
  local_id        uuid not null references public.locales (id) on delete cascade,
  categoria_id    uuid references public.categorias_carta (id) on delete set null,
  nombre          text not null,
  descripcion     text,
  precio          integer check (precio >= 0),   -- CLP, sin decimales
  imagen_url      text,
  disponible      boolean not null default true,
  rating_suma     integer not null default 0,
  rating_count    integer not null default 0,
  rating_promedio numeric(3, 2) generated always as (
    case when rating_count = 0 then 0
         else round(rating_suma::numeric / rating_count, 2) end
  ) stored,
  created_at      timestamptz not null default now()
);

create index if not exists items_carta_local_idx on public.items_carta (local_id);

-- ============================================================
-- 5. valoraciones — 1 a 5 estrellas por usuario e ítem
-- ============================================================
create table if not exists public.valoraciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  item_id     uuid not null references public.items_carta (id) on delete cascade,
  puntuacion  smallint not null check (puntuacion between 1 and 5),
  comentario  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists valoraciones_item_idx on public.valoraciones (item_id);

-- ============================================================
-- 6. favoritos — locales favoritos de cada usuario
-- ============================================================
create table if not exists public.favoritos (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  local_id    uuid not null references public.locales (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, local_id)
);

-- ============================================================
-- 7. Triggers de rating
-- ============================================================

-- Suma/resta una valoración al ítem y a su local.
create or replace function public.aplicar_valoracion(p_item uuid, p_puntos integer, p_cantidad integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_local uuid;
begin
  update public.items_carta
     set rating_suma  = rating_suma + p_puntos,
         rating_count = rating_count + p_cantidad
   where id = p_item
  returning local_id into v_local;

  -- Si el ítem ya no existe (borrado en cascada) no hay nada que ajustar:
  -- el trigger de items_carta ya descontó sus valoraciones del local.
  if v_local is not null then
    update public.locales
       set rating_suma  = rating_suma + p_puntos,
           rating_count = rating_count + p_cantidad
     where id = v_local;
  end if;
end;
$$;

create or replace function public.valoraciones_sync_rating()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.aplicar_valoracion(old.item_id, -old.puntuacion, -1);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.aplicar_valoracion(new.item_id, new.puntuacion, 1);
  end if;
  return null;
end;
$$;

drop trigger if exists valoraciones_sync_rating on public.valoraciones;
create trigger valoraciones_sync_rating
  after insert or update of puntuacion, item_id or delete on public.valoraciones
  for each row execute function public.valoraciones_sync_rating();

-- Al borrar un ítem, descuenta sus valoraciones del local antes de
-- que se borren en cascada.
create or replace function public.items_carta_before_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.locales
     set rating_suma  = rating_suma - old.rating_suma,
         rating_count = rating_count - old.rating_count
   where id = old.local_id;
  return old;
end;
$$;

drop trigger if exists items_carta_before_delete on public.items_carta;
create trigger items_carta_before_delete
  before delete on public.items_carta
  for each row execute function public.items_carta_before_delete();

-- Los clientes no pueden escribir los contadores de rating: si el insert/
-- update viene directo de la app (rol anon/authenticated) se ignoran los
-- valores enviados. Las funciones security definer de arriba corren como
-- el dueño del esquema, así que sí pueden modificarlos.
create or replace function public.proteger_rating()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.rating_suma  := 0;
      new.rating_count := 0;
    else
      new.rating_suma  := old.rating_suma;
      new.rating_count := old.rating_count;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists locales_proteger_rating on public.locales;
create trigger locales_proteger_rating
  before insert or update on public.locales
  for each row execute function public.proteger_rating();

drop trigger if exists items_carta_proteger_rating on public.items_carta;
create trigger items_carta_proteger_rating
  before insert or update on public.items_carta
  for each row execute function public.proteger_rating();

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists valoraciones_updated_at on public.valoraciones;
create trigger valoraciones_updated_at
  before update on public.valoraciones
  for each row execute function public.set_updated_at();

-- Recalcula desde cero los contadores (mantenimiento / tras cargas masivas).
create or replace function public.recalcular_ratings()
returns void
language sql
security definer set search_path = ''
as $$
  update public.items_carta i
     set rating_suma  = coalesce(v.suma, 0),
         rating_count = coalesce(v.cantidad, 0)
    from (select it.id, sum(va.puntuacion) as suma, count(va.id) as cantidad
            from public.items_carta it
            left join public.valoraciones va on va.item_id = it.id
           group by it.id) v
   where v.id = i.id;

  update public.locales l
     set rating_suma  = coalesce(v.suma, 0),
         rating_count = coalesce(v.cantidad, 0)
    from (select lo.id, sum(it.rating_suma) as suma, sum(it.rating_count) as cantidad
            from public.locales lo
            left join public.items_carta it on it.local_id = lo.id
           group by lo.id) v
   where v.id = l.id;
$$;

-- Solo el SQL Editor / service_role debería poder recalcular.
revoke execute on function public.recalcular_ratings() from public, anon, authenticated;
revoke execute on function public.aplicar_valoracion(uuid, integer, integer) from public, anon, authenticated;

-- ============================================================
-- 8. Row Level Security
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.locales           enable row level security;
alter table public.categorias_carta  enable row level security;
alter table public.items_carta       enable row level security;
alter table public.valoraciones      enable row level security;
alter table public.favoritos         enable row level security;

-- profiles: lectura pública, cada uno edita el suyo.
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select to anon, authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- locales: lectura pública, el dueño administra el suyo.
drop policy if exists "locales_public_read" on public.locales;
create policy "locales_public_read" on public.locales
  for select to anon, authenticated using (true);
drop policy if exists "locales_owner_insert" on public.locales;
create policy "locales_owner_insert" on public.locales
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "locales_owner_update" on public.locales;
create policy "locales_owner_update" on public.locales
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "locales_owner_delete" on public.locales;
create policy "locales_owner_delete" on public.locales
  for delete to authenticated using (owner_id = (select auth.uid()));

-- categorias_carta / items_carta: lectura pública, escribe el dueño del local.
drop policy if exists "categorias_public_read" on public.categorias_carta;
create policy "categorias_public_read" on public.categorias_carta
  for select to anon, authenticated using (true);
drop policy if exists "categorias_owner_write" on public.categorias_carta;
create policy "categorias_owner_write" on public.categorias_carta
  for all to authenticated
  using (exists (select 1 from public.locales l
                  where l.id = local_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.locales l
                       where l.id = local_id and l.owner_id = (select auth.uid())));

drop policy if exists "items_public_read" on public.items_carta;
create policy "items_public_read" on public.items_carta
  for select to anon, authenticated using (true);
drop policy if exists "items_owner_write" on public.items_carta;
create policy "items_owner_write" on public.items_carta
  for all to authenticated
  using (exists (select 1 from public.locales l
                  where l.id = local_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.locales l
                       where l.id = local_id and l.owner_id = (select auth.uid())));

-- valoraciones: lectura pública (reseñas), cada uno gestiona las suyas.
drop policy if exists "valoraciones_public_read" on public.valoraciones;
create policy "valoraciones_public_read" on public.valoraciones
  for select to anon, authenticated using (true);
drop policy if exists "valoraciones_insert_own" on public.valoraciones;
create policy "valoraciones_insert_own" on public.valoraciones
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "valoraciones_update_own" on public.valoraciones;
create policy "valoraciones_update_own" on public.valoraciones
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "valoraciones_delete_own" on public.valoraciones;
create policy "valoraciones_delete_own" on public.valoraciones
  for delete to authenticated using (user_id = (select auth.uid()));

-- favoritos: privados, solo el propio usuario los ve y gestiona.
drop policy if exists "favoritos_select_own" on public.favoritos;
create policy "favoritos_select_own" on public.favoritos
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "favoritos_insert_own" on public.favoritos;
create policy "favoritos_insert_own" on public.favoritos
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "favoritos_delete_own" on public.favoritos;
create policy "favoritos_delete_own" on public.favoritos
  for delete to authenticated using (user_id = (select auth.uid()));
