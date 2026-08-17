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
   * Extrait et fusionne TOUTES les permissions/autorités de l'utilisateur
   * (évite le court-circuit du ||)
   */
  private extractAllPermissions(user: any): string[] {
    if (!user) return [];

    const allPerms = new Set<string>();

    // 1. Permissions directes
    if (Array.isArray(user.permissions)) {
      user.permissions.forEach((p: string) => allPerms.add(p));
    }

    // 2. Autorités venant de Spring Security / JWT
    if (Array.isArray(user.authorities)) {
      user.authorities.forEach((a: any) => {
        const authName = typeof a === 'string' ? a : a.authority;
        if (authName) allPerms.add(authName);
      });
    }

    // 3. Permissions accordées individuellement (overrides)
    if (Array.isArray(user.grantedPermissions)) {
      user.grantedPermissions.forEach((p: string) => allPerms.add(p));
    }

    // 4. Fallback rôles
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: string) => allPerms.add(r));
    }

    return Array.from(allPerms);
  }

  /**
   * Vérifie si l'utilisateur connecté a une permission spécifique (synchrone)
   */
  hasPermissionSync(permission: string): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    if (this.isAdminSync()) return true;

    const userPermissions = this.extractAllPermissions(user);
    const targetPerm = permission.trim().toUpperCase();

    return userPermissions.some(p => p.trim().toUpperCase() === targetPerm);
  }

  /**
   * Vérifie si l'utilisateur connecté a l'une des permissions (synchrone)
   */
  hasAnyPermissionSync(permissions: string[]): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    if (this.isAdminSync()) return true;

    const userPermissions = this.extractAllPermissions(user);
    const targetPerms = permissions.map(p => p.trim().toUpperCase());

    return targetPerms.some(target => 
      userPermissions.some(p => p.trim().toUpperCase() === target)
    );
  }

  /**
   * Vérifie si l'utilisateur est administrateur (synchrone)
   */
  isAdminSync(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const permissions = this.extractAllPermissions(user);

    return (
      user.role === 'RH' ||
      user.role === 'SUPER_ADMIN' ||
      user.roles?.includes('RH') ||
      user.roles?.includes('SUPER_ADMIN') ||
      permissions.includes('*') ||
      permissions.includes('ROLE_RH') ||
      permissions.includes('ROLE_SUPER_ADMIN')
    );
  }

  // ===== VERSIONS ASYNCHRONES (pour les guards) =====

  hasPermission(permission: string): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(() => this.hasPermissionSync(permission))
    );
  }

  hasAnyPermission(permissions: string[]): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(() => this.hasAnyPermissionSync(permissions))
    );
  }

  isAdmin(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(() => this.isAdminSync())
    );
  }
}