// src/app/app.component.ts
import { Component, OnInit, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './shared/components/toast/toast.component';
import { NotificationService } from './core/services/notification.service';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    ToastComponent,
    HeaderComponent,
    SidebarComponent,
    MatIconModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isMobile = signal(false);
  sidebarOpen = signal(false);

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.notificationService.startPolling(30000);
    this.checkScreen();
  }

  @HostListener('window:resize')
  checkScreen(): void {
    const width = window.innerWidth;
    const mobile = width < 1024;
    this.isMobile.set(mobile);
    
    // ✅ Fermer la sidebar automatiquement quand on passe en desktop
    if (!mobile) {
      this.sidebarOpen.set(false);
    }
  }

  // ✅ Méthode pour toggle la sidebar
  toggleSidebar(): void {
    console.log('🔄 Toggle sidebar appelé !', this.sidebarOpen());
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    console.log('❌ Fermeture sidebar');
    this.sidebarOpen.set(false);
  }

  onCollapseChange(collapsed: boolean): void {
    // Gérer le changement de taille de la sidebar sur desktop
  }

  logout(): void {
    this.authService.logout();
  }
}