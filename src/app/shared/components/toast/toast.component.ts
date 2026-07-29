import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastMessage } from '../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 9999">
      <div *ngFor="let toast of toasts" class="toast show" role="alert">
        <div class="toast-header" [ngClass]="'bg-' + getColor(toast.type)">
          <i class="material-icons me-2">{{ getIcon(toast.type) }}</i>
          <strong class="me-auto">{{ toast.type | uppercase }}</strong>
          <small>{{ getCurrentTime() }}</small>
          <button type="button" class="btn-close" (click)="remove(toast.id)"></button>
        </div>
        <div class="toast-body">{{ toast.message }}</div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container { max-width: 350px; }
    .toast { margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; overflow: hidden; }
    .toast-header { color: white; }
    .toast-header .material-icons { font-size: 20px; }
    .bg-success { background: #28a745; }
    .bg-danger { background: #dc3545; }
    .bg-warning { background: #ffc107; color: #333; }
    .bg-info { background: #17a2b8; }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.toast$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toast => {
        if (toast.id && toast.message) {
          this.toasts.push(toast);
          setTimeout(() => this.remove(toast.id), 5000);
        } else {
          this.toasts = this.toasts.filter(t => t.id !== toast.id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  remove(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getColor(type: string): string { return type; }
  getIcon(type: string): string {
    return { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' }[type] || 'info';
  }
  getCurrentTime(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}