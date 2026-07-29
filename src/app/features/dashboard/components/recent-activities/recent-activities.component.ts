import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recent-activities',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="activities">
      <div class="header">
        <h4>Activités récentes</h4>
        <a href="#">Voir tout</a>
      </div>
      @if (activities.length === 0) {
        <p class="empty">Aucune activité récente</p>
      } @else {
        <div class="timeline">
          @for (activity of activities; track activity.date) {
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
    }
    .header a {
      color: #006972;
      font-size: 0.85rem;
      text-decoration: none;
    }
    .empty {
      color: #6c797b;
      font-size: 0.9rem;
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
    }
    .description {
      font-weight: 500;
      margin: 0;
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentActivitiesComponent {
  @Input({ required: true }) activities: any[] = [];

  getDotClass(type: string): string {
    const map: Record<string, string> = {
      'CONGÉ': 'primary',
      'CONTRAT': 'tertiary',
      'EMBAUCHE': 'primary-container',
      'default': 'secondary',
    };
    return map[type] || map['default'];
  }
}