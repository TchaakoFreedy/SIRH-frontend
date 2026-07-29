// src/app/features/notifications/notifications.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Les composants standalone sont importés, pas déclarés
import { NotificationListComponent } from './components/notification-list/notification-list.component';
import { NotificationIconComponent } from './components/notification-icon/notification-icon.component';
import { NotificationsPageComponent } from './pages/notifications-page/notifications-page.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    // Import des composants standalone
    NotificationListComponent,
    NotificationIconComponent,
    NotificationsPageComponent
  ],
  exports: [
    NotificationIconComponent,
    NotificationListComponent
  ]
})
export class NotificationsModule { }