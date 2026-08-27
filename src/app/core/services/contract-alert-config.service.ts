// src/app/core/services/contract-alert-config.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ContractAlertConfig,
  UpdateContractAlertConfigRequest
} from '../models/contrat.model';

@Injectable({ providedIn: 'root' })
export class ContractAlertConfigService {
  private baseUrl = `${environment.apiUrl}/contract-alert-configs`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la configuration globale des alertes de contrat.
   * Le backend doit retourner une configuration unique (sans companyId).
   */
  getConfig(): Observable<ContractAlertConfig> {
    return this.http.get<ContractAlertConfig>(`${this.baseUrl}/global`);
  }

  /**
   * Met à jour la configuration globale des alertes de contrat.
   */
  updateConfig(request: UpdateContractAlertConfigRequest): Observable<ContractAlertConfig> {
    return this.http.put<ContractAlertConfig>(`${this.baseUrl}/global`, request);
  }
}