// src/app/features/permissions/permission-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionListComponent } from './components/permission-list/permission-list.component';
import { PermissionFormComponent } from './components/permission-form/permission-form.component';
import { PermissionDetailComponent } from './components/permission-detail/permission-detail.component';

const routes: Routes = [
  { path: '', component: PermissionListComponent },
  { path: 'create', component: PermissionFormComponent },
  { path: 'edit/:id', component: PermissionFormComponent },
  { path: ':id', component: PermissionDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PermissionRoutingModule { }