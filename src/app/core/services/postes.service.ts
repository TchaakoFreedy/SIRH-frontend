import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError, retry, map } from 'rxjs';
import { Poste, CreatePosteRequest, UpdatePosteRequest } from '../models/poste.model';

@Injectable({
  providedIn: 'root'
})
export class PostesService {
  private apiUrl = 'http://localhost:8080/api/postes';

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tous les postes
   */
  getAll(): Observable<Poste[]> {
    return this.http.get<Poste[]>(this.apiUrl)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer uniquement les postes actifs
   */
  getActive(): Observable<Poste[]> {
    return this.http.get<Poste[]>(`${this.apiUrl}/active`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer un poste par son ID
   */
  getById(id: string): Observable<Poste> {
    return this.http.get<Poste>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Créer un nouveau poste
   */
  create(poste: CreatePosteRequest): Observable<Poste> {
    return this.http.post<Poste>(this.apiUrl, poste)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour un poste
   */
  update(id: string, poste: UpdatePosteRequest): Observable<Poste> {
    return this.http.put<Poste>(`${this.apiUrl}/${id}`, poste)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Supprimer un poste
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Basculer le statut actif/inactif d'un poste
   */
  toggleActive(id: string): Observable<Poste> {
    return this.http.patch<Poste>(`${this.apiUrl}/${id}/toggle`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupérer les postes par département
   */
  getByDepartement(departementId: string): Observable<Poste[]> {
    return this.http.get<Poste[]>(`${this.apiUrl}/departement/${departementId}`)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur réseau: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de se connecter au serveur';
          break;
        case 400:
          errorMessage = error.error?.message || 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Non autorisé - Veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès interdit - Vous n\'avez pas les droits nécessaires';
          break;
        case 404:
          errorMessage = error.error?.message || 'Ressource non trouvée';
          break;
        case 409:
          errorMessage = error.error?.message || 'Conflit - La ressource existe déjà';
          break;
        case 500:
          errorMessage = 'Erreur interne du serveur';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Erreur API:', {
      status: error.status,
      message: errorMessage,
      details: error.error
    });

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      originalError: error
    }));
  }
}