import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { getLineupSlots, getUserBench, getUserFormation } from '../../domain/game/gameService';
import { ROLE_LABELS } from '../../domain/models/Player';
import type { Player } from '../../domain/models/Player';
import { FORMATIONS, POSITION_LABELS, positionFit } from '../../domain/models/Formation';
import type { FormationSlot } from '../../domain/models/Formation';

type Selection = { kind: 'slot'; index: number } | { kind: 'player'; id: string } | null;

export default function RosterScreen() {
  const { state, setFormation, assignToSlot } = useGame();
  const [sel, setSel] = useState<Selection>(null);
  if (!state) return null;

  const formation = getUserFormation(state);
  const lineup = getLineupSlots(state, state.userTeamId); // allineato a formation.slots
  const bench = getUserBench(state);

  const handleSlot = (index: number) => {
    if (!sel) return setSel({ kind: 'slot', index });
    if (sel.kind === 'slot') {
      if (sel.index === index) return setSel(null);
      const mover = lineup[sel.index]?.player; // sposta l'occupante della casella selezionata
      if (mover) assignToSlot(index, mover.id);
      return setSel(null);
    }
    // un giocatore (di solito panchina) → entra in questa casella
    assignToSlot(index, sel.id);
    setSel(null);
  };

  const handleBench = (id: string) => {
    if (sel?.kind === 'slot') {
      assignToSlot(sel.index, id);
      return setSel(null);
    }
    if (sel?.kind === 'player' && sel.id === id) return setSel(null);
    setSel({ kind: 'player', id });
  };

  return (
    <div className="space-y-6">
      {/* Selettore di modulo */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Modulo
        </h2>
        <div className="flex flex-wrap gap-2">
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFormation(f.id);
                setSel(null);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                formation.id === f.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </section>

      <p className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
        💡 Tocca una posizione e poi un giocatore (in campo o in panchina) per assegnarlo. Un
        giocatore fuori ruolo (⚠) rende meno in quella posizione.
      </p>

      {/* Campo */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-emerald-800/40 to-emerald-950/60">
        <Pitch />
        {formation.slots.map((slot, i) => (
          <SlotChip
            key={i}
            slot={slot}
            player={lineup[i]?.player}
            selected={sel?.kind === 'slot' && sel.index === i}
            highlight={sel?.kind === 'player'}
            onTap={() => handleSlot(i)}
          />
        ))}
      </div>

      {/* Panchina */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Panchina ({bench.length})
        </h2>
        <div className="space-y-1.5">
          {bench.map((p) => (
            <BenchRow
              key={p.id}
              player={p}
              selected={sel?.kind === 'player' && sel.id === p.id}
              targetSlot={sel?.kind === 'slot' ? formation.slots[sel.index] : undefined}
              onTap={() => handleBench(p.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Linee del campo: solo decorazione. */
function Pitch() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/15" />
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
      <div className="absolute bottom-0 left-1/2 h-16 w-32 -translate-x-1/2 border-x border-t border-white/15" />
      <div className="absolute left-1/2 top-0 h-16 w-32 -translate-x-1/2 border-x border-b border-white/15" />
    </div>
  );
}

function SlotChip({
  slot,
  player,
  selected,
  highlight,
  onTap,
}: {
  slot: FormationSlot;
  player?: Player;
  selected: boolean;
  highlight: boolean;
  onTap: () => void;
}) {
  const outOfPosition = player ? player.role !== slot.role : false;
  const eff = player ? Math.round(player.overall * positionFit(player.role, slot.role)) : 0;

  return (
    <button
      onClick={onTap}
      style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
      className={`absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg border px-1 py-1 text-center transition ${
        selected
          ? 'border-emerald-300 bg-emerald-500/30'
          : outOfPosition
            ? 'border-red-500 bg-red-900/70 hover:border-red-400'
            : highlight
              ? 'border-emerald-500/60 bg-slate-900/80'
              : 'border-slate-600/60 bg-slate-900/80 hover:border-slate-400'
      }`}
    >
      <span className="rounded bg-slate-800 px-1 text-[10px] font-bold text-emerald-300">
        {slot.code}
      </span>
      {player ? (
        <>
          <span className="w-full truncate text-[11px] font-medium leading-tight text-white">
            {player.name}
          </span>
          <span className="flex items-center gap-1 text-[10px]">
            <span className="font-semibold text-emerald-400">{eff}</span>
            {outOfPosition && <span title="Fuori ruolo">⚠</span>}
          </span>
        </>
      ) : (
        <span className="text-[11px] text-slate-500">—</span>
      )}
    </button>
  );
}

function BenchRow({
  player,
  selected,
  targetSlot,
  onTap,
}: {
  player: Player;
  selected: boolean;
  targetSlot?: FormationSlot;
  onTap: () => void;
}) {
  // Se è selezionata una casella, mostriamo l'overall effettivo del panchinaro in quella posizione.
  const eff = targetSlot ? Math.round(player.overall * positionFit(player.role, targetSlot.role)) : null;
  const wouldBeOut = targetSlot ? player.role !== targetSlot.role : false;

  return (
    <button
      onClick={onTap}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
        selected
          ? 'border-emerald-400 bg-emerald-500/15'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
      }`}
    >
      <span className="w-9 rounded bg-slate-800 px-1.5 py-0.5 text-center text-xs text-slate-300">
        {player.role}
      </span>
      <span className="flex-1 font-medium text-white">{player.name}</span>
      <span className="hidden text-xs text-slate-500 sm:inline">{ROLE_LABELS[player.role]}</span>
      <span className="w-8 text-center text-xs text-slate-400">{player.age}a</span>
      {eff !== null ? (
        <span className="flex w-16 items-center justify-end gap-1 text-xs">
          <span className="text-slate-500">{POSITION_LABELS[targetSlot!.code].split(' ')[0]}:</span>
          <span className="font-semibold text-emerald-400">{eff}</span>
          {wouldBeOut && <span title="Fuori ruolo">⚠</span>}
        </span>
      ) : (
        <OverallBadge player={player} />
      )}
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
