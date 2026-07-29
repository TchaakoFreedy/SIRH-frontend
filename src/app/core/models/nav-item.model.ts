// src/app/core/models/nav-item.model.ts

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  expanded?: boolean;
  children?: NavItem[];
  requiredPermission?: string; // ✅ Permission unique requise
  requiredPermissions?: string[]; // ✅ Permissions multiples requises
}