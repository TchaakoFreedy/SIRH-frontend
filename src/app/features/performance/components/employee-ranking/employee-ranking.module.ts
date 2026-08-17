// src/app/features/performance/components/employee-ranking/employee-ranking.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmployeeRankingComponent } from './employee-ranking.component';

// ✅ Définir les routes pour ce module
const routes: Routes = [
  {
    path: '',
    component: EmployeeRankingComponent
  }
];

@NgModule({
  declarations: [
    EmployeeRankingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,           // ✅ Pour ngModel
    ReactiveFormsModule,   // ✅ Pour formControl
    RouterModule.forChild(routes),
    MatProgressSpinnerModule  // ✅ Pour mat-spinner
  ],
  exports: [
    EmployeeRankingComponent
  ]
})
export class EmployeeRankingModule { }