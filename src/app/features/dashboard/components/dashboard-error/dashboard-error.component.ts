import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container">
      <span class="material-symbols-outlined">error</span>
      <h3>Oops !</h3>
      <p>{{ message }}</p>
      <button (click)="retry.emit()">
        <span class="material-symbols-outlined">refresh</span>
        Réessayer
      </button>
    </div>
  `,
  styles: [`
    .error-container {
      text-align: center;
      padding: 3rem 1.5rem;
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .error-container .material-symbols-outlined {
      font-size: 3rem;
      color: #ba1a1a;
    }
    .error-container h3 {
      font-size: 1.25rem;
      margin: 0.5rem 0;
      color: #161d1f;
    }
    .error-container p {
      color: #6c797b;
      margin: 0.5rem 0 1.5rem 0;
    }
    .error-container button {
      background: #006972;
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 0.5rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .error-container button:hover {
      opacity: 0.9;
    }
  `],
})
export class DashboardErrorComponent {
  @Input({ required: true }) message!: string;
  @Output() retry = new EventEmitter<void>();
}