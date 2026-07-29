// src/app/features/roles/role-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleListComponent } from './components/role-list/role-list.component';
import { RoleFormComponent } from './components/role-form/role-form.component';
import { RolePermissionsComponent } from './components/role-permissions/role-permissions.component';

const routes: Routes = [
  { path: '', component: RoleListComponent },
  { path: 'create', component: RoleFormComponent },
  { path: 'edit/:id', component: RoleFormComponent },
  { path: ':id', component: RoleListComponent },
  { path: ':id/permissions', component: RolePermissionsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RoleRoutingModule { }