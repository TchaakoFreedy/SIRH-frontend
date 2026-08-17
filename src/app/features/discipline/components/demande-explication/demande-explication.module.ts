// src/app/features/discipline/components/demande-explication/demande-explication.module.ts
import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Material
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

// Components
import { DemandeExplicationListComponent } from './demande-explication-list/demande-explication-list.component';
import { DemandeExplicationCreateComponent } from './demande-explication-create/demande-explication-create.component';
import { DemandeExplicationDetailComponent } from './demande-explication-detail/demande-explication-detail.component';
import { DemandeExplicationActionsModalComponent } from './demande-explication-actions-modal/demande-explication-actions-modal.component';
import { DemandeExplicationImportComponent } from './demande-explication-import/demande-explication-import.component';

const routes: Routes = [
  { path: '', component: DemandeExplicationListComponent },
  { path: 'create', component: DemandeExplicationCreateComponent },
  { path: 'import', component: DemandeExplicationImportComponent },
  { path: ':id', component: DemandeExplicationDetailComponent },
  { path: 'edit/:id', component: DemandeExplicationCreateComponent }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    
    // Material
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatChipsModule,
    MatTabsModule,
    MatDividerModule,
    MatExpansionModule,
    
    // Composants standalone
    DemandeExplicationListComponent,
    DemandeExplicationCreateComponent,
    DemandeExplicationDetailComponent,
    DemandeExplicationActionsModalComponent,
    DemandeExplicationImportComponent
  ],
  providers: [DatePipe],
  exports: [
    DemandeExplicationListComponent,
    DemandeExplicationCreateComponent,
    DemandeExplicationDetailComponent,
    DemandeExplicationActionsModalComponent,
    DemandeExplicationImportComponent
  ]
})
export class DemandeExplicationModule { }