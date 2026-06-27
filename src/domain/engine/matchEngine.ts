import { createRng } from './rng';
import type { Rng } from './rng';
import type { PlayerInMatch, Role } from '../models/Player';

// ─── Input / Output del motore ────────────────────────────────────────────

export interface MatchTeam {
  id: string;
  name: string;
  lineup: PlayerInMatch[]; // gli 11 titolari
}

export interface Goal {
  minute: number;
  teamId: string;
  scorerId: string;
  scorerName: string;
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  goals: Goal[]; // ordinati per minuto
  homeStrength: number; // utile per debug / UI
  awayStrength: number;
}

export interface MatchOptions {
  seed?: number; // per risultati riproducibili
}

// ─── Parametri di bilanciamento (tutti qui, facili da ritoccare) ──────────

const CONFIG = {
  // Gol medi attesi per squadra in una partita equilibrata (media reale ~1.35).
  BASE_EXPECTED_GOALS: 1.35,
  // Quanto la differenza di forza incide sui gol attesi. Più alto = più sbilanciato.
  STRENGTH_SENSITIVITY: 1.25,
  // Vantaggio del fattore campo (moltiplicatore sui gol attesi di casa).
  HOME_ADVANTAGE: 1.15,
  // Peso dei reparti nel calcolare attacco / difesa di una squadra.
  ATTACK_WEIGHTS: { GK: 0, DEF: 0.15, MID: 0.5, ATT: 1 } as Record<Role, number>,
  DEFENSE_WEIGHTS: { GK: 1, DEF: 1, MID: 0.4, ATT: 0.1 } as Record<Role, number>,
  // Probabilità che un giocatore segni, per ruolo (combinata con l'overall).
  SCORER_WEIGHTS: { GK: 0.01, DEF: 0.15, MID: 0.5, ATT: 1 } as Record<Role, number>,
  // Limite di sicurezza sui gol (evita partite assurde da estrazioni anomale).
  MAX_GOALS_PER_TEAM: 9,
};

// ─── Funzione pubblica principale ─────────────────────────────────────────

export function simulateMatch(
  home: MatchTeam,
  away: MatchTeam,
  options: MatchOptions = {},
): MatchResult {
  const rng = createRng(options.seed);

  const homeAttack = weightedStrength(home.lineup, CONFIG.ATTACK_WEIGHTS);
  const homeDefense = weightedStrength(home.lineup, CONFIG.DEFENSE_WEIGHTS);
  const awayAttack = weightedStrength(away.lineup, CONFIG.ATTACK_WEIGHTS);
  const awayDefense = weightedStrength(away.lineup, CONFIG.DEFENSE_WEIGHTS);

  // Gol attesi (λ) = forza attacco mia vs difesa avversaria, + fattore campo.
  const homeLambda = expectedGoals(homeAttack, awayDefense) * CONFIG.HOME_ADVANTAGE;
  const awayLambda = expectedGoals(awayAttack, homeDefense);

  const homeGoals = Math.min(poisson(homeLambda, rng), CONFIG.MAX_GOALS_PER_TEAM);
  const awayGoals = Math.min(poisson(awayLambda, rng), CONFIG.MAX_GOALS_PER_TEAM);

  const goals: Goal[] = [
    ...generateGoals(home, homeGoals, rng),
    ...generateGoals(away, awayGoals, rng),
  ].sort((a, b) => a.minute - b.minute);

  return {
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeGoals,
    awayGoals,
    goals,
    homeStrength: Math.round((homeAttack + homeDefense) / 2),
    awayStrength: Math.round((awayAttack + awayDefense) / 2),
  };
}

// ─── Helper interni (privati al modulo) ────────────────────────────────────

/** Media degli overall pesata per ruolo (es. per l'attacco gli ATT contano di più). */
function weightedStrength(lineup: PlayerInMatch[], weights: Record<Role, number>): number {
  let sum = 0;
  let weightTotal = 0;
  for (const p of lineup) {
    const w = weights[p.role];
    sum += p.overall * w;
    weightTotal += w;
  }
  return weightTotal === 0 ? 0 : sum / weightTotal;
}

/** Converte (mio attacco vs difesa avversaria) in gol attesi. */
function expectedGoals(attack: number, defense: number): number {
  const ratio = attack / Math.max(defense, 1);
  const lambda = CONFIG.BASE_EXPECTED_GOALS * Math.pow(ratio, CONFIG.STRENGTH_SENSITIVITY);
  return clamp(lambda, 0.15, 5);
}

/** Estrae un numero di gol da una distribuzione di Poisson (algoritmo di Knuth). */
function poisson(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
}

/** Crea N eventi-gol per una squadra: assegna marcatore e minuto. */
function generateGoals(team: MatchTeam, count: number, rng: Rng): Goal[] {
  const goals: Goal[] = [];
  for (let i = 0; i < count; i++) {
    const scorer = pickScorer(team.lineup, rng);
    goals.push({
      minute: rng.int(90) + 1, // 1–90
      teamId: team.id,
      scorerId: scorer.id,
      scorerName: scorer.name,
    });
  }
  return goals;
}

/** Sceglie chi segna: probabilità ∝ (peso del ruolo × overall). */
function pickScorer(lineup: PlayerInMatch[], rng: Rng): PlayerInMatch {
  const weighted = lineup.map((p) => ({
    player: p,
    weight: CONFIG.SCORER_WEIGHTS[p.role] * p.overall,
  }));
  const total = weighted.reduce((s, w) => s + w.weight, 0);

  let r = rng.next() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.player;
  }
  return weighted[weighted.length - 1].player; // fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
