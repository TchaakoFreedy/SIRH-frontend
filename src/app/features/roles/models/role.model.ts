// src/app/features/roles/models/role.model.ts

import { Permission } from '../../permissions/models/permission.model';

export interface Role {
  id: string;
  name: string;
  description: string;
  hierarchyLevel: number;
  permissionIds: string[];
  visibilityScope: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  // Frontend only
  permissions?: Permission[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  hierarchyLevel: number;
  permissionIds: string[];
  visibilityScope: string;
  active: boolean;
}

export interface RolePermissionsUpdateRequest {
  permissionIds: string[];
}