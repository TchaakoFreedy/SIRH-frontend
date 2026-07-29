import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <h2>Admin Dashboard</h2>
      <p>Prototype en cours d’implémentation.</p>
    </div>
  `,
  styles: [
    `
      .card { margin: 24px; }
      h2 { margin: 0 0 8px; }
      p { margin: 0; color: #666; }
    `
  ]
})
export class AdminDashboardComponent {}

