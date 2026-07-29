import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-panel">
      <h4>Alertes</h4>
      @if (alerts.length === 0) {
        <p class="empty">Aucune alerte</p>
      } @else {
        <div class="alerts-list">
          @for (alert of alerts; track alert.type) {
            <div class="alert-item" [class]="'severity-' + alert.severity.toLowerCase()">
              <span class="material-symbols-outlined icon">
                {{ getIconForSeverity(alert.severity) }}
              </span>
              <div class="content">
                <p class="message">{{ alert.message }}</p>
                <span class="type">{{ alert.type }}</span>
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
    }
    .alert-panel h4 {
      font-weight: 600;
      margin-bottom: 1rem;
      color: #161d1f;
    }
    .empty {
      color: #6c797b;
      font-size: 0.9rem;
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
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: #f8fafc;
      border-left: 4px solid;
    }
    .alert-item .icon {
      font-size: 1.5rem;
    }
    .alert-item .content {
      flex: 1;
    }
    .alert-item .message {
      font-weight: 500;
      margin: 0;
      font-size: 0.9rem;
    }
    .alert-item .type {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #6c797b;
      letter-spacing: 0.05em;
    }
    .severity-info { border-left-color: #006972; }
    .severity-info .icon { color: #006972; }
    .severity-warning { border-left-color: #f59e0b; }
    .severity-warning .icon { color: #f59e0b; }
    .severity-critical { border-left-color: #ba1a1a; }
    .severity-critical .icon { color: #ba1a1a; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertPanelComponent {
  @Input({ required: true }) alerts: any[] = [];

  getIconForSeverity(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'notifications';
    }
  }
}