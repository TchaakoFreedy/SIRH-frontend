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
  matricule_interne?: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  roleId?: string;
  role?: string;           // Nom du rôle (ex: "RH", "MANAGER")
  roleLevel?: number;      // Niveau hiérarchique
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
  roleName?: string;       // ✅ Champ clé
  roleLevel?: number;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;
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

    // ✅ Écouter les changements de localStorage provenant d'autres onglets
    this.listenToStorageChanges();
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

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap({
        next: (response) => {
          if (response?.accessToken) {
            this.handleAuthResponse(response);
          }
        },
        error: (error) => console.error('Login error:', error)
      }),
      catchError((error) => throwError(() => error))
    );
  }

  private handleAuthResponse(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }

    const backendUser = response.user || {};

    // ✅ Récupération du rôle (priorité à response.roleName)
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

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);

    console.log('✅ AuthService: Utilisateur connecté avec rôle:', roleName);
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token !== token) { user.token = token; }
        this.currentUserSubject.next(user);
      } catch (e) {
        this.clearAuthData();
      }
    }
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap({
        next: (response) => {
          if (response?.accessToken) {
            this.updateToken(response.accessToken);
            if (response.refreshToken) {
              localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
            }
          }
        },
        error: () => this.logout()
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
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${token}`)
      }).subscribe({
        next: () => this.clearAuthData(),
        error: () => this.clearAuthData()
      });
    } else {
      this.clearAuthData();
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // ✅ Méthode pour vérifier si un token est présent et valide
  hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now() + 10000;
    } catch {
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.hasValidToken();
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

  // ✅ Écouteur pour synchroniser la déconnexion entre onglets
  private listenToStorageChanges(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.TOKEN_KEY) {
        const newToken = localStorage.getItem(this.TOKEN_KEY);
        if (!newToken) {
          // Token supprimé dans un autre onglet → déconnexion locale
          console.warn('🔒 Token supprimé dans un autre onglet. Déconnexion...');
          this.clearAuthData();
        } else if (newToken !== this.currentUserSubject.value?.token) {
          // Token mis à jour dans un autre onglet → recharger l'utilisateur
          this.loadStoredUser();
        }
      }
      // Si l'utilisateur a été supprimé
      if (event.key === this.USER_KEY && !localStorage.getItem(this.USER_KEY)) {
        console.warn('🔒 Utilisateur supprimé dans un autre onglet. Déconnexion...');
        this.clearAuthData();
      }
    });
  }
}