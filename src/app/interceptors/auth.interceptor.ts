// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const isPublic = req.url.includes('/auth/login') ||
                   req.url.includes('/auth/refresh-token') ||
                   req.url.includes('/auth/logout');

  let authReq = req;
  if (token && !isPublic) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error) => {
      // ✅ On ne fait PAS de logout automatique
      // On propage simplement l'erreur pour que le composant la gère
      console.error('❌ Erreur HTTP:', error.status, error.message);
      return throwError(() => error);
    })
  );
};