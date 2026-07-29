// src/app/core/services/contrat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Contrat, 
  CreateContratRequest, 
  UpdateContratRequest, 
  RenouvellementContratRequest, 
  StatistiquesContrat 
} from '../models/contrat.model';


@Injectable({
  providedIn: 'root'
})
export class ContratService {
  private baseUrl = `${environment.apiUrl}/contrats`;


  constructor(private http: HttpClient) {}

  // ===== CRUD =====
  
  // Méthode pour créer un contrat avec des images
  createContratWithImages(formData: FormData): Observable<Contrat> {
    // ContratController attend POST /api/contrats/ (création) OU endpoint spécifique.
    // Ton erreur 404 montre que /api/contrats n'existe pas côté backend pour ce payload.
    // Ici on aligne avec l'endpoint déjà utilisé pour la création simple.
    return this.http.post<Contrat>(this.baseUrl, formData);
  }


  // Méthode pour créer un contrat sans images
  create(request: CreateContratRequest): Observable<Contrat> {
    return this.http.post<Contrat>(this.baseUrl, request);
  }

  update(id: string, request: UpdateContratRequest): Observable<Contrat> {
    return this.http.put<Contrat>(`${this.baseUrl}/${id}`, request);
  }

  archiver(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/archiver`, {});
  }

  resilier(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/resilier`, {});
  }

  renouveler(request: RenouvellementContratRequest): Observable<Contrat> {
    return this.http.post<Contrat>(`${this.baseUrl}/renouveler`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ===== GESTION DES IMAGES =====
  uploadContratImages(contratId: string, files: File[]): Observable<Contrat> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    return this.http.post<Contrat>(`${this.baseUrl}/${contratId}/images`, formData);
  }

  getContratImages(contratId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${contratId}/images`);
  }

  downloadContratImage(contratId: string, index: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${contratId}/download`, {
      params: { index: index.toString() },
      responseType: 'blob'
    });
  }

  viewContratImage(contratId: string, index: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${contratId}/view`, {
      params: { index: index.toString() },
      responseType: 'blob'
    });
  }

  deleteContratImage(contratId: string, index: number): Observable<Contrat> {
    return this.http.delete<Contrat>(`${this.baseUrl}/${contratId}/images/${index}`);
  }

  // ===== LECTURES =====
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

  getActifs(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/actifs`);
  }

  getExpires(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/expires`);
  }

  getExpirant(days?: number): Observable<Contrat[]> {
    const params = days ? `?days=${days}` : '';
    return this.http.get<Contrat[]>(`${this.baseUrl}/expirant${params}`);
  }

  getRecents(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/recents`);
  }

  search(term: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${this.baseUrl}/search?term=${term}`);
  }

  getStatistiques(): Observable<StatistiquesContrat> {
    return this.http.get<StatistiquesContrat>(`${this.baseUrl}/statistiques`);
  }
}