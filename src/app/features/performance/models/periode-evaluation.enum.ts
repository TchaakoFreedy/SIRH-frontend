// src/app/features/performance/models/periode-evaluation.enum.ts

export enum PeriodeEvaluation {
  // Périodes mensuelles
  JANVIER = 'JANVIER',
  FEVRIER = 'FEVRIER',
  MARS = 'MARS',
  AVRIL = 'AVRIL',
  MAI = 'MAI',
  JUIN = 'JUIN',
  JUILLET = 'JUILLET',
  AOUT = 'AOUT',
  SEPTEMBRE = 'SEPTEMBRE',
  OCTOBRE = 'OCTOBRE',
  NOVEMBRE = 'NOVEMBRE',
  DECEMBRE = 'DECEMBRE',
  // Périodes trimestrielles
  TRIMESTRE_1 = 'TRIMESTRE_1',
  TRIMESTRE_2 = 'TRIMESTRE_2',
  TRIMESTRE_3 = 'TRIMESTRE_3',
  TRIMESTRE_4 = 'TRIMESTRE_4',
  // Périodes semestrielles
  SEMESTRE_1 = 'SEMESTRE_1',
  SEMESTRE_2 = 'SEMESTRE_2',
  // Période annuelle
  ANNUEL = 'ANNUEL'
}

export const PeriodeEvaluationLabels: Record<PeriodeEvaluation, string> = {
  // Périodes mensuelles
  [PeriodeEvaluation.JANVIER]: 'Janvier',
  [PeriodeEvaluation.FEVRIER]: 'Février',
  [PeriodeEvaluation.MARS]: 'Mars',
  [PeriodeEvaluation.AVRIL]: 'Avril',
  [PeriodeEvaluation.MAI]: 'Mai',
  [PeriodeEvaluation.JUIN]: 'Juin',
  [PeriodeEvaluation.JUILLET]: 'Juillet',
  [PeriodeEvaluation.AOUT]: 'Août',
  [PeriodeEvaluation.SEPTEMBRE]: 'Septembre',
  [PeriodeEvaluation.OCTOBRE]: 'Octobre',
  [PeriodeEvaluation.NOVEMBRE]: 'Novembre',
  [PeriodeEvaluation.DECEMBRE]: 'Décembre',
  // Périodes trimestrielles
  [PeriodeEvaluation.TRIMESTRE_1]: 'T1 - Janvier à Mars',
  [PeriodeEvaluation.TRIMESTRE_2]: 'T2 - Avril à Juin',
  [PeriodeEvaluation.TRIMESTRE_3]: 'T3 - Juillet à Septembre',
  [PeriodeEvaluation.TRIMESTRE_4]: 'T4 - Octobre à Décembre',
  // Périodes semestrielles
  [PeriodeEvaluation.SEMESTRE_1]: 'S1 - Janvier à Juin',
  [PeriodeEvaluation.SEMESTRE_2]: 'S2 - Juillet à Décembre',
  // Période annuelle
  [PeriodeEvaluation.ANNUEL]: 'Annuel'
};

export const PeriodeEvaluationShortLabels: Record<PeriodeEvaluation, string> = {
  // Périodes mensuelles
  [PeriodeEvaluation.JANVIER]: 'Jan',
  [PeriodeEvaluation.FEVRIER]: 'Fév',
  [PeriodeEvaluation.MARS]: 'Mar',
  [PeriodeEvaluation.AVRIL]: 'Avr',
  [PeriodeEvaluation.MAI]: 'Mai',
  [PeriodeEvaluation.JUIN]: 'Juin',
  [PeriodeEvaluation.JUILLET]: 'Juil',
  [PeriodeEvaluation.AOUT]: 'Aoû',
  [PeriodeEvaluation.SEPTEMBRE]: 'Sep',
  [PeriodeEvaluation.OCTOBRE]: 'Oct',
  [PeriodeEvaluation.NOVEMBRE]: 'Nov',
  [PeriodeEvaluation.DECEMBRE]: 'Déc',
  // Périodes trimestrielles
  [PeriodeEvaluation.TRIMESTRE_1]: 'T1',
  [PeriodeEvaluation.TRIMESTRE_2]: 'T2',
  [PeriodeEvaluation.TRIMESTRE_3]: 'T3',
  [PeriodeEvaluation.TRIMESTRE_4]: 'T4',
  // Périodes semestrielles
  [PeriodeEvaluation.SEMESTRE_1]: 'S1',
  [PeriodeEvaluation.SEMESTRE_2]: 'S2',
  // Période annuelle
  [PeriodeEvaluation.ANNUEL]: 'Annuel'
};

export const PeriodeEvaluationOrder: Record<PeriodeEvaluation, number> = {
  // Périodes mensuelles (1-12)
  [PeriodeEvaluation.JANVIER]: 1,
  [PeriodeEvaluation.FEVRIER]: 2,
  [PeriodeEvaluation.MARS]: 3,
  [PeriodeEvaluation.AVRIL]: 4,
  [PeriodeEvaluation.MAI]: 5,
  [PeriodeEvaluation.JUIN]: 6,
  [PeriodeEvaluation.JUILLET]: 7,
  [PeriodeEvaluation.AOUT]: 8,
  [PeriodeEvaluation.SEPTEMBRE]: 9,
  [PeriodeEvaluation.OCTOBRE]: 10,
  [PeriodeEvaluation.NOVEMBRE]: 11,
  [PeriodeEvaluation.DECEMBRE]: 12,
  // Périodes trimestrielles (13-16)
  [PeriodeEvaluation.TRIMESTRE_1]: 13,
  [PeriodeEvaluation.TRIMESTRE_2]: 14,
  [PeriodeEvaluation.TRIMESTRE_3]: 15,
  [PeriodeEvaluation.TRIMESTRE_4]: 16,
  // Périodes semestrielles (17-18)
  [PeriodeEvaluation.SEMESTRE_1]: 17,
  [PeriodeEvaluation.SEMESTRE_2]: 18,
  // Période annuelle (19)
  [PeriodeEvaluation.ANNUEL]: 19
};

/**
 * Vérifie si une période est mensuelle
 */
export function isMensuel(periode: PeriodeEvaluation): boolean {
  const mensuelPeriodes = [
    PeriodeEvaluation.JANVIER,
    PeriodeEvaluation.FEVRIER,
    PeriodeEvaluation.MARS,
    PeriodeEvaluation.AVRIL,
    PeriodeEvaluation.MAI,
    PeriodeEvaluation.JUIN,
    PeriodeEvaluation.JUILLET,
    PeriodeEvaluation.AOUT,
    PeriodeEvaluation.SEPTEMBRE,
    PeriodeEvaluation.OCTOBRE,
    PeriodeEvaluation.NOVEMBRE,
    PeriodeEvaluation.DECEMBRE
  ];
  return mensuelPeriodes.includes(periode);
}

/**
 * Vérifie si une période est trimestrielle
 */
export function isTrimestriel(periode: PeriodeEvaluation): boolean {
  const trimestrielPeriodes = [
    PeriodeEvaluation.TRIMESTRE_1,
    PeriodeEvaluation.TRIMESTRE_2,
    PeriodeEvaluation.TRIMESTRE_3,
    PeriodeEvaluation.TRIMESTRE_4
  ];
  return trimestrielPeriodes.includes(periode);
}

/**
 * Vérifie si une période est semestrielle
 */
export function isSemestriel(periode: PeriodeEvaluation): boolean {
  const semestrielPeriodes = [
    PeriodeEvaluation.SEMESTRE_1,
    PeriodeEvaluation.SEMESTRE_2
  ];
  return semestrielPeriodes.includes(periode);
}

/**
 * Vérifie si une période est annuelle
 */
export function isAnnuel(periode: PeriodeEvaluation): boolean {
  return periode === PeriodeEvaluation.ANNUEL;
}

/**
 * Obtient le type de période (mensuel, trimestriel, semestriel, annuel)
 */
export function getPeriodeType(periode: PeriodeEvaluation): 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'ANNUEL' {
  if (isMensuel(periode)) return 'MENSUEL';
  if (isTrimestriel(periode)) return 'TRIMESTRIEL';
  if (isSemestriel(periode)) return 'SEMESTRIEL';
  return 'ANNUEL';
}

/**
 * Obtient le mois correspondant à une période mensuelle
 * Retourne le numéro du mois (1-12) ou null si ce n'est pas une période mensuelle
 */
export function getMoisFromPeriode(periode: PeriodeEvaluation): number | null {
  const moisMap: Record<PeriodeEvaluation, number> = {
    [PeriodeEvaluation.JANVIER]: 1,
    [PeriodeEvaluation.FEVRIER]: 2,
    [PeriodeEvaluation.MARS]: 3,
    [PeriodeEvaluation.AVRIL]: 4,
    [PeriodeEvaluation.MAI]: 5,
    [PeriodeEvaluation.JUIN]: 6,
    [PeriodeEvaluation.JUILLET]: 7,
    [PeriodeEvaluation.AOUT]: 8,
    [PeriodeEvaluation.SEPTEMBRE]: 9,
    [PeriodeEvaluation.OCTOBRE]: 10,
    [PeriodeEvaluation.NOVEMBRE]: 11,
    [PeriodeEvaluation.DECEMBRE]: 12,
    // Pour les autres périodes, retourner null
    [PeriodeEvaluation.TRIMESTRE_1]: null as any,
    [PeriodeEvaluation.TRIMESTRE_2]: null as any,
    [PeriodeEvaluation.TRIMESTRE_3]: null as any,
    [PeriodeEvaluation.TRIMESTRE_4]: null as any,
    [PeriodeEvaluation.SEMESTRE_1]: null as any,
    [PeriodeEvaluation.SEMESTRE_2]: null as any,
    [PeriodeEvaluation.ANNUEL]: null as any
  };
  return moisMap[periode] || null;
}

/**
 * Obtient la période mensuelle à partir d'un numéro de mois
 */
export function getPeriodeFromMois(mois: number): PeriodeEvaluation | null {
  const periodeMap: Record<number, PeriodeEvaluation> = {
    1: PeriodeEvaluation.JANVIER,
    2: PeriodeEvaluation.FEVRIER,
    3: PeriodeEvaluation.MARS,
    4: PeriodeEvaluation.AVRIL,
    5: PeriodeEvaluation.MAI,
    6: PeriodeEvaluation.JUIN,
    7: PeriodeEvaluation.JUILLET,
    8: PeriodeEvaluation.AOUT,
    9: PeriodeEvaluation.SEPTEMBRE,
    10: PeriodeEvaluation.OCTOBRE,
    11: PeriodeEvaluation.NOVEMBRE,
    12: PeriodeEvaluation.DECEMBRE
  };
  return periodeMap[mois] || null;
}

/**
 * Obtient le trimestre correspondant à un mois
 */
export function getTrimestreFromMois(mois: number): PeriodeEvaluation {
  if (mois >= 1 && mois <= 3) return PeriodeEvaluation.TRIMESTRE_1;
  if (mois >= 4 && mois <= 6) return PeriodeEvaluation.TRIMESTRE_2;
  if (mois >= 7 && mois <= 9) return PeriodeEvaluation.TRIMESTRE_3;
  return PeriodeEvaluation.TRIMESTRE_4;
}

/**
 * Obtient le semestre correspondant à un mois
 */
export function getSemestreFromMois(mois: number): PeriodeEvaluation {
  if (mois >= 1 && mois <= 6) return PeriodeEvaluation.SEMESTRE_1;
  return PeriodeEvaluation.SEMESTRE_2;
}

export function getPeriodeLabel(periode: PeriodeEvaluation): string {
  return PeriodeEvaluationLabels[periode] || periode;
}

export function getPeriodeShortLabel(periode: PeriodeEvaluation): string {
  return PeriodeEvaluationShortLabels[periode] || periode;
}

export function getPeriodeOptions(): { value: PeriodeEvaluation; label: string }[] {
  return Object.values(PeriodeEvaluation).map(periode => ({
    value: periode,
    label: getPeriodeLabel(periode)
  }));
}

/**
 * Obtient les options de période filtrées par type
 */
export function getPeriodeOptionsByType(type: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'ANNUEL' | 'ALL'): { value: PeriodeEvaluation; label: string }[] {
  const allOptions = getPeriodeOptions();
  
  if (type === 'ALL') {
    return allOptions;
  }
  
  return allOptions.filter(option => {
    const periodeType = getPeriodeType(option.value);
    return periodeType === type;
  });
}

/**
 * Obtient les options pour les périodes mensuelles uniquement
 */
export function getMensuelOptions(): { value: PeriodeEvaluation; label: string }[] {
  return getPeriodeOptionsByType('MENSUEL');
}

/**
 * Obtient les options pour les périodes trimestrielles uniquement
 */
export function getTrimestrielOptions(): { value: PeriodeEvaluation; label: string }[] {
  return getPeriodeOptionsByType('TRIMESTRIEL');
}

/**
 * Obtient les options pour les périodes semestrielles uniquement
 */
export function getSemestrielOptions(): { value: PeriodeEvaluation; label: string }[] {
  return getPeriodeOptionsByType('SEMESTRIEL');
}

/**
 * Obtient la période suivante dans l'ordre chronologique
 */
export function getNextPeriode(periode: PeriodeEvaluation): PeriodeEvaluation | null {
  const order = PeriodeEvaluationOrder[periode];
  const nextOrder = order + 1;
  const entry = Object.entries(PeriodeEvaluationOrder).find(([_, value]) => value === nextOrder);
  return entry ? entry[0] as PeriodeEvaluation : null;
}

/**
 * Obtient la période précédente dans l'ordre chronologique
 */
export function getPreviousPeriode(periode: PeriodeEvaluation): PeriodeEvaluation | null {
  const order = PeriodeEvaluationOrder[periode];
  const prevOrder = order - 1;
  const entry = Object.entries(PeriodeEvaluationOrder).find(([_, value]) => value === prevOrder);
  return entry ? entry[0] as PeriodeEvaluation : null;
}

/**
 * Compare deux périodes pour le tri
 */
export function comparePeriodes(a: PeriodeEvaluation, b: PeriodeEvaluation): number {
  return PeriodeEvaluationOrder[a] - PeriodeEvaluationOrder[b];
}

/**
 * Obtient la période par défaut en fonction de la date actuelle
 */
export function getDefaultPeriode(): PeriodeEvaluation {
  const currentMonth = new Date().getMonth() + 1;
  return getPeriodeFromMois(currentMonth) || PeriodeEvaluation.JANVIER;
}

export function getPeriodeFromLabel(label: string): PeriodeEvaluation | null {
  const entry = Object.entries(PeriodeEvaluationLabels).find(([_, value]) => value === label);
  return entry ? entry[0] as PeriodeEvaluation : null;
}