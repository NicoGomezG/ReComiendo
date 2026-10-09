import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-ingresar',
  templateUrl: './ingresar.html',
})
export class Ingresar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly supabaseConfigurado = inject(SupabaseService).isConfigured;

  protected readonly modo = signal<'ingresar' | 'registro'>('ingresar');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);

  protected async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    this.enviando.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    if (this.modo() === 'ingresar') {
      const error = await this.auth.signIn(email, password);
      this.enviando.set(false);
      if (error) {
        this.error.set(error);
        return;
      }
      this.router.navigateByUrl('/perfil');
    } else {
      const error = await this.auth.signUp(email, password, String(form.get('nombre') ?? ''));
      this.enviando.set(false);
      if (error) {
        this.error.set(error);
        return;
      }
      this.mensaje.set('Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.');
      this.modo.set('ingresar');
    }
  }
}
