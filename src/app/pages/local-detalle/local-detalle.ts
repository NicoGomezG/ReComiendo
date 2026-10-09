import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalesService } from '../../core/services/locales.service';
import { ValoracionesService } from '../../core/services/valoraciones.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { AuthService } from '../../core/services/auth.service';
import { ItemCarta, LocalDetalle, Valoracion } from '../../core/models/recomiendo.model';
import { StarRating } from '../../shared/star-rating/star-rating';

interface SeccionCarta {
  nombre: string;
  items: ItemCarta[];
}

@Component({
  selector: 'app-local-detalle',
  imports: [RouterLink, DecimalPipe, StarRating],
  templateUrl: './local-detalle.html',
})
export class LocalDetalleComponent {
  private readonly localesService = inject(LocalesService);
  private readonly valoracionesService = inject(ValoracionesService);
  private readonly favoritosService = inject(FavoritosService);
  protected readonly auth = inject(AuthService);

  /** Parámetro `:id` de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly local = signal<LocalDetalle | null>(null);
  protected readonly loading = signal(true);
  protected readonly misValoraciones = signal(new Map<string, Valoracion>());
  protected readonly favorito = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Carta agrupada por categoría, respetando `orden`; ítems sin categoría al final. */
  protected readonly secciones = computed<SeccionCarta[]>(() => {
    const local = this.local();
    if (!local) return [];

    const secciones = [...local.categorias_carta]
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({
        nombre: c.nombre,
        items: local.items_carta.filter((i) => i.categoria_id === c.id),
      }));

    const sinCategoria = local.items_carta.filter(
      (i) => !local.categorias_carta.some((c) => c.id === i.categoria_id),
    );
    if (sinCategoria.length) secciones.push({ nombre: 'Otros', items: sinCategoria });

    return secciones.filter((s) => s.items.length > 0);
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.loading.set(true);
      this.localesService.getLocal(id).then((local) => {
        this.local.set(local);
        this.loading.set(false);
      });
    });

    // Se recarga al iniciar/cerrar sesión.
    effect(() => {
      const id = this.id();
      if (!this.auth.userId()) {
        this.misValoraciones.set(new Map());
        this.favorito.set(false);
        return;
      }
      this.valoracionesService.getMisValoracionesDeLocal(id).then((m) => this.misValoraciones.set(m));
      this.favoritosService.esFavorito(id).then((f) => this.favorito.set(f));
    });
  }

  protected async valorar(item: ItemCarta, puntuacion: number): Promise<void> {
    this.error.set(null);
    const error = await this.valoracionesService.valorar(item.id, puntuacion);
    if (error) {
      this.error.set(error);
      return;
    }
    // Los triggers ya recalcularon el rating del ítem y del local: refrescamos ambos.
    const [local, mias] = await Promise.all([
      this.localesService.getLocal(this.id()),
      this.valoracionesService.getMisValoracionesDeLocal(this.id()),
    ]);
    this.local.set(local);
    this.misValoraciones.set(mias);
  }

  protected async toggleFavorito(): Promise<void> {
    const nuevo = !this.favorito();
    const error = await this.favoritosService.setFavorito(this.id(), nuevo);
    if (error) {
      this.error.set(error);
      return;
    }
    this.favorito.set(nuevo);
  }
}
