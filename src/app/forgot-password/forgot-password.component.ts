// forgot-password.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {

  form!: FormGroup;
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.authService.forgotPassword(this.form.value.email)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Un code de réinitialisation a été envoyé à votre adresse email.');
          
          // Navigate to reset password page after a short delay
          setTimeout(() => {
            this.router.navigate(['/reset-password'], {
              queryParams: { email: this.form.value.email }
            });
          }, 2000);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
        }
      });
  }
}