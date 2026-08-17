// src/app/features/performance/performance-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { PermissionGuard } from '../../core/guards/permission.guard';

const routes: Routes = [
  {
    path: 'criteres',
    loadChildren: () => import('./components/critere/critere.module').then(m => m.CritereModule),
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'PERFORMANCE_CRITERIA_VIEW' }  
  },
  {
    path: 'evaluations',
    loadChildren: () => import('./components/evaluation/evaluation.module').then(m => m.EvaluationModule),
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'PERFORMANCE_VIEW_ALL' }
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'PERFORMANCE_VIEW_ALL' }
  },
  {
    path: 'my-performance',
    loadChildren: () => import('./components/my-performance/my-performance.module').then(m => m.MyPerformanceModule),
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'PERFORMANCE_VIEW' }  
  },
  {
    path: 'classement',
    loadChildren: () => import('./components/employee-ranking/employee-ranking.module').then(m => m.EmployeeRankingModule),
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'RANKING_VIEW' }  
  },
  {
    path: '',
    // ✅ CHANGEMENT ICI : Rediriger vers 'my-performance' au lieu de 'dashboard'
    redirectTo: 'my-performance',  // ou 'classement' si vous préférez
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PerformanceRoutingModule { }