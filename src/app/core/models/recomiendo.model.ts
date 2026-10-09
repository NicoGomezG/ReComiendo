// Los nombres de campo replican las columnas de supabase/schema.sql (snake_case)
// para poder tipar directamente lo que devuelve supabase-js.

export interface Profile {
  id: string;
  username: string | null;
  nombre: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ConRating {
  rating_suma: number;
  rating_count: number;
  /** Sumatoria de valoraciones / cantidad de valoraciones (0 a 5). */
  rating_promedio: number;
}

export interface Local extends ConRating {
  id: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  comuna: string | null;
  tipo_cocina: string | null;
  imagen_url: string | null;
}

export interface CategoriaCarta {
  id: string;
  local_id: string;
  nombre: string;
  orden: number;
}

export interface ItemCarta extends ConRating {
  id: string;
  local_id: string;
  categoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  imagen_url: string | null;
  disponible: boolean;
}

export interface Valoracion {
  id: string;
  user_id: string;
  item_id: string;
  puntuacion: number;
  comentario: string | null;
  created_at: string;
}

/** Local con su carta completa, como la arma `LocalesService.getLocal`. */
export interface LocalDetalle extends Local {
  categorias_carta: CategoriaCarta[];
  items_carta: ItemCarta[];
}

/** Valoración propia junto al ítem y local al que pertenece (página de perfil). */
export interface MiValoracion extends Valoracion {
  items_carta: Pick<ItemCarta, 'id' | 'nombre'> & { locales: Pick<Local, 'id' | 'nombre'> };
}
