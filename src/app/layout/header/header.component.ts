import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../services/auth.service';
import { UserService, User } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../core/models/notification.model';

interface DisplayUser {
  nom: string;
  email: string;
  role: string;
  roleLabel: string;
  initiales: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatBadgeModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  
  // ===== États =====
  searchQuery = signal<string>('');
  showNotifications = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isLoadingNotif = signal<boolean>(false);
  
  // ===== Données Utilisateur =====
  userProfile = signal<User | null>(null);
  private subscriptions = new Subscription();
  
  // ===== Notifications =====
  private notificationsSignal = signal<AppNotification[]>([]);
  
  // ===== Computed =====
  unreadCount = computed(() => {
    return this.notificationsSignal().filter(n => !n.read).length;
  });

  notifications = computed(() => {
    return this.notificationsSignal();
  });

  currentUser = computed<DisplayUser>(() => {
    const user = this.userProfile();
    const authUser = this.authService.getCurrentUser();
    
    if (!user && !authUser) {
      return {
        nom: 'Utilisateur',
        email: 'utilisateur@sirh.com',
        role: 'EMPLOYE',
        roleLabel: 'Employé',
        initiales: 'UT'
      };
    }
    
    let roleName = 'EMPLOYE';
    let roleLabel = 'Employé';
    
    if (user?.role?.name) {
      roleName = user.role.name;
      roleLabel = this.formatRoleLabel(roleName);
    } else if (user?.roleId) {
      roleName = user.roleId;
      roleLabel = this.formatRoleLabel(roleName);
    } else if (authUser?.role) {
      roleName = authUser.role;
      roleLabel = this.formatRoleLabel(roleName);
    } else if (authUser?.roles && authUser.roles.length > 0) {
      roleName = authUser.roles[0];
      roleLabel = this.formatRoleLabel(roleName);
    } else if (authUser?.roleId) {
      roleName = authUser.roleId;
      roleLabel = this.formatRoleLabel(roleName);
    }
    
    let fullName = '';
    let email = '';
    let initiales = 'UT';
    
    if (user) {
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      fullName = `${firstName} ${lastName}`.trim() || user.email || 'Utilisateur';
      email = user.email || '';
      initiales = this.generateInitials(fullName);
    } else if (authUser) {
      fullName = authUser.firstName || authUser.username || 'Utilisateur';
      email = authUser.email || '';
      initiales = this.generateInitials(fullName);
    }
    
    return {
      nom: fullName,
      email: email,
      role: roleName,
      roleLabel: roleLabel,
      initiales: initiales
    };
  });

  ngOnInit(): void {
    this.trackCurrentUser();
    
    // ✅ Charger les non lues au démarrage
    this.loadNotifications();

    // Écouter les changements du compteur sans recharger la liste
    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(() => {
        // Le compteur est mis à jour automatiquement ; on ne recharge pas la liste
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private trackCurrentUser(): void {
    this.isLoading.set(true);

    const storedUser = this.userService.getCurrentUser();
    if (storedUser) {
      this.userProfile.set(storedUser);
      this.isLoading.set(false);
    }

    const authSub = this.authService.currentUser$.subscribe({
      next: (authUser: AuthUser | null) => {
        if (authUser?.id) {
          this.userService.getUser(authUser.id).subscribe({
            next: (user: User) => {
              this.userProfile.set(user);
              this.isLoading.set(false);
            },
            error: () => {
              if (authUser) {
                const fallbackUser: User = {
                  id: authUser.id || '',
                  firstName: authUser.firstName || authUser.username || '',
                  lastName: authUser.lastName || '',
                  email: authUser.email || '',
                  active: authUser.active !== undefined ? authUser.active : true,
                  roleId: authUser.roleId || authUser.role || authUser.roles?.[0] || '',
                  loginAttempts: 0,
                  locked: false,
                  createdAt: '',
                  createdBy: '',
                  employeeId: authUser.employeeId
                };
                this.userProfile.set(fallbackUser);
              }
              this.isLoading.set(false);
            }
          });
        } else {
          const storedUserFallback = this.userService.getCurrentUser();
          if (storedUserFallback) {
            this.userProfile.set(storedUserFallback);
          }
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    this.subscriptions.add(authSub);
  }

  // ✅ Charger uniquement les notifications non lues pour le dropdown
  loadNotifications(): void {
    if (this.isLoadingNotif()) return;
    this.isLoadingNotif.set(true);
    
    this.notificationService.getUnreadNotifications(0, 50).subscribe({
      next: (response) => {
        this.notificationsSignal.set(response.content);
        this.isLoadingNotif.set(false);
        // Ne pas appeler refreshUnreadCount ici pour éviter la boucle
      },
      error: () => {
        this.isLoadingNotif.set(false);
      }
    });
  }

  private formatRoleLabel(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      'SUPER_ADMIN': 'Administrateur',
      'RH': 'Ressources Humaines',
      'MANAGER': 'Manager',
      'EMPLOYE': 'Employé',
      'EMPLOY': 'Employé',
      'DIRECTION': 'Direction',
      'TOP_MANAGER': 'Top Management'
    };
    return roleMap[roleName] || roleName || 'Employé';
  }

  private generateInitials(name: string): string {
    if (!name) return 'UT';
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'UT';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  goToProfile(): void {
    this.router.navigate(['/app/mon-espace/profil']);
    this.closeDropdowns();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
    this.closeDropdowns();
  }

  goToHelp(): void {
    this.router.navigate(['/help']);
    this.closeDropdowns();
  }

  goToDashboard(): void {
    this.router.navigate(['/app/dashboard']);
    this.closeDropdowns();
  }

  logout(): void {
    this.authService.logout();
    this.closeDropdowns();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    if (input.value.length > 2) {
      this.router.navigate(['/search'], { queryParams: { q: input.value } });
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  toggleNotifications(): void {
    this.showNotifications.update(val => !val);
    if (this.showNotifications()) {
      this.loadNotifications(); // Recharge les non lues à l'ouverture
      this.notificationService.refreshUnreadCount();
    }
  }

  markAsRead(notif: AppNotification): void {
    if (!notif.read) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          // Retirer la notification de la liste (puisqu'elle n'est plus non lue)
          this.notificationsSignal.update(notifs =>
            notifs.filter(n => n.id !== notif.id)
          );
          this.notificationService.refreshUnreadCount();
        },
        error: (error) => console.error('Erreur marquage lu:', error)
      });
    }
    
    if (notif.actionUrl) {
      this.router.navigate([notif.actionUrl]);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Vider la liste (toutes les notifications sont lues)
        this.notificationsSignal.set([]);
        this.notificationService.refreshUnreadCount();
        this.closeDropdowns();
      },
      error: (error) => console.error('Erreur marquage tout lu:', error)
    });
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notificationsSignal.update(notifs =>
          notifs.filter(n => n.id !== notificationId)
        );
        this.notificationService.refreshUnreadCount();
      },
      error: (error) => console.error('Erreur suppression:', error)
    });
  }

  getNotifColor(type: string): string {
    const colors = {
      'INFO': '#3b82f6',
      'SUCCESS': '#22c55e',
      'WARNING': '#f59e0b',
      'ERROR': '#ef4444'
    };
    return colors[type as keyof typeof colors] || colors.INFO;
  }

  getTimeAgo(date: string): string {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days < 30) return `Il y a ${days} j`;
    return d.toLocaleDateString('fr-FR');
  }

  closeDropdowns(): void {
    this.showNotifications.set(false);
  }

  getInitials(): string {
    return this.currentUser().initiales;
  }

  getFullName(): string {
    return this.currentUser().nom;
  }

  getEmail(): string {
    return this.currentUser().email;
  }

  getRole(): string {
    return this.currentUser().roleLabel;
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}