// src/app/features/discipline/models/dashboard-sanction-stats.model.ts

export interface DashboardSanctionStats {
  total: number;
  actives: number;
  levees: number;
  annulees: number;
  parType: { [key: string]: number };
  parStatut: { [key: string]: number };
}