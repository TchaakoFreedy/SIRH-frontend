// src/app/features/discipline/discipline-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { AuthGuard } from '../../core/guards/auth.guard';

// Components
import { DemandeExplicationListComponent } from './components/demande-explication/demande-explication-list/demande-explication-list.component';
import { DemandeExplicationCreateComponent } from './components/demande-explication/demande-explication-create/demande-explication-create.component';
import { DemandeExplicationDetailComponent } from './components/demande-explication/demande-explication-detail/demande-explication-detail.component';
import { DemandeExplicationImportComponent } from './components/demande-explication/demande-explication-import/demande-explication-import.component';
import { MesDemandesComponent } from './components/demande-explication/mes-demandes/mes-demandes.component';
import { SanctionListComponent } from './components/sanction/sanction-list/sanction-list.component';
import { SanctionCreateComponent } from './components/sanction/sanction-create/sanction-create.component';
import { SanctionDetailComponent } from './components/sanction/sanction-detail/sanction-detail.component';
import { MesSanctionsComponent } from './components/sanction/mes-sanctions/mes-sanctions.component';

const routes: Routes = [
  // ============================================
  // 📋 DEMANDES D'EXPLICATION
  // ============================================
  {
    path: 'demandes',
    children: [
      {
        path: '',
        component: DemandeExplicationListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'EXPLANATION_REQUEST_VIEW' }
      },
      {
        path: 'create',
        component: DemandeExplicationCreateComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'EXPLANATION_REQUEST_CREATE' }
      },
      {
        path: 'import',
        component: DemandeExplicationImportComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'EXPLANATION_REQUEST_CREATE',
          title: 'Importer des demandes d\'explication'
        }
      },
      {
        path: 'edit/:id',
        component: DemandeExplicationCreateComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'EXPLANATION_REQUEST_UPDATE' }
      },
      {
        path: ':id',
        component: DemandeExplicationDetailComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'EXPLANATION_REQUEST_VIEW' }
      }
    ]
  },

  // ============================================
  // 👤 MES DEMANDES - Pour EMPLOYEE
  // ============================================
  {
    path: 'mes-demandes',
    children: [
      {
        path: '',
        component: MesDemandesComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'EXPLANATION_REQUEST_VIEW_OWN' }
      },
      {
        path: ':id',
        component: DemandeExplicationDetailComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'EXPLANATION_REQUEST_VIEW_OWN' }
      }
    ]
  },

  // ============================================
  // ⚖️ SANCTIONS
  // ============================================
  {
    path: 'sanctions',
    children: [
      {
        path: '',
        component: SanctionListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'SANCTION_VIEW' }
      },
      {
        path: 'create',
        component: SanctionCreateComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'SANCTION_CREATE' }
      },
      {
        path: ':id',
        component: SanctionDetailComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'SANCTION_VIEW' }
      }
    ]
  },
  {
    path: 'mes-sanctions',
    component: MesSanctionsComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'SANCTION_VIEW_OWN' }
  },

  // ============================================
  // 🔄 REDIRECTION PAR DÉFAUT
  // ============================================
  {
    path: '',
    redirectTo: 'mes-demandes',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DisciplineRoutingModule { }