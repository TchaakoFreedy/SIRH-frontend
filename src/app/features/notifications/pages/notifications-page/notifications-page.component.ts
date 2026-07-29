import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppNotification, NotificationFilter, NotificationEvent, NotificationType, NotificationPriority } from '../../../../core/models/notification.model';
import { NotificationListComponent } from '../../components/notification-list/notification-list.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationListComponent],
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss']
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  loading = false;
  error: string | null = null;
  filter: NotificationFilter = {};
  selectedTab: 'all' | 'unread' | 'read' = 'all';
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;

  eventOptions = Object.values(NotificationEvent);
  typeOptions = Object.values(NotificationType);
  priorityOptions = Object.values(NotificationPriority);

  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ loadNotifications construit le filtre en fonction de l'onglet sélectionné
  loadNotifications(page: number = 0): void {
    this.loading = true;
    this.error = null;

    // On copie les filtres existants (type, priorité, événement)
    const filter = { ...this.filter };

    // 🔥 On ajoute le filtre read en fonction de l'onglet
    if (this.selectedTab === 'unread') {
      filter.read = false;   // 🔥 Uniquement les non lues
    } else if (this.selectedTab === 'read') {
      filter.read = true;    // 🔥 Uniquement les lues
    } else {
      delete filter.read;    // 🔥 Toutes (pas de filtre read)
    }

    this.notificationService.getNotifications(filter, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.content;
          this.totalElements = response.totalElements;
          this.currentPage = response.pageNumber;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: () => {
          this.error = 'Erreur de chargement';
          this.loading = false;
        }
      });
  }

  // 🔔 Rafraîchit la page après une action dans la liste
  onRefreshRequested(): void {
    this.loadNotifications(this.currentPage);
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.loadNotifications(page);
    }
  }

  onFilterChange(): void {
    this.loadNotifications(0);
  }

  onTabChange(tab: 'all' | 'unread' | 'read'): void {
    this.selectedTab = tab;
    this.loadNotifications(0);
  }

  resetFilters(): void {
    this.filter = {};
    this.selectedTab = 'all';
    this.loadNotifications(0);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications(this.currentPage);
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => console.error(err)
    });
  }

  onNotificationClicked(notification: AppNotification): void {
    console.log('Notification cliquée:', notification);
  }

  getEventLabel(event: string): string { return this.notificationService.getEventLabel(event); }
  getPriorityLabel(priority: string): string { return this.notificationService.getPriorityLabel(priority); }
  getIconForType(type: string): string { return this.notificationService.getIconForType(type); }
  getColorForType(type: string): string { return this.notificationService.getColorForType(type); }
  formatDate(dateString: string): string { return this.notificationService.formatDate(dateString); }
}