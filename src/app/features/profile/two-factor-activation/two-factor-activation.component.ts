import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TwoFactorAuthService } from '../../../core/services/two-factor-auth.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-two-factor-activation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './two-factor-activation.component.html',
  styleUrls: ['./two-factor-activation.component.scss']
})
export class TwoFactorActivationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux
  pendingInfo = signal<{ secret: string; qrCodeUrl: string; backupCodes: string[] } | null>(null);
  otpCode = signal<string>('');
  errorMessage = signal<string>('');
  isActivating = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isTwoFactorEnabled = signal<boolean>(false);
  activationSuccess = signal<boolean>(false);

  constructor(
    private twoFactorAuthService: TwoFactorAuthService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkPending();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkPending(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id;

    if (!userId) {
      this.isLoading.set(false);
      this.errorMessage.set('Utilisateur non identifié. Veuillez vous reconnecter.');
      return;
    }

    this.twoFactorAuthService.getPendingTwoFactor(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.pendingInfo.set(info);
          this.isLoading.set(false);

          // Vérifier le statut 2FA (optionnel)
          this.twoFactorAuthService.getTwoFactorStatus(userId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (enabled) => {
                this.isTwoFactorEnabled.set(enabled);
                if (enabled) {
                  this.pendingInfo.set(null);
                  this.authService.clearTwoFactorPending();
                  this.router.navigate(['/app/dashboard']);
                }
              },
              error: () => {
                // Ne pas bloquer l'interface
              }
            });
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.error?.error?.includes('Aucun secret')) {
            this.pendingInfo.set(null);
            this.authService.clearTwoFactorPending();
            this.router.navigate(['/app/dashboard']);
          } else {
            this.errorMessage.set(err.error?.error || 'Erreur lors du chargement des informations 2FA');
          }
        }
      });
  }

  activate(): void {
    const code = this.otpCode();
    if (!code || code.length !== 6) {
      this.errorMessage.set('Veuillez entrer un code à 6 chiffres.');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id;

    if (!userId) {
      this.errorMessage.set('Utilisateur non identifié. Veuillez vous reconnecter.');
      return;
    }

    this.isActivating.set(true);
    this.errorMessage.set('');

    this.twoFactorAuthService.verifyAndEnableTwoFactor(userId, parseInt(code, 10))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isActivating.set(false);
          this.activationSuccess.set(true);
          this.pendingInfo.set(null);
          this.isTwoFactorEnabled.set(true);
          this.authService.clearTwoFactorPending();
          setTimeout(() => {
            this.router.navigate(['/app/dashboard']);
          }, 1500);
        },
        error: (err) => {
          this.isActivating.set(false);
          this.errorMessage.set(err.error?.error || 'Code invalide, veuillez réessayer.');
        }
      });
  }

  onlyNumbers(event: KeyboardEvent): void {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }
}