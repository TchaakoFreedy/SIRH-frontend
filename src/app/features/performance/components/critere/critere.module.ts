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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// Components (NON standalone)
import { CritereListComponent } from './critere-list/critere-list.component';
import { CritereCreateComponent } from './critere-create/critere-create.component';
import { CritereEditComponent } from './critere-edit/critere-edit.component';

const routes: Routes = [
  { path: '', component: CritereListComponent },
  { path: 'create', component: CritereCreateComponent },
  { path: 'edit/:id', component: CritereEditComponent }
];

@NgModule({
  declarations: [
    CritereListComponent,
    CritereCreateComponent,
    CritereEditComponent
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
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatSlideToggleModule
  ],
  providers: [DatePipe]
})
export class CritereModule { }