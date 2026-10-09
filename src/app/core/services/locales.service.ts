import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Local, LocalDetalle } from '../models/recomiendo.model';
import { LOCALES } from '../data/locales.data';

@Injectable({ providedIn: 'root' })
export class LocalesService {
  private readonly supabase = inject(SupabaseService);

  /** Locales ordenados por nota (promedio de todas las valoraciones de su carta). */
  async getLocales(): Promise<Local[]> {
    const fallback = [...LOCALES].sort((a, b) => b.rating_promedio - a.rating_promedio);
    if (!this.supabase.client) {
      return fallback;
    }

    const { data, error } = await this.supabase.client
      .from('locales')
      .select('*')
      .order('rating_promedio', { ascending: false })
      .order('rating_count', { ascending: false });

    if (error || !data || data.length === 0) {
      return fallback;
    }

    return data as Local[];
  }

  async getLocal(id: string): Promise<LocalDetalle | null> {
    const fallback = LOCALES.find((l) => l.id === id) ?? null;
    if (!this.supabase.client) {
      return fallback;
    }

    const { data, error } = await this.supabase.client
      .from('locales')
      .select('*, categorias_carta(*), items_carta(*)')
      .eq('id', id)
      .order('orden', { referencedTable: 'categorias_carta' })
      .order('nombre', { referencedTable: 'items_carta' })
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    return data as LocalDetalle;
  }
}
