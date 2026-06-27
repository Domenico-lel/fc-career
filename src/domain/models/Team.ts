import type { Player } from './Player';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  players: Player[];
}

/** Overall medio della rosa, utile per UI e selezione avversari. */
export function teamAverageOverall(team: Team): number {
  if (team.players.length === 0) return 0;
  const sum = team.players.reduce((s, p) => s + p.overall, 0);
  return Math.round(sum / team.players.length);
}
