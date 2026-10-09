import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Local } from '../models/recomiendo.model';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async getFavoritos(): Promise<Local[]> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return [];

    const { data } = await this.supabase.client
      .from('favoritos')
      .select('locales(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return ((data ?? []) as unknown as { locales: Local }[]).map((f) => f.locales);
  }

  async esFavorito(localId: string): Promise<boolean> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return false;

    const { count } = await this.supabase.client
      .from('favoritos')
      .select('local_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('local_id', localId);
    return (count ?? 0) > 0;
  }

  async setFavorito(localId: string, favorito: boolean): Promise<string | null> {
    const userId = this.auth.userId();
    if (!this.supabase.client || !userId) return 'Debes iniciar sesión.';

    const { error } = favorito
      ? await this.supabase.client.from('favoritos').insert({ user_id: userId, local_id: localId })
      : await this.supabase.client
          .from('favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('local_id', localId);
    return error?.message ?? null;
  }
}
