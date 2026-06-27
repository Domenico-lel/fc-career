export type Role = 'GK' | 'DEF' | 'MID' | 'ATT';

export const ROLE_LABELS: Record<Role, string> = {
  GK: 'Portiere',
  DEF: 'Difensore',
  MID: 'Centrocampista',
  ATT: 'Attaccante',
};

export interface Player {
  id: string;
  name: string;
  role: Role;
  age: number;
  overall: number; // 1–99 (può variare durante la stagione in base al rendimento)
  potential: number; // 1–99 (tetto massimo di crescita)
  value: number; // valore di mercato in euro
  startOverall?: number; // overall a inizio stagione, per mostrare la progressione
}

/** La forma minimale di cui ha bisogno il motore di simulazione. */
export interface PlayerInMatch {
  id: string;
  name: string;
  role: Role;
  overall: number;
}
