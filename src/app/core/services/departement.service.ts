import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Departement } from '../models/departement.model';

@Injectable({ providedIn: 'root' })
export class DepartementService {
  private url = `${environment.apiUrl}/departements`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Departement[]> {
    return this.http.get<Departement[]>(this.url);
  }

  getById(id: string): Observable<Departement> {
    return this.http.get<Departement>(`${this.url}/${id}`);
  }

  getByEntreprise(entrepriseId: string): Observable<Departement[]> {
    return this.http.get<Departement[]>(`${this.url}/entreprise/${entrepriseId}`);
  }

  create(data: Partial<Departement>): Observable<Departement> {
    return this.http.post<Departement>(this.url, data);
  }

  update(id: string, data: Partial<Departement>): Observable<Departement> {
    return this.http.put<Departement>(`${this.url}/${id}`, data);
  }

  suspendre(id: string): Observable<Departement> {
    return this.http.put<Departement>(`${this.url}/${id}/suspendre`, {});
  }

  reactiver(id: string): Observable<Departement> {
    return this.http.put<Departement>(`${this.url}/${id}/reactiver`, {});
  }
}
