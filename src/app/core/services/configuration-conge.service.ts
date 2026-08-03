import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigurationConge } from '../models/configuration-conge.model';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationCongeService {
  private apiUrl = `${environment.apiUrl}/configurations/conges`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Créer une configuration
  create(config: ConfigurationConge): Observable<ConfigurationConge> {
    return this.http.post<ConfigurationConge>(this.apiUrl, config, { headers: this.getHeaders() });
  }

  // Récupérer toutes les configurations
  getAll(): Observable<ConfigurationConge[]> {
    return this.http.get<ConfigurationConge[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Récupérer une configuration par ID
  getById(id: string): Observable<ConfigurationConge> {
    return this.http.get<ConfigurationConge>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Récupérer la configuration globale
  getGlobal(): Observable<ConfigurationConge> {
    return this.http.get<ConfigurationConge>(`${this.apiUrl}/global`, { headers: this.getHeaders() });
  }

  // Récupérer la configuration pour un employé (spécifique ou globale)
  getForEmployee(employeeId: string): Observable<ConfigurationConge> {
    return this.http.get<ConfigurationConge>(`${this.apiUrl}/employee/${employeeId}`, { headers: this.getHeaders() });
  }

  /**
   * ✅ Récupère ou crée une configuration individuelle pour un employé
   * Utilise le nouvel endpoint /employee/{employeeId}/individual
   */
  getOrCreateIndividual(employeeId: string): Observable<ConfigurationConge> {
    return this.http.get<ConfigurationConge>(`${this.apiUrl}/employee/${employeeId}/individual`, { headers: this.getHeaders() });
  }

  /**
   * ✅ Met à jour une configuration individuelle
   * Utilise le nouvel endpoint /individual/{id}
   */
  updateIndividual(id: string, config: ConfigurationConge): Observable<ConfigurationConge> {
    return this.http.put<ConfigurationConge>(`${this.apiUrl}/individual/${id}`, config, { headers: this.getHeaders() });
  }

  // Mettre à jour une configuration (générique)
  update(id: string, config: ConfigurationConge): Observable<ConfigurationConge> {
    return this.http.put<ConfigurationConge>(`${this.apiUrl}/${id}`, config, { headers: this.getHeaders() });
  }

  // Supprimer une configuration
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}