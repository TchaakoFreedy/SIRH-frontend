// src/app/features/discipline/services/sanction.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Sanction, TypeSanction, StatutSanction } from '../models/sanction.model';
import { Page } from '../../../shared/models/page.model';

@Injectable({ providedIn: 'root' })
export class SanctionService {
  private baseUrl = `${environment.apiUrl}/discipline`;

  constructor(private http: HttpClient) {}

  getSanctions(params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<Sanction>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<Sanction>>(`${this.baseUrl}/sanctions`, { params: httpParams });
  }

  getSanctionById(id: string): Observable<Sanction> {
    return this.http.get<Sanction>(`${this.baseUrl}/sanctions/${id}`);
  }

  getSanctionsByEmployee(employeeId: string, params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<Sanction>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<Sanction>>(`${this.baseUrl}/sanctions/employee/${employeeId}`, { params: httpParams });
  }

  getMySanctions(params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<Page<Sanction>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<Page<Sanction>>(`${this.baseUrl}/sanctions/me`, { params: httpParams });
  }

  createSanction(data: Partial<Sanction>): Observable<Sanction> {
    return this.http.post<Sanction>(`${this.baseUrl}/sanctions`, data);
  }

  updateSanction(id: string, data: Partial<Sanction>): Observable<Sanction> {
    return this.http.put<Sanction>(`${this.baseUrl}/sanctions/${id}`, data);
  }

  liftSanction(id: string): Observable<Sanction> {
    return this.http.post<Sanction>(`${this.baseUrl}/sanctions/${id}/lift`, {});
  }

  deleteSanction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sanctions/${id}`);
  }

  getTypeLabel(type: TypeSanction): string {
    const labels: Record<TypeSanction, string> = {
      [TypeSanction.AVERTISSEMENT_VERBAL]: 'Avertissement verbal',
      [TypeSanction.AVERTISSEMENT_ECRIT]: 'Avertissement écrit',
      [TypeSanction.BLAME]: 'Blâme',
      [TypeSanction.MISE_A_PIED]: 'Mise à pied',
      [TypeSanction.SUSPENSION]: 'Suspension',
      [TypeSanction.MUTATION_DISCIPLINAIRE]: 'Mutation disciplinaire',
      [TypeSanction.LICENCIEMENT]: 'Licenciement',
      [TypeSanction.AUTRE]: 'Autre'
    };
    return labels[type] || type;
  }

  getStatutLabel(statut: StatutSanction): string {
    const labels: Record<StatutSanction, string> = {
      [StatutSanction.ACTIVE]: 'Active',
      [StatutSanction.TERMINEE]: 'Terminée',
      [StatutSanction.ANNULEE]: 'Annulée'
    };
    return labels[statut] || statut;
  }

  getStatutColor(statut: StatutSanction): string {
    const colors: Record<StatutSanction, string> = {
      [StatutSanction.ACTIVE]: 'danger',
      [StatutSanction.TERMINEE]: 'success',
      [StatutSanction.ANNULEE]: 'secondary'
    };
    return colors[statut] || 'secondary';
  }

  getTypeIcon(type: TypeSanction): string {
    const icons: Record<TypeSanction, string> = {
      [TypeSanction.AVERTISSEMENT_VERBAL]: 'chat',
      [TypeSanction.AVERTISSEMENT_ECRIT]: 'description',
      [TypeSanction.BLAME]: 'warning',
      [TypeSanction.MISE_A_PIED]: 'hourglass_empty',
      [TypeSanction.SUSPENSION]: 'pause_circle',
      [TypeSanction.MUTATION_DISCIPLINAIRE]: 'swap_horiz',
      [TypeSanction.LICENCIEMENT]: 'cancel',
      [TypeSanction.AUTRE]: 'more_horiz'
    };
    return icons[type] || 'help';
  }

  getTypeIconForDisplay(type: TypeSanction): string {
    return this.getTypeIcon(type);
  }
}