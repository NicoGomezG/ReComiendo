# ReComiendo
Hecho por mi para el mundo

App de recomendación de locales **a nivel de cada ítem de la carta**: los usuarios
valoran platos (1 a 5 ★) y la nota de cada local es el promedio de todas las
valoraciones de su carta. Cada usuario tiene su perfil y sus locales favoritos.

Angular 21 (standalone, signals, `@if`/`@for`) + Tailwind CSS 4 + Supabase.
Misma base que el proyecto `Home`.

## Correr en local

```bash
npm install
ng serve        # http://localhost:4200
ng build        # -> dist/recomiendo
ng test --watch=false
```

Sin Supabase configurado la app muestra los locales de ejemplo de
`src/app/core/data/locales.data.ts` (solo lectura, sin login).

## Base de datos (Supabase)

1. Supabase → **SQL Editor** → pega y corre `supabase/schema.sql`.
2. (Opcional) corre `supabase/seed.sql` para cargar locales de ejemplo.
3. Copia la URL y la `anon key` del proyecto en `src/environments/environment.ts`
   y `environment.development.ts`. La anon key es pública por diseño; la
   seguridad la dan las policies de RLS.

### Tablas

| Tabla              | Qué guarda                                                     |
| ------------------ | -------------------------------------------------------------- |
| `profiles`         | Perfil de cada usuario (se crea solo al registrarse)           |
| `locales`          | Locales + `rating_suma`, `rating_count`, `rating_promedio`     |
| `categorias_carta` | Secciones de la carta (Entradas, Fondos…)                      |
| `items_carta`      | Cada plato/bebida + su propio rating                           |
| `valoraciones`     | 1 a 5 ★ por usuario e ítem (una por par, se puede editar)      |
| `favoritos`        | Locales favoritos de cada usuario (privados)                   |

### Cómo se calcula la nota

```
nota ítem  = Σ valoraciones del ítem / nº de valoraciones del ítem
nota local = Σ valoraciones de TODOS sus ítems / nº total de esas valoraciones
```

Ambas quedan entre 0 y 5. Los contadores se mantienen con triggers al crear,
editar o borrar una valoración (y al borrar un ítem), así que ordenar locales por
nota es una consulta simple. La app no puede escribir esos contadores
directamente (`proteger_rating`). Si alguna vez se desincronizan, corre
`select public.recalcular_ratings();` en el SQL Editor.

### Permisos (RLS)

- Locales, carta y valoraciones: lectura pública.
- Cada usuario crea/edita/borra solo sus valoraciones, favoritos y perfil.
- Locales y su carta los administra el usuario en `locales.owner_id`
  (aún no hay UI de administración: se cargan desde el SQL Editor o el dashboard).
