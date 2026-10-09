import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { ValoracionesService } from '../../core/services/valoraciones.service';
import { Local, MiValoracion } from '../../core/models/recomiendo.model';
import { LocalCard } from '../../shared/local-card/local-card';
import { StarRating } from '../../shared/star-rating/star-rating';

@Component({
  selector: 'app-perfil',
  imports: [RouterLink, DatePipe, LocalCard, StarRating],
  templateUrl: './perfil.html',
})
export class Perfil {
  protected readonly auth = inject(AuthService);
  private readonly favoritosService = inject(FavoritosService);
  private readonly valoracionesService = inject(ValoracionesService);
  private readonly router = inject(Router);

  protected readonly favoritos = signal<Local[]>([]);
  protected readonly valoraciones = signal<MiValoracion[]>([]);
  protected readonly editando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.auth.userId()) return;
      this.favoritosService.getFavoritos().then((f) => this.favoritos.set(f));
      this.valoracionesService.getMisValoraciones().then((v) => this.valoraciones.set(v));
    });
  }

  protected async guardar(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    const texto = (key: string) => String(form.get(key) ?? '').trim() || null;

    const error = await this.auth.updateProfile({
      nombre: texto('nombre'),
      username: texto('username')?.toLowerCase() ?? null,
      bio: texto('bio'),
    });
    this.error.set(error);
    if (!error) this.editando.set(false);
  }

  protected async salir(): Promise<void> {
    await this.auth.signOut();
    this.router.navigateByUrl('/');
  }
}
