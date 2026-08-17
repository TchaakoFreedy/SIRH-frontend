// src/app/features/discipline/services/discipline.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DemandeExplication, ReponseExplication, StatutDemandeExplication } from '../models/demande-explication.model';
import { Page } from '../../../shared/models/page.model';

@Injectable({ providedIn: 'root' })
export class DisciplineService {
  private baseUrl = `${environment.apiUrl}/discipline`;

  constructor(private http: HttpClient) {}

  /**
   * Vue GLOBALE - Pour RH, Direction, Top Manager, Manager
   * Utilise /explanations avec la permission EXPLANATION_REQUEST_VIEW
   */
  getDemandes(params?: {
    employeId?: string;
    entrepriseId?: string;
    departementId?: string;
    statut?: StatutDemandeExplication;
    dateDebut?: Date;
    dateFin?: Date;
    auteurId?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<DemandeExplication>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<DemandeExplication>>(`${this.baseUrl}/explanations`, { params: httpParams });
  }

  /**
   * Vue INDIVIDUELLE - Pour EMPLOYEE (ses propres demandes)
   * Utilise /explanations/employee/{employeeId} avec la permission EXPLANATION_REQUEST_VIEW_OWN
   */
  getDemandesByEmployee(employeeId: string, params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<DemandeExplication>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<DemandeExplication>>(`${this.baseUrl}/explanations/employee/${employeeId}`, { params: httpParams });
  }

  getDemandeById(id: string): Observable<DemandeExplication> {
    return this.http.get<DemandeExplication>(`${this.baseUrl}/explanations/${id}`);
  }

  createDemande(data: Partial<DemandeExplication>): Observable<DemandeExplication> {
    return this.http.post<DemandeExplication>(`${this.baseUrl}/explanations`, data);
  }

  updateDemande(id: string, data: Partial<DemandeExplication>): Observable<DemandeExplication> {
    return this.http.put<DemandeExplication>(`${this.baseUrl}/explanations/${id}`, data);
  }

  markAsReplied(id: string): Observable<DemandeExplication> {
    return this.http.post<DemandeExplication>(`${this.baseUrl}/explanations/${id}/mark-replied`, {});
  }

  replyToDemande(id: string, reponse: Partial<ReponseExplication>): Observable<DemandeExplication> {
    return this.http.post<DemandeExplication>(`${this.baseUrl}/explanations/${id}/reply`, reponse);
  }

  validateResponse(id: string): Observable<DemandeExplication> {
    return this.http.post<DemandeExplication>(`${this.baseUrl}/explanations/${id}/validate`, {});
  }

  rejectResponse(id: string): Observable<DemandeExplication> {
    return this.http.post<DemandeExplication>(`${this.baseUrl}/explanations/${id}/reject`, {});
  }

  cancelDemande(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/explanations/${id}/cancel`, {});
  }

  getStatutLabel(statut: StatutDemandeExplication): string {
    const labels: Record<StatutDemandeExplication, string> = {
      [StatutDemandeExplication.EN_ATTENTE]: 'En attente de réponse',
      [StatutDemandeExplication.REPONDUE]: 'Répondue',
      [StatutDemandeExplication.VALIDEE]: 'Validée',
      [StatutDemandeExplication.REJETEE]: 'Rejetée',
      [StatutDemandeExplication.ANNULEE]: 'Annulée'
    };
    return labels[statut] || statut;
  }

  getStatutColor(statut: StatutDemandeExplication): string {
    const colors: Record<StatutDemandeExplication, string> = {
      [StatutDemandeExplication.EN_ATTENTE]: 'warning',
      [StatutDemandeExplication.REPONDUE]: 'info',
      [StatutDemandeExplication.VALIDEE]: 'success',
      [StatutDemandeExplication.REJETEE]: 'danger',
      [StatutDemandeExplication.ANNULEE]: 'secondary'
    };
    return colors[statut] || 'secondary';
  }

  getStatutClass(statut: StatutDemandeExplication): string {
    const classes: Record<StatutDemandeExplication, string> = {
      [StatutDemandeExplication.EN_ATTENTE]: 'en-attente',
      [StatutDemandeExplication.REPONDUE]: 'repondue',
      [StatutDemandeExplication.VALIDEE]: 'validee',
      [StatutDemandeExplication.REJETEE]: 'rejetee',
      [StatutDemandeExplication.ANNULEE]: 'annulee'
    };
    return classes[statut] || '';
  }

  isEditable(statut: StatutDemandeExplication): boolean {
    return statut === StatutDemandeExplication.EN_ATTENTE;
  }

  canReply(statut: StatutDemandeExplication): boolean {
    return statut === StatutDemandeExplication.EN_ATTENTE;
  }

  canMarkAsReplied(statut: StatutDemandeExplication): boolean {
    return statut === StatutDemandeExplication.EN_ATTENTE;
  }

  canValidate(statut: StatutDemandeExplication): boolean {
    return statut === StatutDemandeExplication.REPONDUE;
  }

  canReject(statut: StatutDemandeExplication): boolean {
    return statut === StatutDemandeExplication.REPONDUE;
  }
}