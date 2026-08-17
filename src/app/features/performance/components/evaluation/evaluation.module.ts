import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

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
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { EvaluationListComponent } from './evaluation-list/evaluation-list.component';
import { EvaluationCreateComponent } from './evaluation-create/evaluation-create.component';
import { EvaluationDetailComponent } from './evaluation-detail/evaluation-detail.component';
import { EvaluationEditComponent } from './evaluation-edit/evaluation-edit.component';

const routes: Routes = [
  { path: '', component: EvaluationListComponent },
  { path: 'create', component: EvaluationCreateComponent },
  { path: 'edit/:id', component: EvaluationEditComponent }, // ✅ Route d'édition
  { path: ':id', component: EvaluationDetailComponent }
];

@NgModule({
  declarations: [
    EvaluationListComponent,
    EvaluationCreateComponent,
    EvaluationDetailComponent,
    EvaluationEditComponent // ✅ Ajout du composant d'édition
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
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
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule,
    MatSlideToggleModule // ✅ Ajout pour les toggle
  ],
  providers: [DatePipe]
})
export class EvaluationModule { }