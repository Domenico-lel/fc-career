import type { GameState } from './GameState';
import type { Team } from '../models/Team';
import type { Player, PlayerInMatch, Role } from '../models/Player';
import type { Fixture } from '../models/Match';
import type { Formation, FormationSlot } from '../models/Formation';
import { getFormation, DEFAULT_FORMATION_ID, positionFit } from '../models/Formation';
import { generateSchedule } from '../league/schedule';
import { simulateMatch } from '../engine/matchEngine';
import type { MatchResult, MatchTeam } from '../engine/matchEngine';

// Incrementare quando cambia la struttura dati o il database squadre:
// i salvataggi con versione diversa verranno scartati al caricamento.
export const SAVE_VERSION = 5;

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

export function createNewGame(
  teams: Team[],
  userTeamId: string,
  seasonName: string,
  formationId: string = DEFAULT_FORMATION_ID,
): GameState {
  // Salviamo l'overall di partenza di ogni giocatore per mostrarne la crescita.
  const teamsWithBaseline = teams.map((t) => ({
    ...t,
    players: t.players.map((p) => ({ ...p, startOverall: p.overall })),
  }));

  const formation = getFormation(formationId);
  const userTeam = teamsWithBaseline.find((t) => t.id === userTeamId);
  const userLineup = userTeam ? autoLineupIds(userTeam, formation) : [];

  return {
    version: SAVE_VERSION,
    seasonName,
    userTeamId,
    teams: teamsWithBaseline,
    fixtures: generateSchedule(teams.map((t) => t.id)),
    currentRound: 1,
    budget: RULES.STARTING_BUDGET,
    formation: formation.id,
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
 * Selezione automatica allineata alle caselle del modulo: ogni casella prende
 * il miglior giocatore disponibile *del suo reparto*; le caselle scoperte vengono
 * poi completate con il miglior giocatore rimasto pesato per adattamento (fuori
 * ruolo). Restituisce gli id allineati: result[i] copre formation.slots[i].
 */
export function autoLineupIds(team: Team, formation: Formation): string[] {
  const ids: (string | null)[] = formation.slots.map(() => null);
  const used = new Set<string>();
  const available = () => team.players.filter((p) => !used.has(p.id));

  // 1° passaggio: assegna in ruolo, dalle caselle al miglior giocatore del reparto.
  formation.slots.forEach((slot, i) => {
    const best = available()
      .filter((p) => p.role === slot.role)
      .sort((a, b) => b.overall - a.overall)[0];
    if (best) {
      ids[i] = best.id;
      used.add(best.id);
    }
  });

  // 2° passaggio: caselle ancora vuote → miglior giocatore rimasto per adattamento.
  formation.slots.forEach((slot, i) => {
    if (ids[i]) return;
    const best = available().sort(
      (a, b) =>
        b.overall * positionFit(b.role, slot.role) - a.overall * positionFit(a.role, slot.role),
    )[0];
    if (best) {
      ids[i] = best.id;
      used.add(best.id);
    }
  });

  return ids.filter((id): id is string => id !== null);
}

/**
 * Normalizza una formazione salvata rispetto al modulo corrente: scarta id non
 * più validi o duplicati, mantenendo la posizione, e ricompleta le caselle vuote.
 */
export function normalizeLineup(team: Team, formation: Formation, lineupIds: string[]): string[] {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const slots = formation.slots;
  const ids: (string | null)[] = slots.map((_, i) => {
    const id = lineupIds[i];
    return id && byId.has(id) ? id : null;
  });

  // Rimuovi duplicati (mantieni la prima occorrenza).
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    if (seen.has(id)) ids[i] = null;
    else seen.add(id);
  }

  // Completa le caselle vuote con il miglior giocatore non schierato per adattamento.
  slots.forEach((slot, i) => {
    if (ids[i]) return;
    const best = team.players
      .filter((p) => !seen.has(p.id))
      .sort(
        (a, b) =>
          b.overall * positionFit(b.role, slot.role) - a.overall * positionFit(a.role, slot.role),
      )[0];
    if (best) {
      ids[i] = best.id;
      seen.add(best.id);
    }
  });

  return ids.filter((id): id is string => id !== null);
}

/** Il modulo scelto dall'utente. */
export function getUserFormation(state: GameState): Formation {
  return getFormation(state.formation);
}

/** Coppie (giocatore, casella) per una squadra, allineate al modulo. */
export function getLineupSlots(
  state: GameState,
  teamId: string,
): { player: Player; slot: FormationSlot }[] {
  const team = getTeam(state, teamId);
  if (!team) return [];
  const isUser = teamId === state.userTeamId;
  const formation = isUser ? getUserFormation(state) : getFormation(DEFAULT_FORMATION_ID);
  const ids = isUser
    ? normalizeLineup(team, formation, state.userLineup)
    : autoLineupIds(team, formation);
  const byId = new Map(team.players.map((p) => [p.id, p]));
  return ids
    .map((id, i) => ({ player: byId.get(id)!, slot: formation.slots[i] }))
    .filter((x) => x.player);
}

/** Gli 11 titolari "effettivi", in ordine di casella. */
export function getLineup(state: GameState, teamId: string): Player[] {
  return getLineupSlots(state, teamId).map((x) => x.player);
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

/** Cambia modulo, riposizionando i titolari attuali nelle nuove caselle. */
export function setFormation(state: GameState, formationId: string): GameState {
  const team = getUserTeam(state);
  const formation = getFormation(formationId);
  if (!team) return { ...state, formation: formation.id };

  // Manteniamo gli undici già schierati, riassegnandoli alle nuove caselle in ruolo.
  const current = normalizeLineup(team, getUserFormation(state), state.userLineup);
  const currentPlayers = current
    .map((id) => team.players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const slots = formation.slots;
  const ids: (string | null)[] = slots.map(() => null);
  const used = new Set<string>();
  const pool = () => currentPlayers.filter((p) => !used.has(p.id));

  slots.forEach((slot, i) => {
    const best = pool()
      .filter((p) => p.role === slot.role)
      .sort((a, b) => b.overall - a.overall)[0];
    if (best) {
      ids[i] = best.id;
      used.add(best.id);
    }
  });
  slots.forEach((slot, i) => {
    if (ids[i]) return;
    const best = pool().sort(
      (a, b) =>
        b.overall * positionFit(b.role, slot.role) - a.overall * positionFit(a.role, slot.role),
    )[0];
    if (best) {
      ids[i] = best.id;
      used.add(best.id);
    }
  });

  const userLineup = normalizeLineup(team, formation, ids.filter((id): id is string => id !== null));
  return { ...state, formation: formation.id, userLineup };
}

/**
 * Assegna un giocatore a una casella. Se il giocatore è già titolare in un'altra
 * casella, le due si scambiano (cambio di posizione); se è in panchina, prende il
 * posto dell'occupante, che torna in panchina.
 */
export function assignToSlot(state: GameState, slotIndex: number, playerId: string): GameState {
  const team = getUserTeam(state);
  if (!team || !team.players.some((p) => p.id === playerId)) return state;

  const formation = getUserFormation(state);
  if (slotIndex < 0 || slotIndex >= formation.slots.length) return state;

  const lineup = normalizeLineup(team, formation, state.userLineup);
  if (lineup[slotIndex] === playerId) return state;

  const currentIndex = lineup.indexOf(playerId);
  const next = [...lineup];
  if (currentIndex !== -1) {
    // Scambio di posizione tra due titolari.
    next[currentIndex] = lineup[slotIndex];
    next[slotIndex] = playerId;
  } else {
    // Dalla panchina: l'occupante esce, ritorna disponibile.
    next[slotIndex] = playerId;
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
  const userLineup = normalizeLineup(updatedUser, getUserFormation(state), state.userLineup);

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

    const homeXI = getLineupSlots(state, home.id);
    const awayXI = getLineupSlots(state, away.id);
    const result = simulateMatch(toMatchTeam(home, homeXI), toMatchTeam(away, awayXI), {
      seed: hashSeed(f.id),
    });

    accumulateForm(overallDeltas, homeXI.map((x) => x.player), result.homeGoals, result.awayGoals);
    accumulateForm(overallDeltas, awayXI.map((x) => x.player), result.awayGoals, result.homeGoals);
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

/**
 * Converte la formazione in input per il motore. Ogni giocatore entra con il
 * RUOLO DELLA CASELLA in cui gioca e con l'overall ridotto dal fattore di
 * adattamento se è fuori ruolo: così il motore (invariato) tiene conto sia della
 * posizione tattica sia della penalità per chi gioca fuori reparto.
 */
function toMatchTeam(team: Team, lineup: { player: Player; slot: FormationSlot }[]): MatchTeam {
  const mapped: PlayerInMatch[] = lineup.map(({ player, slot }) => ({
    id: player.id,
    name: player.name,
    role: slot.role,
    overall: player.overall * positionFit(player.role, slot.role),
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
