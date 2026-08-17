// src/app/features/discipline/services/import-discipline.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ImportResult {
  numeroOriginal: string;
  demandeId?: string;
  success: boolean;
  duplicate: boolean;
  errorMessage?: string;
}

export interface ImportDemandeExplication {
  numeroOriginal: string;
  objet: string;
  description?: string;
  motif?: string;
  employeConcerneIdentifier: string;
  auteurIdentifier?: string;
  dateCreation?: string;
  dateLimiteReponse?: string;
  statut?: string;
  reponse?: {
    contenu: string;
    piecesJointes?: string[];
    dateReponse?: string;
    validee: boolean;
    rejetee: boolean;
  };
  historique?: Array<{
    action: string;
    date?: string;
    commentaire?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class ImportDisciplineService {
  private baseUrl = `${environment.apiUrl}/discipline/import`;

  constructor(private http: HttpClient) {}

  /**
   * Importer une seule demande d'explication
   */
  importerDemande(data: ImportDemandeExplication): Observable<{ 
    success: boolean; 
    message: string; 
    numero?: string; 
    id?: string;
    error?: string;
  }> {
    return this.http.post<{ 
      success: boolean; 
      message: string; 
      numero?: string; 
      id?: string;
      error?: string;
    }>(`${this.baseUrl}/explanations`, data);
  }

  /**
   * Importer plusieurs demandes en masse
   */
  importerDemandesEnMasse(data: ImportDemandeExplication[]): Observable<{
    success: boolean;
    total: number;
    successCount: number;
    duplicateCount: number;
    failureCount: number;
    details: Array<{
      numero: string;
      status: string;
      message: string;
      id?: string;
    }>;
  }> {
    return this.http.post<{
      success: boolean;
      total: number;
      successCount: number;
      duplicateCount: number;
      failureCount: number;
      details: Array<{
        numero: string;
        status: string;
        message: string;
        id?: string;
      }>;
    }>(`${this.baseUrl}/explanations/mass`, data);
  }

  /**
   * Importer depuis un fichier CSV
   */
  importerDepuisCSV(file: File): Observable<{
    success: boolean;
    message: string;
    filename?: string;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{
      success: boolean;
      message: string;
      filename?: string;
      error?: string;
    }>(`${this.baseUrl}/explanations/csv`, formData);
  }
}