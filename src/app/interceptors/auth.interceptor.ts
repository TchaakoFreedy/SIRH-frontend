// src/app/core/interceptors/auth.interceptor.ts

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Logs de debug (supprimer en production)
  console.log(`[AuthInterceptor] Request [${req.method}] ${req.url}`);

  let token = authService.getToken();
  
  console.log(`[AuthInterceptor] Token found: ${token ? 'YES' : 'NO'}`);
  if (token) {
    console.log(`[AuthInterceptor] Token preview: ${token.substring(0, 30)}...`);
  }

  // Liste des endpoints publics (ne nécessitent pas de token)
  const isPublic = req.url.includes('/auth/login') ||
                   req.url.includes('/auth/refresh-token') ||
                   req.url.includes('/auth/logout') ||
                   req.url.includes('/auth/forgot-password') ||
                   req.url.includes('/auth/reset-password') ||
                   req.url.includes('/auth/register') ||
                   req.url.includes('/auth/verify-2fa') ||
                   req.url.includes('/2fa/pending') ||          // ✅ Ajouté
                   req.url.includes('/2fa/verify') ||           // ✅ Ajouté
                   req.url.includes('/uploads/') ||
                   req.method === 'OPTIONS';

  console.log(`[AuthInterceptor] Is public: ${isPublic}`);

  let authReq = req;

  if (token && !isPublic) {
    authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('[AuthInterceptor] Authorization header added');
  } else if (!token && !isPublic) {
    console.warn('[AuthInterceptor] No token for protected endpoint');
  }

  return next(authReq).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          console.log(`[AuthInterceptor] Response: ${event.status} for ${req.url}`);
        }
      },
      error: (error) => {
        console.error('[AuthInterceptor] Error in tap:', error);
      }
    }),
    catchError((error) => {
      console.error(`[AuthInterceptor] HTTP Error: ${error.status} - ${error.message}`);
      console.error('[AuthInterceptor] URL:', req.url);
      
      if (error.error) {
        console.error('[AuthInterceptor] Error body:', error.error);
      }

      // Les erreurs 403 (Forbidden) ne doivent PAS déclencher de refresh token
      if (error.status === 403) {
        console.warn('[AuthInterceptor] Access refused (403) - No logout, no refresh');
        return throwError(() => error);
      }

      // Seulement les 401 (Unauthorized) déclenchent un refresh token
      // Exclure les endpoints publics (déjà traités) et les endpoints 2FA publics
      if (error.status === 401 && 
          !req.url.includes('/auth/refresh-token') && 
          !req.url.includes('/auth/login') &&
          !req.url.includes('/2fa/pending') &&
          !req.url.includes('/2fa/verify')) {
        console.log('[AuthInterceptor] Attempting token refresh for 401...');
        
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          return authService.refreshToken().pipe(
            switchMap((response: any) => {
              console.log('[AuthInterceptor] Token refreshed successfully');
              const newToken = authService.getToken();
              if (newToken) {
                const newReq = req.clone({
                  setHeaders: {
                    'Authorization': `Bearer ${newToken}`
                  }
                });
                return next(newReq);
              }
              return throwError(() => error);
            }),
            catchError((refreshError) => {
              console.error('[AuthInterceptor] Token refresh failed:', refreshError);
              if (refreshError.status === 401 || refreshError.status === 403) {
                console.log('[AuthInterceptor] Logging out due to invalid refresh token');
                authService.logout();
                router.navigate(['/login']);
              }
              return throwError(() => refreshError);
            })
          );
        } else {
          console.warn('[AuthInterceptor] No refresh token available for 401');
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => error);
        }
      }

      // Pour toutes les autres erreurs, les propager
      return throwError(() => error);
    })
  );
};