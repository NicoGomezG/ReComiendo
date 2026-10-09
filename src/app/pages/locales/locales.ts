import { Component, computed, inject, signal } from '@angular/core';
import { LocalesService } from '../../core/services/locales.service';
import { Local } from '../../core/models/recomiendo.model';
import { LocalCard } from '../../shared/local-card/local-card';

@Component({
  selector: 'app-locales',
  imports: [LocalCard],
  templateUrl: './locales.html',
})
export class Locales {
  private readonly localesService = inject(LocalesService);

  protected readonly locales = signal<Local[]>([]);
  protected readonly loading = signal(true);
  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.locales();
    return this.locales().filter((l) =>
      [l.nombre, l.comuna, l.tipo_cocina].some((v) => v?.toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.localesService.getLocales().then((locales) => {
      this.locales.set(locales);
      this.loading.set(false);
    });
  }
}
