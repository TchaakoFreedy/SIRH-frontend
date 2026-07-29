import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="header">
      <div>
        <h1>Bonjour, {{ userName }}</h1>
        <p class="subtitle">Tableau de bord {{ roleLabel }}</p>
      </div>
      
    </div>
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: #161d1f;
      margin: 0;
    }
    .subtitle {
      color: #6c797b;
      margin: 0.25rem 0 0 0;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid #bbc9cb;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-outline:hover {
      background: #f1f5f9;
    }
    .btn-primary {
      background: #006972;
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-primary:hover {
      opacity: 0.9;
    }
    .material-symbols-outlined {
      font-size: 1.2rem;
    }
    @media (max-width: 640px) {
      .header {
        flex-direction: column;
        align-items: stretch;
      }
      .actions {
        flex-wrap: wrap;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHeaderComponent {
  @Input({ required: true }) userName!: string;
  @Input({ required: true }) userRole!: string;

  get roleLabel(): string {
    const map: Record<string, string> = {
      'RH': 'Ressources Humaines',
      'TOP_MANAGER': 'Top Management',
      'DIRECTION': 'Direction',
      'MANAGER': 'Manager',
      'EMPLOYEE': 'Employé',
    };
    return map[this.userRole] || this.userRole;
  }
}