import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Alert {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: number; // Gardé pour compatibilité avec les anciennes alertes
  contractDetails?: {
    employeeName: string;
    contractType: string;
    startDate: string;
    endDate: string;
    status: string;
    daysRemaining: number;
  };
}

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-panel">
      <div class="panel-header">
        <h4>Alertes</h4>
        <span class="badge" *ngIf="alerts.length > 0">{{ alerts.length }}</span>
      </div>

      @if (alerts.length === 0) {
        <div class="empty-state">
          <span class="material-symbols-outlined">check_circle</span>
          <p>Aucune alerte</p>
          <span class="sub-text">Tout est en ordre</span>
        </div>
      } @else {
        <div class="alerts-list">
          @for (alert of alerts; track alert.type) {
            <div class="alert-item" [class]="'severity-' + alert.severity.toLowerCase()">
              <span class="material-symbols-outlined icon">
                {{ getIconForSeverity(alert.severity) }}
              </span>
              <div class="content">
                <p class="message">{{ alert.message }}</p>

                <!-- Affichage des détails du contrat si présents -->
                @if (alert.contractDetails) {
                  <div class="contract-details">
                    <div class="contract-row">
                      <span class="label">Employé :</span>
                      <span class="value">{{ alert.contractDetails.employeeName }}</span>
                    </div>
                    <div class="contract-row">
                      <span class="label">Type de contrat :</span>
                      <span class="value">{{ alert.contractDetails.contractType }}</span>
                    </div>
                    <div class="contract-row">
                      <span class="label">Début :</span>
                      <span class="value">{{ alert.contractDetails.startDate | date }}</span>
                    </div>
                    <div class="contract-row">
                      <span class="label">Fin :</span>
                      <span class="value">{{ alert.contractDetails.endDate | date }}</span>
                    </div>
                    <div class="contract-row">
                      <span class="label">Statut :</span>
                      <span class="value">{{ alert.contractDetails.status }}</span>
                    </div>
                    <div class="contract-row highlight">
                      <span class="label">Jours restants :</span>
                      <span class="value days">{{ alert.contractDetails.daysRemaining }}</span>
                    </div>
                  </div>
                }

                <!-- Détails numériques génériques (legacy) -->
                @if (alert.details !== undefined && alert.details !== null && !alert.contractDetails) {
                  <div class="meta">
                    <span class="type">{{ alert.type }}</span>
                    <span class="details">{{ alert.details }} élément(s)</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .alert-panel {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.03);
      height: 500px;
      min-height: 200px;
      overflow-y: auto;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .panel-header h4 {
      font-weight: 600;
      margin: 0;
      color: #161d1f;
      font-size: 1rem;
    }

    .badge {
      background: #ba1a1a;
      color: white;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.15rem 0.6rem;
      border-radius: 1rem;
      min-width: 20px;
      text-align: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 0;
      color: #6c797b;
    }

    .empty-state .material-symbols-outlined {
      font-size: 3rem;
      color: #10b981;
    }

    .empty-state p {
      margin: 0.5rem 0 0.25rem;
      font-weight: 500;
    }

    .empty-state .sub-text {
      font-size: 0.8rem;
      color: #a0b3b2;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .alert-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      background: #f8fafc;
      border-left: 4px solid;
      transition: all 0.2s ease;
    }

    .alert-item:hover {
      transform: translateX(4px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .alert-item .icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .alert-item .content {
      flex: 1;
      min-width: 0;
    }

    .alert-item .message {
      font-weight: 500;
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
      color: #161d1f;
      line-height: 1.4;
    }

    .alert-item .meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    .alert-item .type {
      font-size: 0.65rem;
      text-transform: uppercase;
      color: #6c797b;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .alert-item .details {
      font-size: 0.7rem;
      color: #6c797b;
      background: #edf2f2;
      padding: 0.1rem 0.6rem;
      border-radius: 1rem;
    }

    /* --- Contract details styles --- */
    .contract-details {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.2rem 1rem;
      font-size: 0.85rem;
    }

    .contract-row {
      display: contents;
    }

    .contract-row .label {
      color: #6c797b;
      font-weight: 500;
    }

    .contract-row .value {
      color: #161d1f;
    }

    .contract-row.highlight .value.days {
      font-weight: 700;
      color: #006972;
      font-size: 1.1rem;
    }

    /* === SEVERITY STYLES === */
    .severity-info { 
      border-left-color: #006972; 
    }
    .severity-info .icon { 
      color: #006972; 
    }
    .severity-info .type {
      color: #006972;
    }

    .severity-warning { 
      border-left-color: #f59e0b; 
    }
    .severity-warning .icon { 
      color: #f59e0b; 
    }
    .severity-warning .type {
      color: #f59e0b;
    }

    .severity-critical { 
      border-left-color: #ba1a1a; 
    }
    .severity-critical .icon { 
      color: #ba1a1a; 
    }
    .severity-critical .type {
      color: #ba1a1a;
    }

    /* === RESPONSIVE === */
    @media (max-width: 768px) {
      .alert-panel {
        padding: 1rem;
        min-height: 150px;
      }

      .alert-item {
        padding: 0.6rem 0.8rem;
      }

      .alert-item .message {
        font-size: 0.8rem;
      }

      .contract-details {
        font-size: 0.75rem;
        gap: 0.1rem 0.5rem;
      }

      .contract-row.highlight .value.days {
        font-size: 0.95rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertPanelComponent {
  @Input({ required: true }) alerts: Alert[] = [];

  getIconForSeverity(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'notifications';
    }
  }
}