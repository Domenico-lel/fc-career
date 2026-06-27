import { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { teamAverageOverall } from '../../domain/models/Team';

/** Schermata iniziale: scelta della squadra da allenare. */
export default function StartScreen() {
  const { availableTeams, startNewGame } = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white">⚽ FC Career</h1>
      <p className="mt-2 text-slate-400">
        Modalità Carriera Allenatore · Scegli la squadra da guidare in questa stagione.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {availableTeams.map((team) => {
          const isSelected = selected === team.id;
          return (
            <button
              key={team.id}
              onClick={() => setSelected(team.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{team.name}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  OVR {teamAverageOverall(team)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{team.players.length} giocatori in rosa</p>
            </button>
          );
        })}
      </div>

      <button
        disabled={!selected}
        onClick={() => selected && startNewGame(selected)}
        className="mt-8 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 transition enabled:hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Inizia la carriera
      </button>
    </div>
  );
}
