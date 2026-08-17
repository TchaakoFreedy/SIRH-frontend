// src/app/login/login.component.ts

import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginResponse } from '../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  is2FARequired = signal(false);
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.is2FARequired.set(false);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const { email, password } = this.loginForm.value;

    console.log('🔐 Attempting login with:', { email, password: '***' });

    this.authService.login(email, password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: LoginResponse) => {
          this.isLoading.set(false);
          
          console.log('🔄 Full login response:', JSON.stringify(response, null, 2));
          
          // ✅ IMPORTANT: Check 2FA requirements FIRST
          // The backend uses 'twoFactorRequired' when 2FA is needed
          if (response.twoFactorRequired === true || 
              response.requiresTwoFactor === true || 
              response.requires_2fa === true) {
            
            console.log('🔐 2FA required for user:', email);
            this.is2FARequired.set(true);
            
            // Get userId from response
            const userId = response.userId || response.user?.id || response.user?._id;
            const userEmail = response.email || response.user?.email || email;
            
            if (userId) {
              // Store session for 2FA
              this.authService.setTwoFactorSession(userId, userEmail);
              
              // Show the 2FA message briefly before redirect
              setTimeout(() => {
                this.router.navigate(['/login/two-factor']);
              }, 500);
            } else {
              console.error('❌ No userId provided for 2FA flow');
              this.errorMessage.set('Erreur lors de la configuration 2FA');
            }
            return; // ✅ IMPORTANT: Stop execution here
          }
          
          // ✅ Check if login failed (incorrect password, user not found, etc.)
          if (response.success === false) {
            console.error('❌ Login failed:', response.message);
            
            const errorMsg = response.message || 
                           response.error || 
                           'Email ou mot de passe incorrect';
            
            this.errorMessage.set(errorMsg);
            return;
          }
          
          // ✅ Check if token is present (successful login)
          if (response.accessToken) {
            console.log('✅ Login successful, redirecting to dashboard');
            this.router.navigate(['/app/dashboard']);
          } else {
            console.error('❌ No token and no 2FA requirement');
            this.errorMessage.set('Erreur de connexion. Veuillez réessayer.');
          }
        },
        error: (err: any) => {
          this.isLoading.set(false);
          console.error('❌ Login error:', err);
          
          if (err.status === 401) {
            this.errorMessage.set('Email ou mot de passe incorrect');
          } else if (err.status === 403) {
            this.errorMessage.set('Compte désactivé ou accès refusé');
          } else if (err.status === 0) {
            this.errorMessage.set('Impossible de contacter le serveur. Vérifiez votre connexion.');
          } else if (err.error?.message) {
            this.errorMessage.set(err.error.message);
          } else {
            this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
          }
        }
      });
  }
}