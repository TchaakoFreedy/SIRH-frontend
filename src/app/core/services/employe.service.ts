// src/app/core/services/employe.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee } from '../models/employee.model';
import { Document } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class EmployeService {
  private url = `${environment.apiUrl}/employees`;
  private docUrl = `${environment.apiUrl}/documents-management`;
  private profileUrl = `${environment.apiUrl}/profile`;

  constructor(private http: HttpClient) {}

  // ============================================
  // GESTION DES EMPLOYÉS (CRUD)
  // ============================================

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.url);
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/${id}`);
  }

  getByUserId(userId: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/user/${userId}`);
  }

  findByMatricule(matricule: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/matricule/${matricule}`);
  }

  getCurrentEmployee(): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/me`);
  }

  getByEntreprise(entrepriseId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/entreprise/${entrepriseId}`);
  }

  getMyCompanyEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/my-company/employees`);
  }

  create(data: FormData): Observable<Employee> {
    return this.http.post<Employee>(this.url, data);
  }

  update(id: string, data: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.url}/${id}`, data);
  }

  updateByAdmin(id: string, data: any): Observable<Employee> {
    return this.http.patch<Employee>(`${this.url}/${id}/admin`, data);
  }

  updateSelfProfile(id: string, data: { telephone: string; addresse: string }): Observable<Employee> {
    return this.http.patch<Employee>(`${this.url}/${id}/profile`, data);
  }

updateMyProfile(data: { telephone: string; addresse: string; numeroContactUrgence?: string }): Observable<Employee> {
  return this.http.patch<Employee>(`${this.profileUrl}`, data);
}

  getMyProfile(): Observable<Employee> {
    return this.http.get<Employee>(`${this.profileUrl}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ============================================
  // ACTIONS STATUT
  // ============================================

  suspendre(id: string): Observable<Employee> {
    return this.http.post<Employee>(`${this.url}/${id}/suspendre`, {});
  }

  reactiver(id: string): Observable<Employee> {
    return this.http.post<Employee>(`${this.url}/${id}/reactiver`, {});
  }

  // ============================================
  // RECHERCHE ET FILTRES
  // ============================================

  search(term: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(
      `${this.url}/search?term=${encodeURIComponent(term)}`
    );
  }

  getByDepartement(departementId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/departement/${departementId}`);
  }

  getByPoste(posteId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/poste/${posteId}`);
  }

  getByStatut(statut: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/statut/${statut}`);
  }

  // ============================================
  // SÉCURITÉ
  // ============================================

  changePassword(id: string, data: { ancienMotDePasse: string; nouveauMotDePasse: string }): Observable<any> {
    return this.http.post(`${this.url}/${id}/change-password`, data);
  }

  getPhoto(id: string): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/photo`, { responseType: 'blob' });
  }

  uploadPhoto(id: string, formData: FormData): Observable<Employee> {
    return this.http.post<Employee>(`${this.url}/${id}/photo`, formData);
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  getStats(id: string): Observable<any> {
    return this.http.get(`${this.url}/${id}/stats`);
  }

  /**
   * Récupère l'historique d'un employé (liste des événements)
   */
  getHistory(id: string): Observable<any> {
    return this.http.get<any>(`${this.url}/${id}/history`);
  }

  /**
   * Télécharge l'historique d'un employé au format CSV ou PDF
   * @param employeeId - ID de l'employé
   * @param format - 'csv' ou 'pdf'
   */
  downloadHistory(employeeId: string, format: 'csv' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.url}/${employeeId}/history/download?format=${format}`, {
      responseType: 'blob'
    });
  }

  // ============================================
  // GESTION DES DOCUMENTS
  // ============================================

  getEmployeeDocuments(employeeId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.url}/${employeeId}/documents`);
  }

  getEmployeeContracts(employeeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/${employeeId}/contracts`);
  }

  uploadEmployeeDocument(
    employeeId: string,
    file: File,
    name: string,
    typeDocument: string
  ): Observable<Document> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('typeDocument', typeDocument);
    formData.append('files', file);

    return this.http.post<Document>(
      `${this.docUrl}/pieces/employe/${employeeId}/upload`,
      formData
    );
  }

  uploadEmployeeDocuments(
    employeeId: string,
    files: File[],
    typeDocument: string
  ): Observable<Document[]> {
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('typeDocument', typeDocument);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<Document[]>(
      `${this.docUrl}/pieces/upload-multiple`,
      formData
    );
  }

  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.docUrl}/pieces/${documentId}/file`, {
      responseType: 'blob'
    });
  }

  deleteDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.docUrl}/pieces/${documentId}`);
  }

  getEmployeeDocumentUrls(employeeId: string): Observable<{url: string, name: string}[]> {
    return this.http.get<{url: string, name: string}[]>(
      `${this.docUrl}/pieces/employe/${employeeId}/urls`
    );
  }

  uploadContractDocument(
    contratId: string,
    file: File,
    name: string,
    typeDocument: string
  ): Observable<Document> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('typeDocument', typeDocument);
    formData.append('files', file);

    return this.http.post<Document>(
      `${this.docUrl}/pieces/contrat/${contratId}/upload`,
      formData
    );
  }
}