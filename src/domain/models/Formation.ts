import type { Role } from './Player';

/**
 * Moduli tattici e posizioni specifiche in campo.
 *
 * I giocatori nel dataset hanno solo 4 ruoli generici (GK/DEF/MID/ATT).
 * Un modulo definisce 11 *caselle* con una posizione specifica (es. AD = ala
 * destra) e una coordinata in campo. Ogni casella ha un `role` generico che
 * determina quali giocatori la coprono "in ruolo": metterci un giocatore di
 * ruolo diverso è permesso, ma riduce il suo rendimento (vedi positionFit).
 */

/** Codici di posizione specifici (nomenclatura italiana). */
export type PositionCode =
  | 'POR' // Portiere
  | 'TD' // Terzino destro
  | 'TS' // Terzino sinistro
  | 'DC' // Difensore centrale
  | 'MED' // Mediano / centrale difensivo
  | 'MC' // Centrocampista centrale
  | 'ED' // Esterno destro
  | 'ES' // Esterno sinistro
  | 'TRQ' // Trequartista
  | 'AD' // Ala destra
  | 'AS' // Ala sinistra
  | 'PC' // Punta centrale
  | 'SP'; // Seconda punta

export const POSITION_LABELS: Record<PositionCode, string> = {
  POR: 'Portiere',
  TD: 'Terzino destro',
  TS: 'Terzino sinistro',
  DC: 'Difensore centrale',
  MED: 'Mediano',
  MC: 'Centrocampista',
  ED: 'Esterno destro',
  ES: 'Esterno sinistro',
  TRQ: 'Trequartista',
  AD: 'Ala destra',
  AS: 'Ala sinistra',
  PC: 'Punta',
  SP: 'Seconda punta',
};

/** A quale reparto generico appartiene ciascuna posizione. */
export const POSITION_ROLE: Record<PositionCode, Role> = {
  POR: 'GK',
  TD: 'DEF',
  TS: 'DEF',
  DC: 'DEF',
  MED: 'MID',
  MC: 'MID',
  ED: 'MID',
  ES: 'MID',
  TRQ: 'MID',
  AD: 'ATT',
  AS: 'ATT',
  PC: 'ATT',
  SP: 'ATT',
};

/**
 * Una casella del modulo: posizione + coordinata in campo.
 * x: 0 (sinistra) → 100 (destra). y: 0 (propria porta) → 100 (porta avversaria).
 */
export interface FormationSlot {
  code: PositionCode;
  role: Role;
  x: number;
  y: number;
}

export interface Formation {
  id: string; // es. "4-3-3"
  name: string; // etichetta mostrata
  slots: FormationSlot[]; // sempre 11, in un ordine stabile
}

/** Helper per costruire una casella ricavando il reparto dal codice. */
function slot(code: PositionCode, x: number, y: number): FormationSlot {
  return { code, role: POSITION_ROLE[code], x, y };
}

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    name: '4-3-3',
    slots: [
      slot('POR', 50, 6),
      slot('TS', 16, 24),
      slot('DC', 38, 18),
      slot('DC', 62, 18),
      slot('TD', 84, 24),
      slot('MC', 28, 48),
      slot('MED', 50, 42),
      slot('MC', 72, 48),
      slot('AS', 18, 74),
      slot('PC', 50, 82),
      slot('AD', 82, 74),
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    slots: [
      slot('POR', 50, 6),
      slot('TS', 16, 24),
      slot('DC', 38, 18),
      slot('DC', 62, 18),
      slot('TD', 84, 24),
      slot('ES', 16, 50),
      slot('MC', 40, 46),
      slot('MC', 60, 46),
      slot('ED', 84, 50),
      slot('PC', 40, 80),
      slot('PC', 60, 80),
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    slots: [
      slot('POR', 50, 6),
      slot('DC', 30, 18),
      slot('DC', 50, 16),
      slot('DC', 70, 18),
      slot('ES', 14, 48),
      slot('MC', 38, 44),
      slot('MED', 50, 40),
      slot('MC', 62, 44),
      slot('ED', 86, 48),
      slot('PC', 40, 80),
      slot('PC', 60, 80),
    ],
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    slots: [
      slot('POR', 50, 6),
      slot('TS', 16, 24),
      slot('DC', 38, 18),
      slot('DC', 62, 18),
      slot('TD', 84, 24),
      slot('MED', 38, 40),
      slot('MED', 62, 40),
      slot('AS', 16, 62),
      slot('TRQ', 50, 58),
      slot('AD', 84, 62),
      slot('PC', 50, 84),
    ],
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    slots: [
      slot('POR', 50, 6),
      slot('DC', 30, 18),
      slot('DC', 50, 16),
      slot('DC', 70, 18),
      slot('ES', 14, 46),
      slot('MC', 40, 44),
      slot('MC', 60, 44),
      slot('ED', 86, 46),
      slot('AS', 20, 76),
      slot('PC', 50, 82),
      slot('AD', 80, 76),
    ],
  },
];

export const DEFAULT_FORMATION_ID = '4-3-3';

export function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

/**
 * Quanto un giocatore "rende" in una casella, in base alla distanza tra il suo
 * ruolo naturale e il reparto della casella. 1 = a suo agio, <1 = fuori ruolo.
 * Applicato come moltiplicatore sull'overall prima della simulazione.
 */
const FIT: Record<Role, Record<Role, number>> = {
  GK: { GK: 1, DEF: 0.5, MID: 0.4, ATT: 0.4 },
  DEF: { GK: 0.5, DEF: 1, MID: 0.85, ATT: 0.7 },
  MID: { GK: 0.5, DEF: 0.85, MID: 1, ATT: 0.85 },
  ATT: { GK: 0.5, DEF: 0.7, MID: 0.85, ATT: 1 },
};

export function positionFit(playerRole: Role, slotRole: Role): number {
  return FIT[playerRole][slotRole];
}

/** True se il giocatore gioca nel suo reparto naturale (nessuna penalità). */
export function isInPosition(playerRole: Role, slotRole: Role): boolean {
  return playerRole === slotRole;
}
