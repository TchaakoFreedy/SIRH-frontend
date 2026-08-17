// permission.guard.ts - Version debug
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError, tap } from 'rxjs/operators';
import { PermissionService } from '../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const requiredPermission = route.data['permission'] as string;
    const requiredPermissions = route.data['permissions'] as string[];

    console.log('🔍 PermissionGuard - Route:', state.url);
    console.log('🔍 Required permission:', requiredPermission || requiredPermissions);

    // Si aucune permission n'est requise, autoriser l'accès
    if (!requiredPermission && !requiredPermissions) {
      return of(true);
    }

    // Cas avec plusieurs permissions
    if (requiredPermissions) {
      return this.permissionService.hasAnyPermission(requiredPermissions).pipe(
        take(1),
        tap(hasPermission => console.log(`✅ Has any of ${requiredPermissions}:`, hasPermission)),
        map(hasPermission => {
          if (hasPermission) {
            return true;
          }
          console.log('❌ Access denied - Redirect to access-denied');
          return this.router.createUrlTree(['/app/access-denied']);
        }),
        catchError((error) => {
          console.error('❌ Error checking permissions:', error);
          return of(this.router.createUrlTree(['/app/access-denied']));
        })
      );
    }

    // Cas avec une seule permission
    if (requiredPermission) {
      return this.permissionService.hasPermission(requiredPermission).pipe(
        take(1),
        tap(hasPermission => console.log(`✅ Has permission ${requiredPermission}:`, hasPermission)),
        map(hasPermission => {
          if (hasPermission) {
            return true;
          }
          console.log('❌ Access denied - Redirect to access-denied');
          return this.router.createUrlTree(['/app/access-denied']);
        }),
        catchError((error) => {
          console.error('❌ Error checking permission:', error);
          return of(this.router.createUrlTree(['/app/access-denied']));
        })
      );
    }

    return of(this.router.createUrlTree(['/app/dashboard']));
  }
}