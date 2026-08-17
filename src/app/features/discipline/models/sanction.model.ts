import { HistoriqueDiscipline } from './demande-explication.model';

export interface Sanction {
  id?: string;
  numero: string;
  employeId: string;
  employeNom?: string;
  demandeExplicationId?: string;
  demandeExplicationNumero?: string;
  type: TypeSanction;
  motif: string;
  description?: string;
  dateDebut: Date;
  dateFin?: Date;
  duree?: number;
  statut: StatutSanction;
  creeParId?: string;
  creeParNom?: string;
  historique?: HistoriqueDiscipline[];
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export enum TypeSanction {
  AVERTISSEMENT_VERBAL = 'AVERTISSEMENT_VERBAL',
  AVERTISSEMENT_ECRIT = 'AVERTISSEMENT_ECRIT',
  BLAME = 'BLAME',
  MISE_A_PIED = 'MISE_A_PIED',
  SUSPENSION = 'SUSPENSION',
  MUTATION_DISCIPLINAIRE = 'MUTATION_DISCIPLINAIRE',
  LICENCIEMENT = 'LICENCIEMENT',
  AUTRE = 'AUTRE'
}

export enum StatutSanction {
  ACTIVE = 'ACTIVE',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE'
}

export const TypeSanctionLabels: Record<TypeSanction, string> = {
  [TypeSanction.AVERTISSEMENT_VERBAL]: 'Avertissement verbal',
  [TypeSanction.AVERTISSEMENT_ECRIT]: 'Avertissement écrit',
  [TypeSanction.BLAME]: 'Blâme',
  [TypeSanction.MISE_A_PIED]: 'Mise à pied',
  [TypeSanction.SUSPENSION]: 'Suspension',
  [TypeSanction.MUTATION_DISCIPLINAIRE]: 'Mutation disciplinaire',
  [TypeSanction.LICENCIEMENT]: 'Licenciement',
  [TypeSanction.AUTRE]: 'Autre'
};

export const StatutSanctionLabels: Record<StatutSanction, string> = {
  [StatutSanction.ACTIVE]: 'Active',
  [StatutSanction.TERMINEE]: 'Terminée',
  [StatutSanction.ANNULEE]: 'Annulée'
};

export const StatutSanctionColors: Record<StatutSanction, string> = {
  [StatutSanction.ACTIVE]: 'danger',
  [StatutSanction.TERMINEE]: 'success',
  [StatutSanction.ANNULEE]: 'secondary'
};