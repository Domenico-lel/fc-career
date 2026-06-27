import type { Team } from '../../domain/models/Team';
import serieAData from './serieA.json';

/**
 * Database iniziale (seed): le 20 squadre di Serie A 2025/26 con rose reali.
 *
 * I dati provengono dal dataset EA FC 26 e sono generati da `dataset/import.mjs`
 * nel file `serieA.json`. Per aggiornarli (es. dopo un mercato) basta
 * sostituire il CSV in `dataset/` e ri-eseguire l'import: nessun'altra parte
 * dell'app va toccata.
 */
export function buildSeedTeams(): Team[] {
  // Deep clone per evitare che lo stato di gioco muti i dati seed condivisi.
  return (serieAData as unknown as Team[]).map((t) => ({
    ...t,
    players: t.players.map((p) => ({ ...p })),
  }));
}
