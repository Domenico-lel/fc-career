import { useMemo, useState } from 'react';
import { useGame } from '../../state/GameContext';
import {
  getUserTeam,
  isMarketOpen,
  totalRounds,
  RULES,
} from '../../domain/game/gameService';
import type { Player } from '../../domain/models/Player';
import { formatMoney } from '../format';

interface MarketEntry extends Player {
  teamId: string;
  teamName: string;
}

export default function MarketScreen() {
  const { state, buyPlayer, sellPlayer } = useGame();
  const [query, setQuery] = useState('');

  // Tutti i giocatori acquistabili (delle altre squadre), filtrabili per nome.
  const market = useMemo<MarketEntry[]>(() => {
    if (!state) return [];
    const list: MarketEntry[] = [];
    for (const t of state.teams) {
      if (t.id === state.userTeamId) continue;
      for (const p of t.players) list.push({ ...p, teamId: t.id, teamName: t.name });
    }
    return list.sort((a, b) => b.overall - a.overall);
  }, [state]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? market.filter((p) => p.name.toLowerCase().includes(q)) : market;
    return base.slice(0, 40);
  }, [market, query]);

  if (!state) return null;

  const open = isMarketOpen(state);
  const userTeam = getUserTeam(state);
  if (!userTeam) return null;

  const canSell = userTeam.players.length > RULES.MIN_SQUAD_SIZE;
  const roundsLeft = RULES.MARKET_OPEN_UNTIL_ROUND - state.currentRound + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Budget</p>
          <p className="text-2xl font-bold text-emerald-400">{formatMoney(state.budget)}</p>
        </div>
        <div className="text-right text-xs">
          {open ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-medium text-emerald-300">
              Mercato aperto · {roundsLeft} giornat{roundsLeft === 1 ? 'a' : 'e'} rimast
              {roundsLeft === 1 ? 'a' : 'e'}
            </span>
          ) : (
            <span className="rounded-full bg-slate-800 px-3 py-1 font-medium text-slate-400">
              Mercato chiuso
            </span>
          )}
        </div>
      </div>

      {!open && (
        <p className="rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
          Il mercato è aperto solo nelle prime {RULES.MARKET_OPEN_UNTIL_ROUND} giornate (su{' '}
          {totalRounds(state)}). Ora puoi solo consultare le rose.
        </p>
      )}

      {/* ─── VENDI: la tua rosa ─── */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          La tua rosa ({userTeam.players.length})
        </h2>
        {!canSell && open && (
          <p className="mb-2 text-xs text-amber-400">
            Rosa al minimo ({RULES.MIN_SQUAD_SIZE}): non puoi vendere altri giocatori.
          </p>
        )}
        <div className="space-y-1.5">
          {[...userTeam.players]
            .sort((a, b) => b.overall - a.overall)
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
              >
                <span className="w-9 rounded bg-slate-800 px-1.5 py-0.5 text-center text-xs text-slate-300">
                  {p.role}
                </span>
                <span className="flex-1 font-medium text-white">{p.name}</span>
                <span className="text-xs text-slate-400">OVR {Math.round(p.overall)}</span>
                <span className="w-16 text-right text-xs text-slate-300">{formatMoney(p.value)}</span>
                <button
                  disabled={!open || !canSell}
                  onClick={() => sellPlayer(p.id)}
                  className="rounded-md bg-red-500/80 px-2.5 py-1 text-xs font-semibold text-white transition enabled:hover:bg-red-500 disabled:opacity-30"
                >
                  Vendi
                </button>
              </div>
            ))}
        </div>
      </section>

      {/* ─── COMPRA: altri giocatori ─── */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Acquisti
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca un giocatore per nome…"
          className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <div className="space-y-1.5">
          {filtered.map((p) => {
            const tooExpensive = p.value > state.budget;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
              >
                <span className="w-9 rounded bg-slate-800 px-1.5 py-0.5 text-center text-xs text-slate-300">
                  {p.role}
                </span>
                <span className="flex-1 font-medium text-white">
                  {p.name}
                  <span className="ml-2 text-xs text-slate-500">{p.teamName}</span>
                </span>
                <span className="text-xs text-slate-400">OVR {Math.round(p.overall)}</span>
                <span
                  className={`w-16 text-right text-xs ${tooExpensive ? 'text-red-400' : 'text-slate-300'}`}
                >
                  {formatMoney(p.value)}
                </span>
                <button
                  disabled={!open || tooExpensive}
                  onClick={() => buyPlayer(p.id)}
                  className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-slate-950 transition enabled:hover:bg-emerald-400 disabled:opacity-30"
                >
                  Acquista
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
