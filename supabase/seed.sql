-- ReComiendo — datos de ejemplo (opcional)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de schema.sql.
-- Los mismos datos están en src/app/core/data/locales.data.ts como
-- fallback cuando Supabase no está configurado.

insert into public.locales (id, nombre, descripcion, direccion, comuna, tipo_cocina) values
  ('11111111-1111-1111-1111-111111111111', 'La Picá del Puerto',
   'Mariscos y pescados frescos con vista al mar.', 'Av. Altamirano 1480', 'Valparaíso', 'Mariscos'),
  ('22222222-2222-2222-2222-222222222222', 'Sanguchería Don Lucho',
   'Sánguches contundentes al estilo chileno.', 'Av. Italia 1220', 'Providencia', 'Sánguches')
on conflict (id) do nothing;

insert into public.categorias_carta (id, local_id, nombre, orden) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Entradas', 1),
  ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Fondos', 2),
  ('a2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Sánguches', 1),
  ('a2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Bebidas', 2)
on conflict (id) do nothing;

insert into public.items_carta (id, local_id, categoria_id, nombre, descripcion, precio) values
  ('b1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'a1111111-0000-0000-0000-000000000001', 'Ceviche mixto', 'Reineta, camarón y pulpo.', 8900),
  ('b1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'a1111111-0000-0000-0000-000000000001', 'Machas a la parmesana', '12 unidades.', 9500),
  ('b1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'a1111111-0000-0000-0000-000000000002', 'Caldillo de congrio', 'Receta de la casa.', 11900),
  ('b2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'a2222222-0000-0000-0000-000000000001', 'Chacarero', 'Lomo, porotos verdes, tomate y ají verde.', 7900),
  ('b2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'a2222222-0000-0000-0000-000000000001', 'Barros Luco', 'Lomo y queso fundido.', 7500),
  ('b2222222-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
   'a2222222-0000-0000-0000-000000000002', 'Jugo natural', 'Frambuesa, mango o piña.', 2900)
on conflict (id) do nothing;
