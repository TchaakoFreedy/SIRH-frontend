// src/app/features/auth/login/components/two-factor-login/two-factor-login.component.ts

import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';
import { finalize, catchError, takeUntil } from 'rxjs/operators';
import { Subject, throwError } from 'rxjs';

@Component({
  selector: 'app-two-factor-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './two-factor-login.component.html',
  styleUrls: ['./two-factor-login.component.scss']
})
export class TwoFactorLoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  isVerifying = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  userEmail = signal<string>('');
  userId = signal<string>('');

  twoFactorForm!: FormGroup;

  ngOnInit(): void {
    const session = this.authService.getTwoFactorSession();
    if (!session) {
      console.warn('❌ Aucune session 2FA trouvée, redirection vers login');
      this.router.navigate(['/login']);
      return;
    }

    this.userEmail.set(session.email || '');
    this.userId.set(session.userId || '');
    console.log('🔐 Session 2FA chargée pour:', this.userEmail());
    console.log('🔐 User ID:', this.userId());

    this.twoFactorForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verifyTwoFactor(): void {
    if (this.twoFactorForm.invalid) {
      this.errorMessage.set('Veuillez entrer un code à 6 chiffres valide.');
      return;
    }

    this.errorMessage.set(null);
    this.isVerifying.set(true);

    const userId = this.userId();
    const otpCode = Number(this.twoFactorForm.value.otpCode);

    console.log('🔐 Vérification 2FA pour userId:', userId, 'code:', otpCode);

    // ✅ USE AUTH SERVICE METHOD instead of direct HTTP
    this.authService.verifyTwoFactor(userId, otpCode).pipe(
      finalize(() => {
        this.isVerifying.set(false);
        console.log('✅ Vérification 2FA terminée');
      }),
      catchError((error) => {
        console.error('❌ Erreur vérification 2FA:', error);
        
        let errorMsg = 'Erreur lors de la vérification. Veuillez réessayer.';
        if (error.status === 400) {
          errorMsg = error.error?.message || 'Code invalide. Veuillez réessayer.';
        } else if (error.status === 404) {
          errorMsg = 'Utilisateur non trouvé. Veuillez vous reconnecter.';
        } else if (error.status === 500) {
          errorMsg = 'Erreur serveur. Veuillez réessayer plus tard.';
        }
        
        this.errorMessage.set(errorMsg);
        this.twoFactorForm.reset();
        return throwError(() => error);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('📥 Réponse 2FA reçue:', response);
        
        // ✅ Check if 2FA was successful
        if (response.success && response.accessToken) {
          console.log('✅ 2FA validé avec succès !');
          
          // ✅ AuthService.handleSuccessfulLogin already handles storage
          // Double-check token was stored
          const token = this.authService.getToken();
          console.log('🔑 Token stored in AuthService:', token ? 'YES' : 'NO');
          if (token) {
            console.log('🔑 Token preview:', token.substring(0, 30) + '...');
          }
          
          // ✅ Clear 2FA session
          this.authService.clearTwoFactorSession();
          
          // ✅ Navigate to dashboard
          this.router.navigateByUrl('/app/dashboard').then(
            success => {
              if (!success) {
                console.warn('⚠️ Navigation failed, using window.location');
                window.location.href = '/app/dashboard';
              }
            },
            () => {
              console.warn('⚠️ Navigation error, using window.location');
              window.location.href = '/app/dashboard';
            }
          );
          
        } else {
          const errorMsg = response.message || response.error || 'Code invalide. Veuillez réessayer.';
          console.error('❌ Échec 2FA:', errorMsg);
          this.errorMessage.set(errorMsg);
          this.twoFactorForm.reset();
        }
      },
      error: (error) => {
        console.error('❌ Erreur non gérée dans subscribe:', error);
        this.errorMessage.set('Une erreur inattendue est survenue. Veuillez réessayer.');
        this.twoFactorForm.reset();
      }
    });
  }

  cancel(): void {
    this.authService.clearTwoFactorSession();
    this.router.navigate(['/login']);
  }
}