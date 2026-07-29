// reset-password.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidationErrors, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // RouterLink is now imported
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  form!: FormGroup; // Added definite assignment assertion
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email') || '';

    this.form = this.fb.group({
      email: [email, [Validators.required, Validators.email]],
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    return password.value === confirmPassword.value ? null : { mismatch: true };
  }

  submit() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const { email, code, password } = this.form.value;

    this.loading.set(true);
    this.error.set('');

    this.authService.resetPassword(email, code, password)
      .subscribe({
        next: () => {
          this.loading.set(false);
          // Show success message before redirect
          this.error.set(''); // Clear any error
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { reset: 'success' } 
            });
          }, 1500);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.message || 'Code invalide ou expiré. Veuillez réessayer.');
        }
      });
  }
}