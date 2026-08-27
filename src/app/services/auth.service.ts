// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id?: string;
  username: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  authorities?: string[];
  token?: string;
  refreshToken?: string;
  employeeId?: string;
  matriculeInterne?: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  roleId?: string;
  role?: string;
  roleLevel?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: any;
  roles?: string[];
  permissions?: string[];
  authorities?: string[];
  roleName?: string;
  roleLevel?: number;
  message?: string;
  error?: string;
  twoFactorRequired?: boolean;
  success?: boolean;
  requiresTwoFactor?: boolean;
  requires_2fa?: boolean;
  userId?: string;
  email?: string;
  twoFactorEnabled?: boolean;
  twoFactorPending?: boolean;
  firstName?: string;
  lastName?: string;
}

export interface TwoFactorSession {
  userId: string;
  email: string;
  tempToken?: string;
  expiresAt?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;
  
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'currentUser';
  private readonly TWO_FA_SESSION_KEY = 'two_factor_session';

  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  currentUser$: Observable<AuthUser | null>;

  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<LoginResponse | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const initialUser = this.getInitialUser();
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.loadStoredUser();
    this.listenToStorageChanges();
  }

  private getInitialUser(): AuthUser | null {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.USER_KEY);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token !== token) { 
          user.token = token; 
        }
        return user;
      } catch (e) {
        console.error('Error parsing stored user:', e);
        return null;
      }
    }
    return null;
  }

  // =========================
  // 2FA methods
  // =========================

  verifyTwoFactor(userId: string, otpCode: number): Observable<LoginResponse> {
    console.log(`Verification 2FA pour userId: ${userId}`);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/verify-2fa`, { userId, otpCode }).pipe(
      tap({
        next: (response) => {
          console.log('Reponse 2FA recue:', response);
          if (response?.accessToken) {
            console.log('Token 2FA recu');
            this.handleSuccessfulLogin(response);
          }
        },
        error: (error) => {
          console.error('Erreur verification 2FA:', error);
        }
      }),
      catchError((error) => {
        console.error('Erreur 2FA catchee:', error);
        return throwError(() => error);
      })
    );
  }

  setTwoFactorSession(userId: string, email: string): void {
    const session: TwoFactorSession = {
      userId,
      email,
      expiresAt: Date.now() + (5 * 60 * 1000)
    };
    localStorage.setItem(this.TWO_FA_SESSION_KEY, JSON.stringify(session));
    console.log('Session 2FA stockee pour:', email);
  }

  getTwoFactorSession(): TwoFactorSession | null {
    const sessionStr = localStorage.getItem(this.TWO_FA_SESSION_KEY);
    if (!sessionStr) return null;
    
    try {
      const session: TwoFactorSession = JSON.parse(sessionStr);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        console.warn('Session 2FA expiree');
        this.clearTwoFactorSession();
        return null;
      }
      return session;
    } catch (e) {
      console.error('Erreur lecture session 2FA:', e);
      return null;
    }
  }

  clearTwoFactorSession(): void {
    localStorage.removeItem(this.TWO_FA_SESSION_KEY);
    console.log('Session 2FA effacee');
  }

  // =========================
  // Gestion des flags 2FA pending
  // =========================

  private twoFactorPendingSubject = new BehaviorSubject<boolean>(false);
  twoFactorPending$ = this.twoFactorPendingSubject.asObservable();

  setTwoFactorPending(pending: boolean): void {
    this.twoFactorPendingSubject.next(pending);
    if (pending) {
      sessionStorage.setItem('2FA_PENDING', 'true');
    } else {
      sessionStorage.removeItem('2FA_PENDING');
    }
  }

  isTwoFactorPending(): boolean {
    return sessionStorage.getItem('2FA_PENDING') === 'true';
  }

  clearTwoFactorPending(): void {
    sessionStorage.removeItem('2FA_PENDING');
    this.twoFactorPendingSubject.next(false);
  }

  // =========================
  // Traitement de la réponse login
  // =========================

  /**
   * Traite la réponse de login et stocke les données appropriées.
   * Gère les cas : token direct, 2FA requis, 2FA en attente.
   */
  handleLoginResponse(response: LoginResponse): void {
    console.log('Handling login response:', response);

    // Cas 1 : token présent -> login complet
    if (response.accessToken) {
      this.handleSuccessfulLogin(response);
      return;
    }

    // Cas 2 : 2FA requis (déjà activé)
    if (response.twoFactorRequired === true) {
      console.log('2FA requis pour l\'utilisateur');
      if (response.userId && response.email) {
        this.setTwoFactorSession(response.userId, response.email);
      }
      this.setTwoFactorPending(false);
      return;
    }

    // Cas 3 : 2FA en attente (secret généré par RH)
    if (response.twoFactorPending === true) {
      console.log('2FA en attente d\'activation');
      this.setTwoFactorPending(true);
      if (response.userId && response.email) {
        const partialUser: AuthUser = {
          id: response.userId,
          email: response.email,
          username: response.email,
          firstName: response.firstName || '',
          lastName: response.lastName || ''
        };
        localStorage.setItem(this.USER_KEY, JSON.stringify(partialUser));
        this.currentUserSubject.next(partialUser);
      }
      return;
    }

    console.warn('Réponse de login non reconnue:', response);
  }

  // =========================
  // Login principal
  // =========================

  login(email: string, password: string): Observable<LoginResponse> {
    console.log(`Tentative de login pour: ${email}`);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap({
        next: (response) => {
          console.log('Reponse login recue:', response);
        },
        error: (error) => {
          console.error('Erreur login:', error);
        }
      }),
      catchError((error) => {
        console.error('Erreur login catchee:', error);
        return throwError(() => error);
      })
    );
  }

  // =========================
  // Stockage du token et utilisateur
  // =========================

  handleSuccessfulLogin(response: LoginResponse): void {
    console.log('Handling successful login...');
    
    if (!response || !response.accessToken) {
      console.error('Response invalide ou token manquant');
      return;
    }

    const token = response.accessToken;
    
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem('token', token);
    localStorage.setItem('jwt', token);
    
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }

    const backendUser = response.user || {};
    const roleName = response.roleName 
                  || backendUser.roleName
                  || backendUser.role 
                  || backendUser.roles?.[0] 
                  || 'EMPLOYEE';

    const roleLevel = response.roleLevel ?? backendUser.roleLevel ?? 0;
    const permissions = response.permissions 
                     || backendUser.permissions 
                     || backendUser.authorities 
                     || [];

    const matriculeInterne = backendUser.matriculeInterne ||
                             backendUser.matricule_interne ||
                             backendUser.employee?.matriculeInterne ||
                             null;

    const user: AuthUser = {
      id: backendUser.id || backendUser._id || response.userId,
      username: backendUser.username || backendUser.email || backendUser.firstName || '',
      email: backendUser.email || response.email || '',
      firstName: backendUser.firstName || response.firstName || '',
      lastName: backendUser.lastName || response.lastName || '',
      token: token,
      refreshToken: response.refreshToken,
      roles: backendUser.roles || response.roles || [roleName],
      permissions: permissions,
      authorities: permissions,
      employeeId: backendUser.employeeId || backendUser.id || backendUser._id,
      matriculeInterne: matriculeInterne,
      active: backendUser.active !== undefined ? backendUser.active : true,
      roleId: backendUser.roleId,
      role: roleName,
      roleLevel: roleLevel,
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.setTwoFactorPending(false);
    this.clearTwoFactorSession();

    console.log('Utilisateur connecte avec succes');
    console.log('   Utilisateur:', user.username);
    console.log('   Role:', roleName);
    console.log('   Token stocke:', this.getToken() ? 'YES' : 'NO');
  }

  // =========================
  // Autres méthodes (refresh, logout, etc.)
  // =========================

  private loadStoredUser(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.USER_KEY);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token !== token) { 
          user.token = token; 
        }
        this.currentUserSubject.next(user);
        console.log('Utilisateur charge depuis le storage');
      } catch (e) {
        console.error('Erreur chargement utilisateur:', e);
        this.clearAuthDataSilently();
      }
    }
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    console.log('Tentative de refresh token...');
    
    if (!refreshToken) {
      console.warn('Pas de refresh token disponible');
      return throwError(() => new Error('No refresh token'));
    }

    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.asObservable().pipe(
        (source) => {
          return new Observable<LoginResponse>((observer) => {
            const subscription = source.subscribe({
              next: (value) => {
                if (value !== null) {
                  observer.next(value);
                } else {
                  observer.error(new Error('Refresh token response was null'));
                }
              },
              error: (err) => observer.error(err),
              complete: () => observer.complete()
            });
            return () => subscription.unsubscribe();
          });
        }
      );
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject = new BehaviorSubject<LoginResponse | null>(null);

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap({
        next: (response) => {
          this.refreshTokenInProgress = false;
          if (response?.accessToken) {
            console.log('Token rafraichi avec succes');
            this.updateToken(response.accessToken);
            if (response.refreshToken) {
              localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
            }
            this.refreshTokenSubject.next(response);
          } else {
            this.refreshTokenSubject.error(new Error('Invalid refresh response'));
          }
        },
        error: (error) => {
          this.refreshTokenInProgress = false;
          console.error('Erreur refresh token:', error);
          this.refreshTokenSubject.error(error);
        }
      }),
      catchError((error) => {
        this.refreshTokenInProgress = false;
        return throwError(() => error);
      })
    );
  }

  private updateToken(newToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('jwt', newToken);
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      currentUser.token = newToken;
      localStorage.setItem(this.USER_KEY, JSON.stringify(currentUser));
      this.currentUserSubject.next(currentUser);
    }
  }

  logout(): void {
    console.log('Deconnexion manuelle...');
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
      }).subscribe({
        next: () => {
          console.log('Deconnexion reussie');
          this.clearAuthData();
        },
        error: () => {
          console.warn('Erreur lors de la deconnexion, nettoyage force');
          this.clearAuthData();
        }
      });
    } else {
      this.clearAuthData();
    }
  }

  private clearAuthDataSilently(): void {
    console.log('Nettoyage silencieux des donnees d\'authentification');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  private clearAuthData(): void {
    console.log('Nettoyage des donnees d\'authentification');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Token format invalide');
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      const isValid = expiryTime > now;
      
      if (!isValid) {
        console.warn(`Token expire: ${new Date(expiryTime).toLocaleString()} < ${new Date(now).toLocaleString()}`);
      }
      
      return isValid;
    } catch (e) {
      console.error('Token invalide:', e);
      return false;
    }
  }

  hasValidToken(): boolean {
    return this.isTokenValid();
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken();
    const isValid = this.isTokenValid();
    return hasToken && isValid;
  }

  getToken(): string | null {
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) token = localStorage.getItem('token');
    if (!token) token = localStorage.getItem('jwt');
    
    if (token && !localStorage.getItem(this.TOKEN_KEY)) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
    
    return token;
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getUserRole(): string {
    const user = this.getCurrentUser();
    if (user?.role) return user.role;
    if (user?.roles && user.roles.length > 0) return user.roles[0];
    return 'EMPLOYEE';
  }

  getUserName(): string {
    const user = this.getCurrentUser();
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return user?.username || 'Utilisateur';
  }

  getCurrentEmployeeId(): string {
    const user = this.getCurrentUser();
    if (user?.matriculeInterne) return user.matriculeInterne;
    if (user?.employeeId) return user.employeeId;
    return user?.id || '';
  }

  getCurrentUserId(): string {
    return this.getCurrentUser()?.id || '';
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return roles.some(r => user?.roles?.includes(r) || false);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { email, code, newPassword });
  }

  private listenToStorageChanges(): void {
    window.addEventListener('storage', (event) => {
      console.log(`Storage change: ${event.key}`);
      
      if (event.key === this.TOKEN_KEY || event.key === 'token' || event.key === 'jwt') {
        const newToken = this.getToken();
        if (!newToken) {
          console.warn('Token supprime dans un autre onglet.');
          this.clearAuthDataSilently();
        } else if (newToken !== this.currentUserSubject.value?.token) {
          console.log('Token mis a jour dans un autre onglet. Rechargement...');
          this.loadStoredUser();
        }
      }
      
      if (event.key === this.USER_KEY && !localStorage.getItem(this.USER_KEY)) {
        console.warn('Utilisateur supprime dans un autre onglet.');
        this.clearAuthDataSilently();
      }
    });
  }
}