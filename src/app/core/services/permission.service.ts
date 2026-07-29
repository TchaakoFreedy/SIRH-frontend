// src/app/core/services/permission.service.ts

import { Injectable } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor(private authService: AuthService) {}

  /**
   * Vérifie si l'utilisateur connecté a une permission spécifique (synchrone)
   */
  hasPermissionSync(permission: string): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const permissions = user.permissions || user.authorities || user.roles || [];
    const isAdmin = user.role === 'RH' || 
                   user.role === 'SUPER_ADMIN' || 
                   user.roles?.includes('RH') ||
                   user.roles?.includes('SUPER_ADMIN') ||
                   permissions.includes('*') ||
                   permissions.includes('ROLE_RH') ||
                   permissions.includes('ROLE_SUPER_ADMIN');

    return isAdmin || permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur connecté a l'une des permissions (synchrone)
   */
  hasAnyPermissionSync(permissions: string[]): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const userPermissions = user.permissions || user.authorities || user.roles || [];
    const isAdmin = user.role === 'RH' || 
                   user.role === 'SUPER_ADMIN' || 
                   user.roles?.includes('RH') ||
                   user.roles?.includes('SUPER_ADMIN') ||
                   userPermissions.includes('*') ||
                   userPermissions.includes('ROLE_RH') ||
                   userPermissions.includes('ROLE_SUPER_ADMIN');

    return isAdmin || permissions.some(p => userPermissions.includes(p));
  }

  /**
   * Vérifie si l'utilisateur est administrateur (synchrone)
   */
  isAdminSync(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const permissions = user.permissions || user.authorities || user.roles || [];
    return user.role === 'RH' || 
           user.role === 'SUPER_ADMIN' || 
           user.roles?.includes('RH') ||
           user.roles?.includes('SUPER_ADMIN') ||
           permissions.includes('*') ||
           permissions.includes('ROLE_RH') ||
           permissions.includes('ROLE_SUPER_ADMIN');
  }

  // ===== VERSIONS ASYNCHRONES (pour les guards) =====

  hasPermission(permission: string): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) return false;
        const permissions = user.permissions || user.authorities || user.roles || [];
        const isAdmin = user.role === 'RH' || 
                       user.role === 'SUPER_ADMIN' || 
                       user.roles?.includes('RH') ||
                       user.roles?.includes('SUPER_ADMIN') ||
                       permissions.includes('*') ||
                       permissions.includes('ROLE_RH') ||
                       permissions.includes('ROLE_SUPER_ADMIN');
        return isAdmin || permissions.includes(permission);
      })
    );
  }

  hasAnyPermission(permissions: string[]): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) return false;
        const userPermissions = user.permissions || user.authorities || user.roles || [];
        const isAdmin = user.role === 'RH' || 
                       user.role === 'SUPER_ADMIN' || 
                       user.roles?.includes('RH') ||
                       user.roles?.includes('SUPER_ADMIN') ||
                       userPermissions.includes('*') ||
                       userPermissions.includes('ROLE_RH') ||
                       userPermissions.includes('ROLE_SUPER_ADMIN');
        return isAdmin || permissions.some(p => userPermissions.includes(p));
      })
    );
  }

  isAdmin(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) return false;
        const permissions = user.permissions || user.authorities || user.roles || [];
        return user.role === 'RH' || 
               user.role === 'SUPER_ADMIN' || 
               user.roles?.includes('RH') ||
               user.roles?.includes('SUPER_ADMIN') ||
               permissions.includes('*') ||
               permissions.includes('ROLE_RH') ||
               permissions.includes('ROLE_SUPER_ADMIN');
      })
    );
  }
}