import { Component, Input, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recent-activities',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="activities">
      <div class="header">
        <h4>Activités récentes</h4>
        <button class="view-all-btn" (click)="toggleShowAll()">
          {{ showAll() ? 'Voir moins' : 'Voir tout' }}
        </button>
      </div>
      @if (activities.length === 0) {
        <p class="empty">Aucune activité récente</p>
      } @else {
        <div class="timeline">
          @for (activity of displayedActivities(); track activity.date) {
            <div class="item">
              <div class="dot" [class]="getDotClass(activity.type)"></div>
              <div class="content">
                <p class="description">{{ activity.description }}</p>
                <p class="employee">{{ activity.employeeName }}</p>
                <span class="date">{{ activity.date | date:'short' }}</span>
              </div>
            </div>
          }
        </div>
        @if (activities.length > 5 && !showAll()) {
          <div class="show-more-hint">
            <span>{{ activities.length - 5 }} activité{{ activities.length - 5 > 1 ? 's' : '' }} supplémentaire{{ activities.length - 5 > 1 ? 's' : '' }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .activities {
      background: #ffffff;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.03);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .header h4 {
      font-weight: 600;
      color: #161d1f;
      margin: 0;
    }
    .view-all-btn {
      background: none;
      border: none;
      color: #006972;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 12px;
      border-radius: 6px;
      transition: all 0.2s ease;
      text-decoration: none;
      
      &:hover {
        background: rgba(0, 105, 114, 0.08);
        color: #004d54;
      }
      
      &:active {
        transform: scale(0.95);
      }
    }
    .empty {
      color: #6c797b;
      font-size: 0.9rem;
      text-align: center;
      padding: 1rem 0;
    }
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .item {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 4px 0;
      border-bottom: 1px solid rgba(0,0,0,0.03);
      
      &:last-child {
        border-bottom: none;
      }
    }
    .dot {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 0.25rem;
      border: 2px solid white;
      box-shadow: 0 0 0 1px #e2e8f0;
    }
    .dot.primary { background: #006972; }
    .dot.tertiary { background: #006d37; }
    .dot.primary-container { background: #18b8c8; }
    .dot.secondary { background: #5c5f60; }
    .dot.error { background: #ba1a1a; }

    .content {
      flex: 1;
      min-width: 0;
    }
    .description {
      font-weight: 500;
      margin: 0;
      color: #161d1f;
    }
    .employee {
      font-size: 0.85rem;
      color: #6c797b;
      margin: 0.1rem 0 0.25rem 0;
    }
    .date {
      font-size: 0.7rem;
      color: #6c797b;
    }
    .show-more-hint {
      text-align: center;
      padding: 0.75rem 0 0.25rem 0;
      font-size: 0.8rem;
      color: #6c797b;
      border-top: 1px dashed rgba(0,0,0,0.06);
      margin-top: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentActivitiesComponent {
  @Input({ required: true }) activities: any[] = [];
  
  // Signal pour contrôler l'affichage de toutes les activités
  private showAllSignal = signal(false);
  
  // Computed pour afficher les activités en fonction de l'état
  displayedActivities = computed(() => {
    if (this.showAllSignal()) {
      return this.activities;
    }
    return this.activities.slice(0, 5);
  });
  
  // Getter pour le template
  showAll = computed(() => this.showAllSignal());

  /**
   * Bascule entre l'affichage des 5 premières activités et toutes les activités
   */
  toggleShowAll(): void {
    this.showAllSignal.update(value => !value);
  }

  /**
   * Récupère la classe CSS pour le point en fonction du type d'activité
   */
  getDotClass(type: string): string {
    const map: Record<string, string> = {
      'CONGÉ': 'primary',
      'CONTRAT': 'tertiary',
      'EMBAUCHE': 'primary-container',
      'DÉPART': 'error',
      'PROMOTION': 'primary-container',
      'FORMATION': 'secondary',
      'ABSENCE': 'secondary',
      'RETARD': 'error',
      'default': 'secondary',
    };
    return map[type] || map['default'];
  }
}