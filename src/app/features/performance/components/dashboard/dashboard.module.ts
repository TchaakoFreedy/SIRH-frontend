import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';

// Charts
import { NgChartsModule } from 'ng2-charts';

import { PerformanceDashboardComponent } from './performance-dashboard/performance-dashboard.component';

const routes = [
  { path: '', component: PerformanceDashboardComponent }
];

@NgModule({
  declarations: [
    PerformanceDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    NgChartsModule
  ]
})
export class DashboardModule { }