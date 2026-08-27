// src/app/services/two-factor-auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorMassEnableResponse {
  activatedCount: number;
  userSecrets: Record<string, string>;
  userBackupCodes: Record<string, string[]>;
}

export interface TwoFactorStatusResponse {
  twoFactorEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TwoFactorAuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Génère un secret 2FA avec QR code pour un utilisateur
   */
  generateTwoFactorSecret(userId: string): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(`${this.apiUrl}/2fa/generate/${userId}`, {});
  }

  /**
   * Vérifie et active le 2FA
   */
  verifyAndEnableTwoFactor(userId: string, otpCode: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/2fa/verify`, { userId, otpCode });
  }

  /**
   * Initie le processus 2FA pour un utilisateur (RH uniquement)
   * Génère un secret et le met en attente.
   */
  initiateTwoFactor(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/2fa/admin/initiate/${userId}`, {});
  }

  /**
   * Récupère les informations de 2FA en attente pour un utilisateur donné
   * (QR code, secret, backup codes)
   */
  getPendingTwoFactor(userId: string): Observable<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    return this.http.get<{ secret: string; qrCodeUrl: string; backupCodes: string[] }>(
      `${this.apiUrl}/2fa/pending?userId=${userId}`
    );
  }

  /**
   * Active le 2FA pour un utilisateur (RH uniquement) - Déprécié
   */
  enableTwoFactorByRH(userId: string): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(`${this.apiUrl}/2fa/admin/enable/${userId}`, {});
  }

  /**
   * Active le 2FA pour tous les utilisateurs (RH uniquement)
   */
  enableTwoFactorForAll(): Observable<TwoFactorMassEnableResponse> {
    return this.http.post<TwoFactorMassEnableResponse>(`${this.apiUrl}/2fa/admin/enable-all`, {});
  }

  /**
   * Désactive le 2FA pour un utilisateur (RH uniquement)
   */
  disableTwoFactor(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/2fa/admin/disable/${userId}`, {});
  }

  /**
   * Vérifie le statut 2FA d'un utilisateur
   */
  getTwoFactorStatus(userId: string): Observable<boolean> {
    return this.http.get<TwoFactorStatusResponse>(`${this.apiUrl}/2fa/status/${userId}`)
      .pipe(
        map(response => response.twoFactorEnabled)
      );
  }

  /**
   * Vérifie un code de backup
   */
  verifyBackupCode(userId: string, backupCode: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/2fa/verify-backup`, { userId, backupCode });
  }
}