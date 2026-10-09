import { Component, computed, input, output, signal } from '@angular/core';

/**
 * Estrellas de 0 a 5. En modo lectura muestra fracciones (ej. 4.67);
 * con `editable` permite elegir de 1 a 5 y emite `rated`.
 */
@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
})
export class StarRating {
  readonly value = input(0);
  readonly editable = input(false);
  readonly size = input<'sm' | 'md'>('md');
  readonly rated = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hover = signal<number | null>(null);
  protected readonly shown = computed(() => this.hover() ?? this.value());

  /** Porcentaje de relleno de la estrella n (1..5). */
  protected fill(n: number): number {
    return Math.max(0, Math.min(1, this.shown() - (n - 1))) * 100;
  }

  protected select(n: number): void {
    if (this.editable()) this.rated.emit(n);
  }
}
