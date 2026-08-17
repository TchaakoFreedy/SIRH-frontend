// src/app/features/performance/models/critere-performance.model.ts

export interface CriterePerformance {
  id?: string;
  nom: string;
  description?: string;
  noteMaximale: number;
  coefficient: number;
  actif?: boolean;
  
  // ===== FIELDS for GLOBAL/SELECTIVE =====
  typeCritere?: 'GLOBAL' | 'SELECTIVE';
  employeeIds?: string[];
  departementIds?: string[];
  ordreAffichage?: number;
  
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

// ============================================
// 📋 TYPE DE CRITÈRE
// ============================================

export const TypeCritereOptions = [
  { value: 'GLOBAL', label: '🌍 Global - Applicable à tous les employés' },
  { value: 'SELECTIVE', label: '🎯 Sélectif - Applicable à des employés spécifiques' }
];

export const TypeCritereLabels: Record<string, string> = {
  'GLOBAL': '🌍 Global',
  'SELECTIVE': '🎯 Sélectif'
};

export const TypeCritereColors: Record<string, string> = {
  'GLOBAL': '#4caf50',
  'SELECTIVE': '#2196f3'
};

export const TypeCritereIcons: Record<string, string> = {
  'GLOBAL': 'public',
  'SELECTIVE': 'person'
};

export const TypeCritereBadgeClasses: Record<string, string> = {
  'GLOBAL': 'badge-global',
  'SELECTIVE': 'badge-selective'
};

export function getTypeLabel(type?: string): string {
  if (!type) return 'GLOBAL';
  return TypeCritereLabels[type] || type;
}

export function getTypeColor(type?: string): string {
  if (!type) return '#4caf50';
  return TypeCritereColors[type] || '#4caf50';
}

export function getTypeIcon(type?: string): string {
  if (!type) return 'public';
  return TypeCritereIcons[type] || 'public';
}

export function getTypeBadgeClass(type?: string): string {
  if (!type) return 'badge-default';
  return TypeCritereBadgeClasses[type] || 'badge-default';
}

export function isGlobal(type?: string): boolean {
  return type === 'GLOBAL';
}

export function isSelective(type?: string): boolean {
  return type === 'SELECTIVE';
}