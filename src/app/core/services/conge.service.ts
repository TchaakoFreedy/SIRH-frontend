import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Conge, StatutConge, TypeConge } from '../models/conge.model';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CongeService {
  private apiUrl = `${environment.apiUrl}/conges`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * ⭐ Récupère l'ID MongoDB de l'employé connecté
   */
  private get currentEmployeeId(): string {
    return this.authService.getCurrentEmployeeId();
  }

  /**
   * Récupère les headers avec le token JWT
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * ✅ Récupère tous les congés selon le rôle de l'utilisateur
   * - RH/Admin : voit tous les congés
   * - Manager : voit uniquement les congés de son département
   */
  getAll(): Observable<Conge[]> {
    console.log('📥 Récupération des congés selon le rôle...');
    return this.http.get<Conge[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * ✅ NOUVEAU : Récupère les congés du département du manager avec filtres
   * @param statut - Filtrer par statut (EN_ATTENTE, APPROUVE, REJETE, ANNULE, TOUS)
   * @param type - Filtrer par type (ANNUEL, PERMISSION, ABSENCE, TOUS)
   */
  getCongesByDepartement(statut?: string, type?: string): Observable<Conge[]> {
    console.log('📥 Récupération des congés du département...');
    
    let params = new HttpParams();
    if (statut && statut !== 'TOUS') {
      params = params.set('statut', statut);
    }
    if (type && type !== 'TOUS') {
      params = params.set('type', type);
    }
    
    return this.http.get<Conge[]>(`${this.apiUrl}/departement`, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(catchError(this.handleError));
  }

  /**
   * ✅ NOUVEAU : Récupère les membres de l'équipe du manager
   */
  getTeamMembers(): Observable<any[]> {
    console.log('📥 Récupération des membres de l\'équipe...');
    return this.http.get<any[]>(`${this.apiUrl}/team/members`, { 
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Récupère un congé par son ID MongoDB
   */
  getById(id: string): Observable<Conge> {
    return this.http.get<Conge>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * ⭐ Crée une demande (redirige automatiquement selon le type)
   */
  create(data: any): Observable<Conge> {
    const employeeId = this.currentEmployeeId;
    if (!employeeId) {
      return throwError(() => new Error('Utilisateur non identifié. Veuillez vous reconnecter.'));
    }

    const type = data.typeConge || TypeConge.ANNUEL;
    console.log('📤 Création demande de type:', type);

    switch (type) {
      case TypeConge.PERMISSION:
        return this.requestPermission(data);
      
      case TypeConge.ABSENCE:
        return this.signalAbsence(data);
      
      case TypeConge.ANNUEL:
      default:
        const request = {
          typeConge: type,
          jourDebut: data.jourDebut,
          jourFin: data.jourFin,
          employeeId: employeeId,
          motif: data.motif || data.commentaireManager || ''
        };
        return this.http.post<Conge>(this.apiUrl, request, { headers: this.getHeaders() })
          .pipe(catchError(this.handleError));
    }
  }

  /**
   * ⭐ Signale une absence avec l'ID MongoDB
   */
  signalAbsence(data: any): Observable<Conge> {
    const employeeId = this.currentEmployeeId;
    if (!employeeId) {
      return throwError(() => new Error('Utilisateur non identifié. Veuillez vous reconnecter.'));
    }

    const request = {
      employeeId: employeeId,
      jourDebut: data.jourDebut,
      jourFin: data.jourFin,
      motif: data.motif || data.commentaireManager || 'Absence signalée'
    };
    
    console.log('📤 Signalement absence avec ID MongoDB:', employeeId);
    return this.http.post<Conge>(`${this.apiUrl}/absence`, request, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * ⭐ Demande une permission avec l'ID MongoDB
   */
  requestPermission(data: any): Observable<Conge> {
    const employeeId = this.currentEmployeeId;
    if (!employeeId) {
      return throwError(() => new Error('Utilisateur non identifié. Veuillez vous reconnecter.'));
    }

    const request = {
      employeeId: employeeId,
      jourDebut: data.jourDebut,
      jourFin: data.jourFin,
      motif: data.motif || data.commentaireManager || 'Permission demandée'
    };
    
    console.log('📤 Demande permission avec ID MongoDB:', employeeId);
    console.log('🔔 La permission sera en attente de validation manager');
    
    return this.http.post<Conge>(`${this.apiUrl}/permission`, request, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Met à jour un congé
   */
  update(id: string, data: Conge): Observable<Conge> {
    return this.http.put<Conge>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Annule un congé
   */
  cancel(id: string): Observable<Conge> {
    return this.http.patch<Conge>(`${this.apiUrl}/${id}/annuler`, {}, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Approuve un congé (RH/Manager)
   * ✅ Le managerId est automatiquement pris du token JWT
   */
  approve(id: string, commentaire: string): Observable<Conge> {
    const managerId = this.currentEmployeeId;
    if (!managerId) {
      return throwError(() => new Error('Utilisateur non identifié. Veuillez vous reconnecter.'));
    }
    
    const request = { managerId, commentaire };
    return this.http.patch<Conge>(`${this.apiUrl}/${id}/approve`, request, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Rejette un congé (RH/Manager)
   * ✅ Le managerId est automatiquement pris du token JWT
   */
  reject(id: string, commentaire: string): Observable<Conge> {
    const managerId = this.currentEmployeeId;
    if (!managerId) {
      return throwError(() => new Error('Utilisateur non identifié. Veuillez vous reconnecter.'));
    }
    
    const request = { managerId, commentaire };
    return this.http.patch<Conge>(`${this.apiUrl}/${id}/reject`, request, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * ⭐ Récupère les congés d'un employé par son ID MongoDB
   */
  getByEmployee(employeeId: string): Observable<Conge[]> {
    console.log('📥 Récupération congés pour ID MongoDB:', employeeId);
    return this.http.get<Conge[]>(`${this.apiUrl}/employee/${employeeId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les congés par statut
   */
  getByStatut(statut: StatutConge): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/statut/${statut}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les congés par type
   */
  getByType(type: TypeConge): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/type/${type}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * ⭐ Récupère le solde de congés annuels d'un employé par son ID MongoDB
   */
  getSoldeByEmployee(employeeId: string): Observable<number> {
    console.log('📥 Récupération solde pour ID MongoDB:', employeeId);
    return this.http.get<number>(`${this.apiUrl}/employee/${employeeId}/solde-annuel`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * ⭐ Récupère les droits annuels détaillés (base + bonus) pour un employé
   * Utilise la configuration dynamique
   */
  getDroitsAnnuels(employeeId: string): Observable<number> {
    console.log('📥 Récupération droits annuels pour ID MongoDB:', employeeId);
    return this.http.get<number>(`${this.apiUrl}/employee/${employeeId}/droits-annuels`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue lors de la communication avec le serveur.';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = error.error.message;
    } else {
      // Erreur côté serveur
      if (error.status === 0) {
        errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error.status === 403) {
        errorMessage = 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.';
      } else if (error.status === 404) {
        errorMessage = 'Ressource non trouvée. Vérifiez l\'ID de l\'employé.';
      } else {
        errorMessage = `Erreur ${error.status}: ${error.statusText}`;
      }
    }
    
    console.error('❌ Erreur API:', error);
    return throwError(() => new Error(errorMessage));
  }
}