// src/app/core/guards/permission.guard.ts

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';
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

    // Si aucune permission n'est requise, autoriser l'accès
    if (!requiredPermission && !requiredPermissions) {
      return of(true);
    }

    // Cas avec plusieurs permissions
    if (requiredPermissions) {
      return this.permissionService.hasAnyPermission(requiredPermissions).pipe(
        take(1),
        map(hasPermission => {
          if (hasPermission) {
            return true;
          }
          return this.router.createUrlTree(['/app/access-denied']);
        }),
        catchError(() => {
          return of(this.router.createUrlTree(['/app/access-denied']));
        })
      );
    }

    // Cas avec une seule permission
    if (requiredPermission) {
      return this.permissionService.hasPermission(requiredPermission).pipe(
        take(1),
        map(hasPermission => {
          if (hasPermission) {
            return true;
          }
          return this.router.createUrlTree(['/app/access-denied']);
        }),
        catchError(() => {
          return of(this.router.createUrlTree(['/app/access-denied']));
        })
      );
    }

    return of(this.router.createUrlTree(['/app/dashboard']));
  }
}