export type ConfigurationType = 'GLOBALE' | 'GENRE' | 'INDIVIDUELLE';

export interface ConfigurationConge {
  id?: string;
  nom: string;
  type: ConfigurationType;
  joursDeBase: number;
  bonusEnfantActif: boolean;
  joursParEnfant: number;
  ageMaxEnfant: number;
  genre?: string | null;       // "FEMME" ou "HOMME" pour le type GENRE
  employeeId?: string | null;  // pour le type INDIVIDUELLE
  annee?: number | null;       // année de validité (null = toutes années)
  createdAt?: string;
  updatedAt?: string;
}