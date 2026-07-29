// src/app/features/user-permissions/user-permissions-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserPermissionsComponent } from './components/user-permissions/user-permissions.component';
import { UserPermissionsEditComponent } from './components/user-permissions-edit/user-permissions-edit.component';

const routes: Routes = [
  // ✅ Route par défaut - affiche un message pour sélectionner un utilisateur
  { path: '', component: UserPermissionsComponent },
  // ✅ Route avec ID - affiche les permissions d'un utilisateur spécifique
  { path: ':userId', component: UserPermissionsComponent },
  // ✅ Route d'édition
  { path: ':userId/edit', component: UserPermissionsEditComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserPermissionsRoutingModule { }