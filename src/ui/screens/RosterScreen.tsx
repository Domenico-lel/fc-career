import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { getUserStarters, getUserBench } from '../../domain/game/gameService';
import { ROLE_LABELS } from '../../domain/models/Player';
import type { Player } from '../../domain/models/Player';

export default function RosterScreen() {
  const { state, swapStarter } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;

  const starters = getUserStarters(state);
  const bench = getUserBench(state);
  const starterIds = new Set(starters.map((p) => p.id));

  // Tap-to-swap: seleziona un giocatore, poi tocca un altro per scambiarli.
  const handleTap = (id: string) => {
    if (selected === null) {
      setSelected(id);
      return;
    }
    if (selected === id) {
      setSelected(null);
      return;
    }
    const aStarter = starterIds.has(selected);
    const bStarter = starterIds.has(id);
    if (aStarter !== bStarter) {
      // uno è titolare e l'altro in panchina → scambio valido
      const outId = aStarter ? selected : id;
      const inId = aStarter ? id : selected;
      swapStarter(outId, inId);
      setSelected(null);
    } else {
      setSelected(id); // stessa categoria: sposto solo la selezione
    }
  };

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
        💡 Tocca un titolare e poi un giocatore in panchina (o viceversa) per scambiarli.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Titolari ({starters.length})
        </h2>
        <div className="space-y-1.5">
          {starters.map((p) => (
            <PlayerRow key={p.id} player={p} selected={selected === p.id} onTap={handleTap} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Panchina ({bench.length})
        </h2>
        <div className="space-y-1.5">
          {bench.map((p) => (
            <PlayerRow key={p.id} player={p} selected={selected === p.id} onTap={handleTap} dim />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlayerRow({
  player,
  selected,
  onTap,
  dim,
}: {
  player: Player;
  selected: boolean;
  onTap: (id: string) => void;
  dim?: boolean;
}) {
  return (
    <button
      onClick={() => onTap(player.id)}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
        selected
          ? 'border-emerald-400 bg-emerald-500/15'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
      } ${dim ? 'opacity-80' : ''}`}
    >
      <span className="w-9 rounded bg-slate-800 px-1.5 py-0.5 text-center text-xs text-slate-300">
        {player.role}
      </span>
      <span className="flex-1 font-medium text-white">{player.name}</span>
      <span className="hidden text-xs text-slate-500 sm:inline">{ROLE_LABELS[player.role]}</span>
      <span className="w-8 text-center text-xs text-slate-400">{player.age}a</span>
      <OverallBadge player={player} />
    </button>
  );
}

/** Overall con freccia di progressione rispetto all'inizio stagione. */
function OverallBadge({ player }: { player: Player }) {
  const ovr = Math.round(player.overall);
  const start = player.startOverall !== undefined ? Math.round(player.startOverall) : ovr;
  const diff = ovr - start;
  return (
    <span className="flex w-14 items-center justify-end gap-1">
      <span className="font-semibold text-emerald-400">{ovr}</span>
      {diff !== 0 && (
        <span className={`text-[10px] ${diff > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {diff > 0 ? `▲${diff}` : `▼${-diff}`}
        </span>
      )}
    </span>
  );
}
