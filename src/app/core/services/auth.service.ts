import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile } from '../models/recomiendo.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly userId = computed(() => this.session()?.user.id ?? null);
  readonly isLoggedIn = computed(() => this.userId() !== null);

  constructor() {
    const client = this.supabase.client;
    if (!client) return;

    client.auth.getSession().then(({ data }) => this.setSession(data.session));
    client.auth.onAuthStateChange((_event, session) => this.setSession(session));
  }

  async signIn(email: string, password: string): Promise<string | null> {
    if (!this.supabase.client) return 'Supabase no está configurado.';
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  /** `nombre` llega a profiles vía el trigger handle_new_user (raw_user_meta_data). */
  async signUp(email: string, password: string, nombre: string): Promise<string | null> {
    if (!this.supabase.client) return 'Supabase no está configurado.';
    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    return error?.message ?? null;
  }

  async signOut(): Promise<void> {
    await this.supabase.client?.auth.signOut();
  }

  async updateProfile(changes: Partial<Omit<Profile, 'id'>>): Promise<string | null> {
    const id = this.userId();
    if (!this.supabase.client || !id) return 'Debes iniciar sesión.';

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) return error.message;
    this.profile.set(data as Profile);
    return null;
  }

  private async setSession(session: Session | null): Promise<void> {
    this.session.set(session);
    if (!session || !this.supabase.client) {
      this.profile.set(null);
      return;
    }

    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    this.profile.set((data as Profile | null) ?? null);
  }
}
