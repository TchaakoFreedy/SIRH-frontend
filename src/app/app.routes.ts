// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './core/guards/auth.guard';
import { PermissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [

  // 🔐 LOGIN
  {
    path: 'login',
    component: LoginComponent
  },

  // ✅ 2FA VERIFICATION - Match the component's expected path
  {
    path: 'login/two-factor',
    loadComponent: () =>
      import('./features/auth/login/components/two-factor-login/two-factor-login.component')
        .then(m => m.TwoFactorLoginComponent)
    // Pas de guard car on vérifie la session dans le composant
  },

  // 🔁 REDIRECTION
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // 🔑 FORGOT PASSWORD
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },

  // 🔑 RESET PASSWORD
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component')
        .then(m => m.ResetPasswordComponent)
  },

  // 🚫 ACCESS DENIED
  {
    path: 'app/access-denied',
    loadComponent: () =>
      import('./features/access-denied/access-denied.component')
        .then(m => m.AccessDeniedComponent)
  },

  // 🧭 APP PROTÉGÉE
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // ========== DASHBOARD ==========
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },

      // ========== ORGANISATION ==========
      {
        path: 'organisation/entreprises',
        loadComponent: () =>
          import('./features/organisation/entreprises/entreprises.component')
            .then(m => m.EntreprisesComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'COMPANY_VIEW_ALL' }
      },
      {
        path: 'organisation/departements',
        loadComponent: () =>
          import('./features/organisation/departements/departements')
            .then(m => m.DepartementsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'DEPARTMENT_VIEW_ALL' }
      },
      {
        path: 'organisation/postes',
        loadComponent: () =>
          import('./features/organisation/postes/postes.component')
            .then(m => m.PostesComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'POSITION_VIEW_ALL' }
      },

      // ========== MON ESPACE ==========
      {
        path: 'mon-espace/profil',
        loadComponent: () =>
          import('./features/mon-espace/profil/profil.component')
            .then(m => m.ProfilComponent)
      },
      {
        path: 'mon-espace/performances',
        loadChildren: () =>
          import('./features/performance/components/my-performance/my-performance.module')
            .then(m => m.MyPerformanceModule),
        canActivate: [PermissionGuard],
        data: { permission: 'PERFORMANCE_VIEW' }
      },

      // ========== RESSOURCES HUMAINES (RH) ==========
      {
        path: 'rh/employes',
        loadComponent: () =>
          import('./features/rh/employes/employes.component')
            .then(m => m.EmployesComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'EMPLOYEE_VIEW_ALL' }
      },
      {
        path: 'rh/documents',
        loadComponent: () =>
          import('./features/rh/documents/documents.component')
            .then(m => m.DocumentsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'DOC_VIEW' }
      },
      {
        path: 'rh/conges',
        loadComponent: () =>
          import('./features/conges/conges.component')
            .then(m => m.CongesComponent)
      },
      {
        path: 'rh/conges/demande',
        loadComponent: () =>
          import('./features/conges/demande-conge/demande-conge.component')
            .then(m => m.DemandeCongeComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'LEAVE_VIEW_OWN' }
      },
      {
        path: 'rh/conges/historique-conges',
        loadComponent: () =>
          import('./features/conges/historique-conges/historique-conges.component')
            .then(m => m.HistoriqueCongesComponent)
      },
      {
        path: 'conges/gestion-rh',
        loadComponent: () =>
          import('./features/conges/gestion-conges-rh/gestion-conges-rh.component')
            .then(m => m.GestionCongesRhComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'LEAVE_VIEW_ALL' }
      },
      {
        path: 'rh/configuration-conge',
        loadComponent: () =>
          import('./features/rh/configuration-conge/configuration-conge.component')
            .then(m => m.ConfigurationCongeComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'SYSTEM_ADMIN' }
      },

      // ⭐ NOTIFICATIONS
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/pages/notifications-page/notifications-page.component')
            .then(m => m.NotificationsPageComponent)
      },

      // ========== MODULE PAIE ==========
      {
        path: 'paie/bulletins',
        loadComponent: () =>
          import('./features/pay-slip/pay-slip-list.component')
            .then(m => m.PaySlipListComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'PAYSLIP_VIEW_ALL' }
      },
      {
        path: 'paie/import',
        loadComponent: () =>
          import('./features/pay-slip/pay-slip-upload.component')
            .then(m => m.PaySlipUploadComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'PAYSLIP_CREATE' }
      },
      {
        path: 'paie/historique',
        loadComponent: () =>
          import('./features/pay-slip/pay-slip-list.component')
            .then(m => m.PaySlipListComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'PAYSLIP_VIEW_ALL' }
      },
      {
        path: 'paie/pay-slip-detail/:id',
        loadComponent: () =>
          import('./features/pay-slip/pay-slip-detail.component')
            .then(m => m.PaySlipDetailComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'PAYSLIP_VIEW' }
      },
      {
        path: 'paie/edit/:id',
        loadComponent: () =>
          import('./features/pay-slip/pay-slip-edit.component')
            .then(m => m.PaySlipEditComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'PAYSLIP_UPDATE' }
      },
      {
        path: 'paie/mes-bulletins',
        loadComponent: () =>
          import('./features/pay-slip/my-pay-slips.component')
            .then(m => m.MyPaySlipsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'PAYSLIP_VIEW' }
      },

      // ========== MODULE DISCIPLINE ==========
      {
        path: 'discipline',
        loadChildren: () =>
          import('./features/discipline/discipline-routing.module')
            .then(m => m.DisciplineRoutingModule),
        canActivate: [AuthGuard]
      },

      // ========== MODULE PERFORMANCE ==========
      {
        path: 'performance',
        loadChildren: () =>
          import('./features/performance/performance-routing.module')
            .then(m => m.PerformanceRoutingModule),
        canActivate: [PermissionGuard],
        data: { permission: 'PERFORMANCE_VIEW' }
      },
      
      {
        path: 'performance/my-performance',
        loadChildren: () =>
          import('./features/performance/components/my-performance/my-performance.module')
            .then(m => m.MyPerformanceModule),
        canActivate: [PermissionGuard],
        data: { permission: 'PERFORMANCE_VIEW' }
      },
      
      {
        path: 'performance/classement',
        loadChildren: () =>
          import('./features/performance/components/employee-ranking/employee-ranking.module')
            .then(m => m.EmployeeRankingModule),
        canActivate: [PermissionGuard],
        data: { permission: 'RANKING_VIEW' }
      },

      // ========== ADMIN ==========
      {
        path: 'admin/dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard')
            .then(m => m.AdminDashboardComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'ROLE_VIEW' }
      },
      {
        path: 'admin/roles',
        loadChildren: () =>
          import('./features/roles/role-routing.module')
            .then(m => m.RoleRoutingModule),
        canActivate: [PermissionGuard],
        data: { permission: 'ROLE_VIEW' }
      },
      {
        path: 'admin/permissions',
        loadChildren: () =>
          import('./features/permissions/permission-routing.module')
            .then(m => m.PermissionRoutingModule),
        canActivate: [PermissionGuard],
        data: { permission: 'PERMISSION_VIEW' }
      },
      {
        path: 'admin/user-permissions',
        loadChildren: () =>
          import('./features/user-permissions/user-permissions-routing.module')
            .then(m => m.UserPermissionsRoutingModule),
        canActivate: [PermissionGuard],
        data: { permission: 'USER_PERMISSION_VIEW' }
      },

      // ========== DASHBOARD ROUTES ==========
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
        canActivate: [AuthGuard],
      },

      // ========== CONTRATS ==========
{
  path: 'contrats',
  loadComponent: () =>
    import('./features/contrats/contrats.component')
      .then(m => m.ContratsComponent),
  canActivate: [PermissionGuard],
  data: { permission: 'CONTRACT_VIEW_ALL' }
},

      // ========== REDIRECTION PAR DÉFAUT ==========
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // 🚫 FALLBACK
  {
    path: '**',
    redirectTo: 'login'
  }
];