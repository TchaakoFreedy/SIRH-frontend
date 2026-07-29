import {
  Component,
  signal,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  inject,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavItem } from '../../core/models/nav-item.model';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLinkActive,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() collapseChange = new EventEmitter<boolean>();

  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  collapsed = signal(false);
  isMobile = signal(false);
  mobileOpen = signal(false);
  flyoutItem: NavItem | null = null;
  private flyoutTimer: ReturnType<typeof setTimeout> | null = null;

  visibleNavItems = signal<NavItem[]>([]);

  // ✅ Tous les éléments du menu avec leurs permissions requises
  private allNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/app/dashboard'
    },
    {
      label: 'Mon espace',
      icon: 'person',
      route: '/app/mon-espace/profil'
    },
    {
      label: 'Employés',
      icon: 'people',
      route: '/app/rh/employes',
      requiredPermission: 'EMPLOYEE_VIEW_ALL'
    },
    {
      label: 'Organisation',
      icon: 'account_tree',
      expanded: false,
      children: [
        { 
          label: 'Entreprises', 
          icon: 'business', 
          route: '/app/organisation/entreprises',
          requiredPermission: 'COMPANY_VIEW_ALL'
        },
        { 
          label: 'Départements', 
          icon: 'apartment', 
          route: '/app/organisation/departements',
          requiredPermission: 'DEPARTMENT_VIEW_ALL'
        },
        { 
          label: 'Postes', 
          icon: 'work_outline', 
          route: '/app/organisation/postes',
          requiredPermission: 'POSITION_VIEW_ALL'
        }
      ]
    },
    {
      label: 'Congés & Absences',
      icon: 'event_available',
      expanded: false,
      children: [
        {
          label: 'Mes demandes',
          icon: 'calendar_today',
          route: '/app/rh/conges',
          requiredPermission: 'LEAVE_VIEW_OWN'
        },
        {
          label: 'Nouvelle demande',
          icon: 'add_circle',
          route: '/app/rh/conges/demande',
          requiredPermission: 'LEAVE_CREATE'
        },
        {
          label: 'Gestion des demandes',
          icon: 'event_busy',
          route: '/app/conges/gestion-rh',
          requiredPermission: 'LEAVE_VIEW_ALL'
        },
        {
          label: 'Historique',
          icon: 'history',
          route: '/app/rh/conges/historique-conges',
          requiredPermission: 'LEAVE_VIEW_ALL'
        },
        {
          label: 'Configuration congés',
          icon: 'settings',
          route: '/app/rh/configuration-conge',
          requiredPermission: 'SYSTEM_ADMIN'
        }
      ]
    },
    {
      label: 'Documents',
      icon: 'description',
      expanded: false,
      children: [
        { 
          label: 'Certificat de travail', 
          icon: 'verified', 
          route: '/app/rh/documents' 
        },
      ]
    },
    // ========== MODULE PAIE ==========
    // Dans le tableau allNavItems, section "Paie"
{
  label: 'Paie',
  icon: 'attach_money',
  expanded: false,
  children: [
    { 
      label: 'Mes bulletins',
      icon: 'receipt',
      route: '/app/paie/mes-bulletins',
      requiredPermission: 'PAYSLIP_VIEW'
    },
    { 
      label: 'Gestion des bulletins',
      icon: 'receipt',
      route: '/app/paie/bulletins',
      requiredPermission: 'PAYSLIP_VIEW_ALL'
    },
    { 
      label: 'Import PDF',
      icon: 'upload_file',
      route: '/app/paie/import',
      requiredPermission: 'PAYSLIP_CREATE'
    },
    { 
      label: 'Historique',
      icon: 'history',
      route: '/app/paie/historique',
      requiredPermission: 'PAYSLIP_VIEW_ALL'
    }
  ]
},
    // ========== ADMIN ==========
    {
      label: 'Admin',
      icon: 'admin_panel_settings',
      expanded: false,
      children: [
        { 
          label: 'Rôles', 
          icon: 'groups', 
          route: '/app/admin/roles',
          requiredPermission: 'ROLE_VIEW'
        },
        { 
          label: 'Permissions', 
          icon: 'security', 
          route: '/app/admin/permissions',
          requiredPermission: 'PERMISSION_VIEW'
        },
        { 
          label: 'Permissions utilisateurs', 
          icon: 'manage_accounts', 
          route: '/app/admin/user-permissions',
          requiredPermission: 'USER_PERMISSION_VIEW'
        }
      ]
    }
  ];

  constructor() {}

  ngOnInit(): void {
    this.checkScreen();
    this.autoExpandActiveGroup();
    this.filterMenuItems();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterMenuItems();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterMenuItems(): void {
    const isAdmin = this.permissionService.isAdminSync();

    const filterItems = (items: NavItem[]): NavItem[] => {
      return items
        .map(item => {
          if (item.children && item.children.length > 0) {
            const filteredChildren = filterItems(item.children);
            if (filteredChildren.length > 0) {
              return {
                ...item,
                children: filteredChildren
              };
            }
            return this.isItemVisible(item, isAdmin) ? { ...item, children: [] } : null;
          }
          return this.isItemVisible(item, isAdmin) ? item : null;
        })
        .filter(item => item !== null) as NavItem[];
    };

    const filtered = filterItems(this.allNavItems);
    this.visibleNavItems.set(filtered);
  }

  private isItemVisible(item: NavItem, isAdmin: boolean): boolean {
    if (isAdmin) return true;

    if (item.requiredPermission) {
      return this.permissionService.hasPermissionSync(item.requiredPermission);
    }

    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      return this.permissionService.hasAnyPermissionSync(item.requiredPermissions);
    }

    if (item.children && item.children.length > 0) {
      return item.children.some(child => this.isItemVisible(child, isAdmin));
    }

    return true;
  }

  @HostListener('window:resize')
  checkScreen(): void {
    const width = window.innerWidth;
    const mobile = width < 1024;
    this.isMobile.set(mobile);

    if (mobile) {
      this.collapsed.set(false);
      this.collapseChange.emit(false);
    } else {
      this.mobileOpen.set(false);
      if (width < 1280 && !this.collapsed()) {
        this.collapsed.set(true);
        this.collapseChange.emit(true);
      }
    }
  }

  private autoExpandActiveGroup(): void {
    const url = this.router.url;
    this.closeAllGroups();
    this.allNavItems.forEach(item => {
      if (item.children?.some(c => c.route && url.startsWith(c.route))) {
        item.expanded = true;
      }
    });
  }

  private closeAllGroups(): void {
    const items = this.visibleNavItems();
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        item.expanded = false;
      }
    });
  }

  isGroupActive(item: NavItem): boolean {
    if (!item.children) return false;
    const url = this.router.url;
    return item.children.some(c => c.route && url.startsWith(c.route));
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    this.collapseChange.emit(this.collapsed());
    this.flyoutItem = null;
  }

  openMobile(): void { this.mobileOpen.set(true); }
  closeMobile(): void { this.mobileOpen.set(false); }

  toggleMenu(item: NavItem): void {
    if (this.collapsed()) {
      this.collapsed.set(false);
      this.collapseChange.emit(false);
      setTimeout(() => {
        this.closeAllGroups();
        item.expanded = true;
      }, 100);
      return;
    }

    const visibleItems = this.visibleNavItems();
    visibleItems.forEach(i => {
      if (i !== item && i.children && i.children.length > 0) {
        i.expanded = false;
      }
    });

    item.expanded = !item.expanded;
  }

  onLinkClick(): void {
    if (this.isMobile()) this.closeMobile();
    this.flyoutItem = null;
  }

  onGroupEnter(item: NavItem): void {
    if (!this.collapsed() || !item.children) return;
    if (this.flyoutTimer) clearTimeout(this.flyoutTimer);
    this.flyoutItem = item;
  }

  onGroupLeave(): void {
    if (!this.collapsed()) return;
    this.flyoutTimer = setTimeout(() => (this.flyoutItem = null), 150);
  }

  trackByLabel = (_: number, item: NavItem) => item.label;

  logout(): void {
    this.authService.logout();
  }
}