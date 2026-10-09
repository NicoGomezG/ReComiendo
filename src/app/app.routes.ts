import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/locales/locales').then((m) => m.Locales),
    title: 'ReComiendo — Locales',
  },
  {
    path: 'locales/:id',
    loadComponent: () =>
      import('./pages/local-detalle/local-detalle').then((m) => m.LocalDetalleComponent),
    title: 'Carta — ReComiendo',
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
    title: 'Mi perfil — ReComiendo',
  },
  {
    path: 'ingresar',
    loadComponent: () => import('./pages/ingresar/ingresar').then((m) => m.Ingresar),
    title: 'Ingresar — ReComiendo',
  },
  { path: '**', redirectTo: '' },
];
