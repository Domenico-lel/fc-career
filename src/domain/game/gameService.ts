import type { GameState } from './GameState';
import type { Team } from '../models/Team';
import type { Player, PlayerInMatch, Role } from '../models/Player';
import type { Fixture } from '../models/Match';
import { generateSchedule } from '../league/schedule';
import { simulateMatch } from '../engine/matchEngine';
import type { MatchResult, MatchTeam } from '../engine/matchEngine';

// Incrementare quando cambia la struttura dati o il database squadre:
// i salvataggi con versione diversa verranno scartati al caricamento.
export const SAVE_VERSION = 4;

/** Modulo titolare di default (4-3-3) usato per la selezione automatica. */
const FORMATION: Record<Role, number> = { GK: 1, DEF: 4, MID: 3, ATT: 3 };

/** Parametri di gioco regolabili. */
export const RULES = {
  STARTING_BUDGET: 50_000_000, // budget di mercato iniziale (euro)
  MARKET_OPEN_UNTIL_ROUND: 4, // mercato aperto fino a questa giornata inclusa
  MIN_SQUAD_SIZE: 14, // non si può scendere sotto questo numero vendendo
  SELL_FACTOR: 0.9, // quota del valore recuperata in caso di vendita
  // Variazione di overall in base al risultato (form), applicata ai titolari.
  // Pari = 0 così la spinta è puramente legata a vittorie/sconfitte.
  FORM_WIN: 0.2,
  FORM_DRAW: 0,
  FORM_LOSS: -0.2,
  OVERALL_FLOOR: 40,
};

// ─── Ciclo di vita della stagione ──────────────────────────────────────────

export function createNewGame(teams: Team[], userTeamId: string, seasonName: string): GameState {
  // Salviamo l'overall di partenza di ogni giocatore per mostrarne la crescita.
  const teamsWithBaseline = teams.map((t) => ({
    ...t,
    players: t.players.map((p) => ({ ...p, startOverall: p.overall })),
  }));

  const userTeam = teamsWithBaseline.find((t) => t.id === userTeamId);
  const userLineup = userTeam ? selectStarters(userTeam).map((p) => p.id) : [];

  return {
    version: SAVE_VERSION,
    seasonName,
    userTeamId,
    teams: teamsWithBaseline,
    fixtures: generateSchedule(teams.map((t) => t.id)),
    currentRound: 1,
    budget: RULES.STARTING_BUDGET,
    userLineup,
  };
}

export function totalRounds(state: GameState): number {
  return state.fixtures.reduce((max, f) => Math.max(max, f.round), 0);
}

export function isSeasonOver(state: GameState): boolean {
  return state.currentRound > totalRounds(state);
}

export function isMarketOpen(state: GameState): boolean {
  return !isSeasonOver(state) && state.currentRound <= RULES.MARKET_OPEN_UNTIL_ROUND;
}

// ─── Squadre e formazioni ───────────────────────────────────────────────────

export function getTeam(state: GameState, teamId: string): Team | undefined {
  return state.teams.find((t) => t.id === teamId);
}

export function getUserTeam(state: GameState): Team | undefined {
  return getTeam(state, state.userTeamId);
}

/**
 * Selezione automatica degli 11: i migliori per ruolo secondo il modulo,
 * con completamento fino a 11 se un reparto è scoperto.
 */
export function selectStarters(team: Team): Player[] {
  const byRole: Record<Role, Player[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const p of team.players) byRole[p.role].push(p);
  for (const role of Object.keys(byRole) as Role[]) {
    byRole[role].sort((a, b) => b.overall - a.overall);
  }

  const starters: Player[] = [];
  const used = new Set<string>();
  for (const role of Object.keys(FORMATION) as Role[]) {
    for (const p of byRole[role].slice(0, FORMATION[role])) {
      starters.push(p);
      used.add(p.id);
    }
  }
  if (starters.length < 11) {
    const rest = team.players.filter((p) => !used.has(p.id)).sort((a, b) => b.overall - a.overall);
    for (const p of rest) {
      if (starters.length >= 11) break;
      starters.push(p);
    }
  }
  return starters;
}

/** Normalizza una lista di id titolari: validi, senza duplicati, esattamente 11. */
function normalizeLineup(team: Team, lineupIds: string[]): string[] {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of lineupIds) {
    if (byId.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  if (result.length < 11) {
    const rest = team.players.filter((p) => !seen.has(p.id)).sort((a, b) => b.overall - a.overall);
    for (const p of rest) {
      if (result.length >= 11) break;
      result.push(p.id);
    }
  }
  return result.slice(0, 11);
}

/** Gli 11 titolari "effettivi": per l'utente la sua formazione, per le AI l'auto. */
export function getLineup(state: GameState, teamId: string): Player[] {
  const team = getTeam(state, teamId);
  if (!team) return [];
  if (teamId !== state.userTeamId) return selectStarters(team);

  const ids = normalizeLineup(team, state.userLineup);
  const byId = new Map(team.players.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)!).filter(Boolean);
}

export function getUserStarters(state: GameState): Player[] {
  return getLineup(state, state.userTeamId);
}

export function getUserBench(state: GameState): Player[] {
  const team = getUserTeam(state);
  if (!team) return [];
  const starterIds = new Set(getUserStarters(state).map((p) => p.id));
  return team.players.filter((p) => !starterIds.has(p.id)).sort((a, b) => b.overall - a.overall);
}

/** Scambia un titolare con un giocatore della panchina (o viceversa). */
export function swapStarter(state: GameState, outId: string, inId: string): GameState {
  const team = getUserTeam(state);
  if (!team) return state;

  const lineup = normalizeLineup(team, state.userLineup);
  const outIdx = lineup.indexOf(outId);
  const inAlready = lineup.indexOf(inId);

  let next: string[];
  if (outIdx !== -1 && inAlready === -1) {
    next = lineup.map((id) => (id === outId ? inId : id)); // panchina → titolare
  } else if (outIdx === -1 && inAlready !== -1) {
    next = lineup.map((id) => (id === inId ? outId : id));
  } else {
    return state; // entrambi titolari o entrambi in panchina: niente da fare
  }
  return { ...state, userLineup: next };
}

// ─── Mercato ─────────────────────────────────────────────────────────────────

/** Acquista un giocatore da un'altra squadra (mercato aperto, budget sufficiente). */
export function buyPlayer(state: GameState, playerId: string): GameState {
  if (!isMarketOpen(state)) return state;

  const seller = state.teams.find(
    (t) => t.id !== state.userTeamId && t.players.some((p) => p.id === playerId),
  );
  if (!seller) return state;
  const player = seller.players.find((p) => p.id === playerId)!;
  if (player.value > state.budget) return state;

  const teams = state.teams.map((t) => {
    if (t.id === seller.id) return { ...t, players: t.players.filter((p) => p.id !== playerId) };
    if (t.id === state.userTeamId) return { ...t, players: [...t.players, player] };
    return t;
  });

  return { ...state, teams, budget: state.budget - player.value };
}

/** Vende un giocatore della propria rosa (mercato aperto, rosa minima rispettata). */
export function sellPlayer(state: GameState, playerId: string): GameState {
  if (!isMarketOpen(state)) return state;

  const userTeam = getUserTeam(state);
  if (!userTeam) return state;
  const player = userTeam.players.find((p) => p.id === playerId);
  if (!player) return state;
  if (userTeam.players.length <= RULES.MIN_SQUAD_SIZE) return state;

  const teams = state.teams.map((t) =>
    t.id === state.userTeamId ? { ...t, players: t.players.filter((p) => p.id !== playerId) } : t,
  );

  // Se il venduto era titolare, la formazione viene ricompletata.
  const updatedUser = teams.find((t) => t.id === state.userTeamId)!;
  const userLineup = normalizeLineup(updatedUser, state.userLineup);

  return {
    ...state,
    teams,
    userLineup,
    budget: state.budget + Math.round(player.value * RULES.SELL_FACTOR),
  };
}

// ─── Simulazione della giornata + evoluzione overall ─────────────────────────

export function playNextRound(state: GameState): GameState {
  if (isSeasonOver(state)) return state;

  const round = state.currentRound;
  const overallDeltas = new Map<string, number>();

  const fixtures = state.fixtures.map((f) => {
    if (f.round !== round || f.result) return f;
    const home = getTeam(state, f.homeTeamId);
    const away = getTeam(state, f.awayTeamId);
    if (!home || !away) return f;

    const homeXI = getLineup(state, home.id);
    const awayXI = getLineup(state, away.id);
    const result = simulateMatch(toMatchTeam(home, homeXI), toMatchTeam(away, awayXI), {
      seed: hashSeed(f.id),
    });

    accumulateForm(overallDeltas, homeXI, result.homeGoals, result.awayGoals);
    accumulateForm(overallDeltas, awayXI, result.awayGoals, result.homeGoals);
    return { ...f, result };
  });

  // Applichiamo le variazioni di overall ai giocatori che hanno giocato.
  const teams = state.teams.map((t) => ({
    ...t,
    players: t.players.map((p) => {
      const delta = overallDeltas.get(p.id);
      if (!delta) return p;
      const cap = p.potential;
      const next = clamp(round1(p.overall + delta), RULES.OVERALL_FLOOR, cap);
      return { ...p, overall: next };
    }),
  }));

  return { ...state, teams, fixtures, currentRound: round + 1 };
}

// ─── Helper interni ──────────────────────────────────────────────────────────

function accumulateForm(
  deltas: Map<string, number>,
  lineup: Player[],
  goalsFor: number,
  goalsAgainst: number,
): void {
  const delta =
    goalsFor > goalsAgainst ? RULES.FORM_WIN : goalsFor < goalsAgainst ? RULES.FORM_LOSS : RULES.FORM_DRAW;
  for (const p of lineup) {
    deltas.set(p.id, (deltas.get(p.id) ?? 0) + delta);
  }
}

function toMatchTeam(team: Team, lineup: Player[]): MatchTeam {
  const mapped: PlayerInMatch[] = lineup.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    overall: p.overall,
  }));
  return { id: team.id, name: team.name, lineup: mapped };
}

/** Hash stabile (FNV-1a) per ricavare un seed deterministico dall'id partita. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Riesportiamo i tipi usati dalle schermate per comodità.
export type { Fixture, MatchResult };
