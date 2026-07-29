import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppNotification, NotificationFilter, NotificationPageResponse } from '../../../../core/models/notification.model';
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit, OnDestroy {
  @Input() maxHeight: string = '500px';
  @Input() showActions: boolean = true;
  @Input() filterRead?: boolean; // ✅ Ce paramètre contrôle le filtre read
  @Input() limit?: number = 50;

  @Output() notificationRead = new EventEmitter<string>();
  @Output() notificationClicked = new EventEmitter<AppNotification>();
  @Output() refreshRequested = new EventEmitter<void>();

  notifications: AppNotification[] = [];
  loading = false;
  error: string | null = null;
  totalElements = 0;
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ La méthode loadNotifications utilise filterRead pour construire le filtre
  loadNotifications(page: number = 0): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    const filter: NotificationFilter = {};
    // 🔥 Si filterRead est défini (true ou false), on l'ajoute au filtre
    if (this.filterRead !== undefined) {
      filter.read = this.filterRead;
    }

    this.notificationService.getNotifications(filter, page, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: NotificationPageResponse) => {
          this.notifications = response.content;
          this.totalElements = response.totalElements;
          this.currentPage = response.pageNumber;
          this.totalPages = response.totalPages;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Erreur de chargement:', err);
          this.error = 'Erreur lors du chargement des notifications';
          this.cdr.detectChanges();
        }
      });
  }

  onMarkAsRead(notification: AppNotification): void {
    if (notification.read) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
        this.notificationRead.emit(notification.id);
        this.refreshRequested.emit(); // 🔔 Demande au parent de recharger
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur mark as read:', err)
    });
  }

  onDelete(notificationId: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Voulez-vous supprimer cette notification ?')) return;
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.totalElements--;
        this.refreshRequested.emit();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur suppression:', err)
    });
  }

  onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);
        this.refreshRequested.emit();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur mark all:', err)
    });
  }

  onDeleteAll(): void {
    if (!confirm('Voulez-vous supprimer toutes vos notifications ?')) return;
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications = [];
        this.totalElements = 0;
        this.refreshRequested.emit();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur delete all:', err)
    });
  }

  onNotificationClick(notification: AppNotification): void {
    if (!notification.read) this.onMarkAsRead(notification);
    this.notificationClicked.emit(notification);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.loadNotifications(page);
    }
  }

  getIconForType(type: string): string { return this.notificationService.getIconForType(type); }
  getColorForType(type: string): string { return this.notificationService.getColorForType(type); }
  getPriorityLabel(priority: string): string { return this.notificationService.getPriorityLabel(priority); }
  formatDate(dateString: string): string { return this.notificationService.formatDate(dateString); }
  getEventLabel(event: string): string { return this.notificationService.getEventLabel(event); }
  trackByFn(index: number, item: AppNotification): string { return item.id; }
}