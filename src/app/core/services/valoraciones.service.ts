import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { MiValoracion, Valoracion } from '../models/recomiendo.model';

@Injectable({ providedIn: 'root' })
export class ValoracionesService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** Valoraciones del usuario actual para los ítems de un local, indexadas por item_id. */
  async getMisValoracionesDeLocal(localId: string): Promise<Map<string, Valoracion>> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return new Map();

    const { data } = await this.supabase.client
      .from('valoraciones')
      .select('*, items_carta!inner(local_id)')
      .eq('user_id', userId)
      .eq('items_carta.local_id', localId);

    return new Map(((data ?? []) as Valoracion[]).map((v) => [v.item_id, v]));
  }

  async getMisValoraciones(): Promise<MiValoracion[]> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return [];

    const { data } = await this.supabase.client
      .from('valoraciones')
      .select('*, items_carta(id, nombre, locales(id, nombre))')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    return (data ?? []) as MiValoracion[];
  }

  /**
   * Crea o actualiza la valoración del usuario para un ítem (una por usuario e ítem).
   * Los triggers de la base recalculan el rating del ítem y del local.
   */
  async valorar(itemId: string, puntuacion: number, comentario: string | null = null): Promise<string | null> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return 'Debes iniciar sesión para valorar.';

    const { error } = await this.supabase.client
      .from('valoraciones')
      .upsert(
        { user_id: userId, item_id: itemId, puntuacion, comentario },
        { onConflict: 'user_id,item_id' },
      );
    return error?.message ?? null;
  }

  async eliminar(itemId: string): Promise<string | null> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return 'Debes iniciar sesión.';

    const { error } = await this.supabase.client
      .from('valoraciones')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId);
    return error?.message ?? null;
  }
}
