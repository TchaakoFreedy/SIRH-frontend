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
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;
  
  // ✅ Utiliser 'access_token' comme clé principale (cohérent avec PaySlipService)
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'currentUser';

  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  currentUser$: Observable<AuthUser | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const initialUser = this.getInitialUser();
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(initialUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.loadStoredUser();
    this.listenToStorageChanges();

    // 🔍 Vérification du token au démarrage
    this.checkTokenOnStartup();
  }

  private getInitialUser(): AuthUser | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token !== token) { user.token = token; }
        return user;
      } catch (e) {
        console.error('Error parsing stored user:', e);
        return null;
      }
    }
    return null;
  }

  private checkTokenOnStartup(): void {
    const token = this.getToken();
    if (token && !this.isTokenValid()) {
      console.warn('⚠️ Token expiré au démarrage, tentative de rafraîchissement...');
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        this.refreshToken().subscribe({
          next: () => console.log('✅ Token rafraîchi au démarrage'),
          error: () => {
            console.warn('❌ Échec du rafraîchissement, déconnexion');
            this.logout();
          }
        });
      } else {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    console.log(`🔐 Tentative de login pour: ${email}`);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap({
        next: (response) => {
          console.log('📥 Réponse login reçue:', response);
          if (response?.accessToken) {
            console.log('✅ Token reçu:', response.accessToken.substring(0, 20) + '...');
            this.handleAuthResponse(response);
          } else {
            console.error('❌ Aucun token dans la réponse');
          }
        },
        error: (error) => {
          console.error('❌ Erreur login:', error);
        }
      }),
      catchError((error) => {
        console.error('❌ Erreur login catchée:', error);
        return throwError(() => error);
      })
    );
  }

  private handleAuthResponse(response: LoginResponse): void {
    console.log('🔑 Stockage du token...');
    
    // Stockage principal avec la clé 'access_token'
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    
    // Stockage du refresh token
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }

    // Construction de l'utilisateur
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

    const authorities = response.authorities 
                     || backendUser.authorities 
                     || backendUser.permissions 
                     || [];

    const matriculeInterne = backendUser.matriculeInterne ||
                             backendUser.matricule_interne ||
                             backendUser.employee?.matriculeInterne ||
                             null;

    const user: AuthUser = {
      id: backendUser.id || backendUser._id,
      username: backendUser.username || backendUser.email || backendUser.firstName || '',
      email: backendUser.email || '',
      firstName: backendUser.firstName || '',
      lastName: backendUser.lastName || '',
      token: response.accessToken,
      refreshToken: response.refreshToken,
      roles: backendUser.roles || response.roles || [roleName],
      permissions: permissions,
      authorities: authorities,
      employeeId: backendUser.employeeId || backendUser.id || backendUser._id,
      matriculeInterne: matriculeInterne,
      active: backendUser.active !== undefined ? backendUser.active : true,
      roleId: backendUser.roleId,
      role: roleName,
      roleLevel: roleLevel,
    };

    // Sauvegarde de l'utilisateur
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);

    console.log('✅ Utilisateur connecté avec succès');
    console.log('   👤 Utilisateur:', user.username);
    console.log('   🎭 Rôle:', roleName);
    console.log('   🎯 Permissions:', permissions.length);
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token !== token) { user.token = token; }
        this.currentUserSubject.next(user);
        console.log('✅ Utilisateur chargé depuis le storage');
      } catch (e) {
        console.error('❌ Erreur chargement utilisateur:', e);
        this.clearAuthData();
      }
    }
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    console.log('🔄 Tentative de refresh token...');
    
    if (!refreshToken) {
      console.warn('❌ Pas de refresh token disponible');
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap({
        next: (response) => {
          if (response?.accessToken) {
            console.log('✅ Token rafraîchi avec succès');
            this.updateToken(response.accessToken);
            if (response.refreshToken) {
              localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
            }
          }
        },
        error: (error) => {
          console.error('❌ Erreur refresh token:', error);
          this.logout();
        }
      }),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  private updateToken(newToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, newToken);
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      currentUser.token = newToken;
      localStorage.setItem(this.USER_KEY, JSON.stringify(currentUser));
      this.currentUserSubject.next(currentUser);
    }
  }

  logout(): void {
    console.log('🚪 Déconnexion...');
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
      }).subscribe({
        next: () => {
          console.log('✅ Déconnexion réussie');
          this.clearAuthData();
        },
        error: () => {
          console.warn('⚠️ Erreur lors de la déconnexion, nettoyage forcé');
          this.clearAuthData();
        }
      });
    } else {
      this.clearAuthData();
    }
  }

  private clearAuthData(): void {
    console.log('🧹 Nettoyage des données d\'authentification');
    localStorage.removeItem(this.TOKEN_KEY);
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
        console.warn('⚠️ Token format invalide');
        return false;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      const isValid = expiryTime > now;
      
      if (!isValid) {
        console.warn(`⚠️ Token expiré: ${new Date(expiryTime).toLocaleString()} < ${new Date(now).toLocaleString()}`);
      }
      
      return isValid;
    } catch (e) {
      console.error('❌ Token invalide:', e);
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
    return localStorage.getItem(this.TOKEN_KEY);
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
      console.log(`📦 Storage change: ${event.key}`);
      
      if (event.key === this.TOKEN_KEY) {
        const newToken = localStorage.getItem(this.TOKEN_KEY);
        if (!newToken) {
          console.warn('🔒 Token supprimé dans un autre onglet. Déconnexion...');
          this.clearAuthData();
        } else if (newToken !== this.currentUserSubject.value?.token) {
          console.log('🔄 Token mis à jour dans un autre onglet. Rechargement...');
          this.loadStoredUser();
        }
      }
      
      if (event.key === this.USER_KEY && !localStorage.getItem(this.USER_KEY)) {
        console.warn('🔒 Utilisateur supprimé dans un autre onglet. Déconnexion...');
        this.clearAuthData();
      }
    });
  }
}