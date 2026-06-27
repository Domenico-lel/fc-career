import type { MatchResult } from '../engine/matchEngine';

/** Una partita in calendario. `result` è assente finché non viene giocata. */
export interface Fixture {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  result?: MatchResult;
}
