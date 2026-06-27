import type { Fixture } from '../models/Match';

const BYE = '__BYE__';

/**
 * Genera un calendario a girone all'italiana con andata e ritorno
 * (round-robin doppio) usando il "circle method".
 * Per N squadre produce 2*(N-1) giornate.
 */
export function generateSchedule(teamIds: string[]): Fixture[] {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) ids.push(BYE); // bye se dispari

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  const firstLeg: Fixture[] = [];
  let arr = [...ids];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === BYE || b === BYE) continue;

      // Alterniamo casa/trasferta tra le giornate per equità.
      const home = r % 2 === 0 ? a : b;
      const away = r % 2 === 0 ? b : a;
      firstLeg.push(makeFixture(r + 1, home, away));
    }
    // Rotazione: il primo elemento resta fisso, gli altri ruotano.
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }

  // Ritorno: stesse partite, campi invertiti, giornate successive.
  const returnLeg: Fixture[] = firstLeg.map((f) =>
    makeFixture(f.round + rounds, f.awayTeamId, f.homeTeamId),
  );

  return [...firstLeg, ...returnLeg];
}

function makeFixture(round: number, homeTeamId: string, awayTeamId: string): Fixture {
  return {
    id: `r${round}-${homeTeamId}-${awayTeamId}`,
    round,
    homeTeamId,
    awayTeamId,
  };
}
