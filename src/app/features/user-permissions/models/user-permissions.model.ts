// src/app/features/user-permissions/models/user-permissions.model.ts

import { Permission } from '../../permissions/models/permission.model';
import { Role } from '../../roles/models/role.model';

export interface UserPermissions {
  role: Role;
  rolePermissions: Permission[];
  grantedPermissions: Permission[];
  revokedPermissions: Permission[];
  effectivePermissions: Permission[];
}

export interface UserPermissionsUpdateRequest {
  grantedPermissionIds: string[];
  revokedPermissionIds: string[];
}

export interface UserPermissionsSummary {
  userId: string;
  userName: string;
  roleName: string;
  effectivePermissions: string[];
}