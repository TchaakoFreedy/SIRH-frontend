// src/app/core/interceptors/error.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      let errorMessage = 'Une erreur inattendue est survenue.';
      let status = error.status;

      // Log complet de l'erreur pour le debug
      console.error('❌ Erreur interceptée:', {
        status: status,
        message: error.message,
        error: error.error,
        url: req.url,
        method: req.method
      });

      // Gestion des erreurs HTTP
      if (status === 200 && !error.ok) {
        errorMessage = 'Le serveur a retourné une réponse invalide.';
      } else if (error.error instanceof ErrorEvent) {
        errorMessage = `Erreur: ${error.error.message}`;
      } else {
        // Gestion spécifique par code d'erreur
        switch (status) {
          case 0:
            errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
            break;
          case 400:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.errors) {
              const errors = Object.values(error.error.errors).join(', ');
              errorMessage = `Données invalides: ${errors}`;
            } else {
              errorMessage = 'Données invalides. Vérifiez les champs saisis.';
            }
            break;
          case 401:
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            break;
          case 403:
            errorMessage = 'Vous n\'avez pas la permission d\'effectuer cette action.';
            break;
          case 404:
            errorMessage = 'Ressource non trouvée.';
            break;
          case 409:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else {
              errorMessage = 'Conflit: Une ressource existe déjà avec ces informations.';
            }
            break;
          case 500:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else {
              errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
            }
            break;
          default:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.error) {
              errorMessage = error.error.error;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else {
              errorMessage = `Erreur ${status}: ${error.message || 'Une erreur est survenue'}`;
            }
            break;
        }
      }

      // Retourner l'erreur avec le message personnalisé
      const customError = new Error(errorMessage);
      (customError as any).status = status;
      (customError as any).originalError = error;
      (customError as any).url = req.url;
      (customError as any).method = req.method;
      
      return throwError(() => customError);
    })
  );
};