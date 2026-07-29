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

  constructor(private http: HttpClient) {}

  // ============================================
  // 👤 GESTION DES EMPLOYÉS (CRUD)
  // ============================================

  /**
   * Récupère tous les employés
   */
  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.url);
  }

  /**
   * Récupère un employé par son ID
   */
  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/${id}`);
  }

  /**
   * ✅ Récupère un employé par son ID utilisateur
   */
  getByUserId(userId: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/user/${userId}`);
  }

  /**
   * ✅ Récupère un employé par son matricule interne
   */
  findByMatricule(matricule: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/matricule/${matricule}`);
  }

  /**
   * ✅ Récupère l'employé connecté via le token (méthode pratique)
   */
  getCurrentEmployee(): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/me`);
  }

  /**
   * Crée un nouvel employé (avec fichiers)
   */
  create(data: FormData): Observable<Employee> {
    return this.http.post<Employee>(this.url, data);
  }

  /**
   * Met à jour un employé (générique)
   */
  update(id: string, data: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.url}/${id}`, data);
  }

  /**
   * Met à jour un employé par un admin (tous les champs)
   */
  updateByAdmin(id: string, data: any): Observable<Employee> {
    return this.http.patch<Employee>(`${this.url}/${id}/admin`, data);
  }

  /**
   * Met à jour le profil d'un employé (lui-même - champs limités)
   */
  updateSelfProfile(id: string, data: { telephone: string; addresse: string }): Observable<Employee> {
    return this.http.patch<Employee>(`${this.url}/${id}/profile`, data);
  }

  /**
   * Supprime un employé
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ============================================
  // 🔄 ACTIONS STATUT
  // ============================================

  /**
   * Suspend un employé
   */
  suspendre(id: string): Observable<Employee> {
    return this.http.post<Employee>(`${this.url}/${id}/suspendre`, {});
  }

  /**
   * Réactive un employé suspendu
   */
  reactiver(id: string): Observable<Employee> {
    return this.http.post<Employee>(`${this.url}/${id}/reactiver`, {});
  }

  // ============================================
  // 🔍 RECHERCHE ET FILTRES
  // ============================================

  /**
   * Recherche des employés par terme
   */
  search(term: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(
      `${this.url}/search?term=${encodeURIComponent(term)}`
    );
  }

  /**
   * Récupère les employés par département
   */
  getByDepartement(departementId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/departement/${departementId}`);
  }

  /**
   * Récupère les employés par poste
   */
  getByPoste(posteId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/poste/${posteId}`);
  }

  /**
   * Récupère les employés par statut
   */
  getByStatut(statut: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.url}/statut/${statut}`);
  }

  // ============================================
  // 🔐 SÉCURITÉ
  // ============================================

  /**
   * Change le mot de passe d'un employé
   */
  changePassword(id: string, data: { ancienMotDePasse: string; nouveauMotDePasse: string }): Observable<any> {
    return this.http.post(`${this.url}/${id}/change-password`, data);
  }

  /**
   * Récupère la photo de profil
   */
  getPhoto(id: string): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/photo`, { responseType: 'blob' });
  }

  /**
   * Upload la photo de profil
   */
  uploadPhoto(id: string, formData: FormData): Observable<Employee> {
    return this.http.post<Employee>(`${this.url}/${id}/photo`, formData);
  }

  // ============================================
  // 📊 STATISTIQUES
  // ============================================

  /**
   * Récupère les statistiques d'un employé
   */
  getStats(id: string): Observable<any> {
    return this.http.get(`${this.url}/${id}/stats`);
  }

  /**
   * Récupère l'historique d'un employé
   */
  getHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/${id}/history`);
  }

  // ============================================
  // 📄 GESTION DES DOCUMENTS
  // ============================================

  /**
   * Récupère les documents d'un employé
   */
  getEmployeeDocuments(employeeId: string): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.url}/${employeeId}/documents`);
  }

  /**
   * Récupère les contrats d'un employé
   */
  getEmployeeContracts(employeeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/${employeeId}/contracts`);
  }

  /**
   * Upload un document pour un employé
   */
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

  /**
   * Upload multiples documents pour un employé
   */
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

  /**
   * Télécharger un document
   */
  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.docUrl}/pieces/${documentId}/file`, {
      responseType: 'blob'
    });
  }

  /**
   * Supprimer un document
   */
  deleteDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.docUrl}/pieces/${documentId}`);
  }

  /**
   * Récupérer les URLs des documents d'un employé
   */
  getEmployeeDocumentUrls(employeeId: string): Observable<{url: string, name: string}[]> {
    return this.http.get<{url: string, name: string}[]>(
      `${this.docUrl}/pieces/employe/${employeeId}/urls`
    );
  }

  /**
   * Upload document pour un contrat
   */
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