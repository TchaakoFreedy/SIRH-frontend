// src/app/core/services/contrat.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Contrat,
  CreateContratRequest,
  UpdateContratRequest,
  RenouvellementContratRequest,
  StatistiquesContratDTO
} from '../models/contrat.model';

@Injectable({ providedIn: 'root' })
export class ContratService {
  private baseUrl = `${environment.apiUrl}/contrats`;

  constructor(private http: HttpClient) {}

  // Création avec fichiers + flag replaceActive
  createContrat(request: CreateContratRequest, files?: File[], replaceActive: boolean = false): Observable<Contrat> {
    const requestWithFlag = { ...request, replaceActive };
    const formData = new FormData();
    formData.append('contrat', JSON.stringify(requestWithFlag));
    if (files) {
      files.forEach(file => formData.append('files', file));
    }
    return this.http.post<Contrat>(this.baseUrl, formData);
  }

  // Alias pour compatibilité (utilisé dans le wizard employé)
  createContratWithImages(formData: FormData): Observable<Contrat> {
    return this.http.post<Contrat>(this.baseUrl, formData);
  }

  // Upload d'images
  uploadImages(id: string, files: File[]): Observable<Contrat> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post<Contrat>(`${this.baseUrl}/${id}/images`, formData);
  }

  // Récupération
  getAll(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(this.baseUrl);
  }

  getById(id: string): Observable<Contrat> {
    return this.http.get<Contrat>(`${this.baseUrl}/${id}`);
  }

  getByEmployee(employeeId: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/employe/${employeeId}`);
  }

  getActiveByEmployee(employeeId: string): Observable<Contrat> {
    return this.http.get<Contrat>(`${this.baseUrl}/employe/${employeeId}/actif`);
  }

  getByStatut(statut: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/statut/${statut}`);
  }

  getByType(type: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/type/${type}`);
  }

  getActiveContracts(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/actifs`);
  }

  getExpiredContracts(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/expires`);
  }

  getContractsExpiringSoon(days: number = 14): Observable<Contrat[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<Contrat[]>(`${this.baseUrl}/expirant`, { params });
  }

  getRecentContracts(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/recents`);
  }

  search(term: string): Observable<Contrat[]> {
    const params = new HttpParams().set('term', term);
    return this.http.get<Contrat[]>(`${this.baseUrl}/search`, { params });
  }

  update(id: string, request: UpdateContratRequest): Observable<Contrat> {
    return this.http.put<Contrat>(`${this.baseUrl}/${id}`, request);
  }

  renouveler(request: RenouvellementContratRequest): Observable<Contrat> {
    return this.http.post<Contrat>(`${this.baseUrl}/renouveler`, request);
  }

  resilier(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/resilier`, {});
  }

  archiver(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/archiver`, {});
  }

  getContratImages(id: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${id}/images`);
  }

  deleteContratImage(id: string, index: number): Observable<Contrat> {
    return this.http.delete<Contrat>(`${this.baseUrl}/${id}/images/${index}`);
  }

  getStatistiques(): Observable<StatistiquesContratDTO> {
    return this.http.get<StatistiquesContratDTO>(`${this.baseUrl}/statistiques`);
  }

  checkExpiring(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/check-expiring`, {});
  }

  // Avenant
  createAvenant(avenantData: any): Observable<Contrat> {
    return this.http.post<Contrat>(`${this.baseUrl}/avenant`, avenantData);
  }
}