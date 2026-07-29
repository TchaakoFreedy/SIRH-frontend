import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      let errorMessage = 'Une erreur inattendue est survenue.';

      if (error.status === 200 && !error.ok) {
        // Réponse 200 mais corps non-JSON (ex: HTML d'erreur)
        errorMessage = 'Le serveur a retourné une réponse invalide (non-JSON). Vérifiez les logs backend.';
        console.error('⚠️ Réponse non-JSON:', error);
      } else if (error.error instanceof ErrorEvent) {
        // Erreur côté client
        errorMessage = `Erreur: ${error.error.message}`;
      } else {
        // Erreur serveur
        errorMessage = `Erreur ${error.status}: ${error.message}`;
      }

      // Afficher un toast ou log
      console.error('❌ Erreur interceptée:', errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
};