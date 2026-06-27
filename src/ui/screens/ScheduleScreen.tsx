import { useGame } from '../../state/GameContext';
import { totalRounds } from '../../domain/game/gameService';
import type { Fixture } from '../../domain/models/Match';

export default function ScheduleScreen() {
  const { state } = useGame();
  if (!state) return null;

  const nameOf = (id: string) => state.teams.find((t) => t.id === id)?.shortName ?? id;
  const max = totalRounds(state);

  const byRound: Fixture[][] = [];
  for (let r = 1; r <= max; r++) {
    byRound.push(state.fixtures.filter((f) => f.round === r));
  }

  return (
    <div className="space-y-4">
      {byRound.map((fixtures, idx) => {
        const round = idx + 1;
        const isCurrent = round === state.currentRound;
        return (
          <section key={round}>
            <h3
              className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                isCurrent ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              Giornata {round} {isCurrent && '· prossima'}
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              {fixtures.map((f) => {
                const involvesUser =
                  f.homeTeamId === state.userTeamId || f.awayTeamId === state.userTeamId;
                return (
                  <div
                    key={f.id}
                    className={`flex items-center justify-center gap-3 border-b border-slate-800/60 px-3 py-1.5 text-sm last:border-0 ${
                      involvesUser ? 'text-emerald-300' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-12 text-right font-medium">{nameOf(f.homeTeamId)}</span>
                    <span className="w-12 text-center tabular-nums text-slate-400">
                      {f.result ? `${f.result.homeGoals}-${f.result.awayGoals}` : 'vs'}
                    </span>
                    <span className="w-12 text-left font-medium">{nameOf(f.awayTeamId)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
