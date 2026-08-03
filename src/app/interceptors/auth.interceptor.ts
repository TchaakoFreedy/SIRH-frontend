// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 🔍 LOG DE DEBUG
  console.log(`🛡️ Interceptor [${req.method}] ${req.url}`);

  // Récupération du token avec la bonne clé (access_token)
  let token = localStorage.getItem('access_token');
  
  // Fallback si le token est stocké sous une autre clé
  if (!token) {
    token = localStorage.getItem('token');
  }
  if (!token) {
    token = localStorage.getItem('jwt');
  }

  console.log(`   Token trouvé: ${!!token}`);
  if (token) {
    console.log(`   Token (début): ${token.substring(0, 20)}...`);
  }
  console.log(`   Clés disponibles:`, Object.keys(localStorage));

  // URLs publiques qui ne nécessitent pas de token
  const isPublic = req.url.includes('/auth/login') ||
                   req.url.includes('/auth/refresh-token') ||
                   req.url.includes('/auth/logout') ||
                   req.url.includes('/auth/forgot-password') ||
                   req.url.includes('/auth/reset-password');

  let authReq = req;

  // Ajouter le token uniquement si présent et que ce n'est pas une URL publique
  if (token && !isPublic) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Header Authorization ajouté');
  } else if (!token && !isPublic) {
    console.warn(`⚠️ Aucun token trouvé pour la requête protégée: ${req.url}`);
    
    // Vérifier si l'utilisateur est authentifié
    if (!authService.isAuthenticated()) {
      console.warn('🔒 Utilisateur non authentifié');
    }
  }

  // Gestion des erreurs
  return next(authReq).pipe(
    catchError((error) => {
      console.error('❌ Erreur HTTP:', error.status, error.message);
      console.error('   URL:', req.url);
      console.error('   Headers:', authReq.headers.keys());

      // Si erreur 401 ou 403, tenter de rafraîchir le token
      if ((error.status === 401 || error.status === 403) && !req.url.includes('/auth/refresh-token')) {
        console.log('🔄 Tentative de rafraîchissement du token...');
        
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          return authService.refreshToken().pipe(
            switchMap((response: any) => {
              console.log('✅ Token rafraîchi avec succès');
              // Réessayer la requête originale avec le nouveau token
              const newToken = localStorage.getItem('access_token');
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(newReq);
            }),
            catchError((refreshError) => {
              console.error('❌ Échec du rafraîchissement du token');
              authService.logout();
              return throwError(() => refreshError);
            })
          );
        } else {
          console.warn('🔒 Aucun refresh token disponible, déconnexion');
          authService.logout();
          return throwError(() => error);
        }
      }

      return throwError(() => error);
    })
  );
};