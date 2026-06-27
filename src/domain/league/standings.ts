import type { Fixture } from '../models/Match';

export interface StandingsRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/**
 * Calcola la classifica a partire dalle partite GIOCATE (con `result`).
 * Pura: stesso input => stessa classifica. Ordine: punti, diff.reti, gol fatti.
 */
export function computeStandings(teamIds: string[], fixtures: Fixture[]): StandingsRow[] {
  const table = new Map<string, StandingsRow>();
  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const f of fixtures) {
    if (!f.result) continue;
    const home = table.get(f.homeTeamId);
    const away = table.get(f.awayTeamId);
    if (!home || !away) continue;

    const { homeGoals, awayGoals } = f.result;
    home.played++;
    away.played++;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (homeGoals < awayGoals) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = [...table.values()];
  for (const row of rows) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamId.localeCompare(b.teamId),
  );

  return rows;
}
