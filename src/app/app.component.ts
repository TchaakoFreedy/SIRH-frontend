// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { NotificationService } from './core/services/notification.service';
import { NotificationIconComponent } from './features/notifications/components/notification-icon/notification-icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, NotificationIconComponent],
  template: `
    <!-- Header avec icône de notification -->
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <a class="navbar-brand" routerLink="/">SIRH</a>
        <div class="ms-auto">
          <app-notification-icon></app-notification-icon>
        </div>
      </div>
    </nav>

    <!-- Contenu principal -->
    <div class="container-fluid mt-3">
      <router-outlet></router-outlet>
    </div>

    <!-- Toast pour les notifications système -->
    <app-toast></app-toast>
  `
})
export class AppComponent implements OnInit {
  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.startPolling(30000);
  }
}