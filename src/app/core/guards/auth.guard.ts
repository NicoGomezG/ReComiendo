import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/** Espera a que Supabase restaure la sesión antes de decidir (no depende del signal de AuthService). */
export const authGuard: CanActivateFn = async () => {
  const client = inject(SupabaseService).client;
  const router = inject(Router);
  if (!client) return router.parseUrl('/ingresar');

  const { data } = await client.auth.getSession();
  return data.session ? true : router.parseUrl('/ingresar');
};
