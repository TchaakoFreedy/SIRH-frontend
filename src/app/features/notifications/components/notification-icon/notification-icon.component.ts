import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppNotification } from '../../../../core/models/notification.model';

@Component({
  selector: 'app-notification-icon',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-icon.component.html',
  styleUrls: ['./notification-icon.component.scss']
})
export class NotificationIconComponent implements OnInit, OnDestroy {
  unreadCount: number = 0;
  showDropdown: boolean = false;
  recentNotifications: AppNotification[] = [];

  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => this.unreadCount = count);
    this.notificationService.refreshUnreadCount();
    this.loadRecentNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRecentNotifications(): void {
    this.notificationService.getUnreadNotifications(0, 5).subscribe({
      next: (response) => this.recentNotifications = response.content,
      error: (err) => console.error('Erreur chargement récentes:', err)
    });
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.loadRecentNotifications();
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  markAsRead(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        this.loadRecentNotifications();
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => console.error(err)
    });
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.loadRecentNotifications();
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => console.error(err)
    });
  }

  getIconForType(type: string): string { return this.notificationService.getIconForType(type); }
  getColorForType(type: string): string { return this.notificationService.getColorForType(type); }
  formatDate(dateString: string): string { return this.notificationService.formatDate(dateString); }
}