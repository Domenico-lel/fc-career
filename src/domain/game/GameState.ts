import type { Team } from '../models/Team';
import type { Fixture } from '../models/Match';

/**
 * Lo stato completo di una partita salvata (una stagione).
 * È un semplice oggetto serializzabile: questo lo rende facile da
 * salvare in localStorage oggi e da inviare a un backend domani.
 */
export interface GameState {
  version: number; // per future migrazioni del formato di salvataggio
  seasonName: string;
  userTeamId: string;
  teams: Team[];
  fixtures: Fixture[];
  currentRound: number; // prossima giornata da giocare (1-based)
  budget: number; // budget di mercato della squadra dell'utente (euro)
  formation: string; // id del modulo scelto dall'utente (es. "4-3-3")
  userLineup: string[]; // id dei titolari, allineato alle caselle del modulo (slot i → userLineup[i])
}
