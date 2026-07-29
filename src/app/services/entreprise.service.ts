// src/app/core/services/entreprise.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Entreprise } from '../core/models';

@Injectable({
  providedIn: 'root'
})
export class EntrepriseService {

  private apiUrl = `${environment.apiUrl}/entreprises`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Entreprise[]> {
    return this.http.get<Entreprise[]>(this.apiUrl);
  }

  getById(id: string): Observable<Entreprise> {
    return this.http.get<Entreprise>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Entreprise>): Observable<Entreprise> {
    return this.http.post<Entreprise>(this.apiUrl, data);
  }

  update(id: string, data: Partial<Entreprise>): Observable<Entreprise> {
    return this.http.put<Entreprise>(`${this.apiUrl}/${id}`, data);
  }

  suspendre(id: string): Observable<Entreprise> {
    return this.http.put<Entreprise>(`${this.apiUrl}/${id}/suspendre`, {});
  }

  reactiver(id: string): Observable<Entreprise> {
    return this.http.put<Entreprise>(`${this.apiUrl}/${id}/reactiver`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}