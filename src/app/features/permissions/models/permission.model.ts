// src/app/features/permissions/models/permission.model.ts

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredLevel: number;
  active: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreatePermissionRequest {
  name: string;
  description: string;
  category: string;
  requiredLevel: number;
  active: boolean;
}

export interface UpdatePermissionRequest {
  description: string;
  category: string;
  requiredLevel: number;
  active: boolean;
}

export interface PermissionFilter {
  category?: string;
  active?: boolean;
  search?: string;
}