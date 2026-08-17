// src/app/features/auth/login/login.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/app/dashboard']);
    }

    // Pre-fill email for development
    this.loginForm.patchValue({
      email: 'rh@system.com',
      password: 'password123'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response: LoginResponse) => {
          console.log('🔄 Login response received:', response);
          
          // ✅ CHECK: If 2FA is required
          if (response.requiresTwoFactor || response.requires_2fa) {
            console.log('🔐 2FA required, redirecting to 2FA page');
            // Store userId and email for 2FA
            const userId = response.userId || response.user?.id || response.user?._id;
            const userEmail = response.email || response.user?.email || email;
            
            if (userId) {
              this.authService.setTwoFactorSession(userId, userEmail);
            } else {
              console.error('❌ No userId provided for 2FA flow');
              this.errorMessage = 'Erreur lors de la configuration 2FA';
              return;
            }
            
            // Navigate to 2FA page
            this.router.navigate(['/login/two-factor']);
            return;
          }
          
          // ✅ CHECK: If login failed (success: false)
          if (response.success === false) {
            console.error('❌ Login failed:', response.message);
            this.errorMessage = response.message || 'Email ou mot de passe incorrect';
            return;
          }
          
          // ✅ CHECK: If token is present (successful login)
          if (response.accessToken) {
            console.log('✅ Login successful, redirecting to dashboard');
            this.router.navigate(['/app/dashboard']);
          } else {
            console.error('❌ No token and no 2FA requirement');
            this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
          }
        },
        error: (error) => {
          console.error('❌ Login error:', error);
          
          // Handle specific error messages
          if (error.status === 401) {
            this.errorMessage = 'Email ou mot de passe incorrect';
          } else if (error.status === 403) {
            this.errorMessage = 'Compte désactivé ou accès refusé';
          } else if (error.status === 0) {
            this.errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
          } else if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
          }
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}