// src/app/features/features.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Permissions routing
import { PermissionRoutingModule } from './permissions/permission-routing.module';

// Roles routing
import { RoleRoutingModule } from './roles/role-routing.module';

// User Permissions routing
import { UserPermissionsRoutingModule } from './user-permissions/user-permissions-routing.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PermissionRoutingModule,
    RoleRoutingModule,
    UserPermissionsRoutingModule
  ],
  exports: []
})
export class FeaturesModule { }
