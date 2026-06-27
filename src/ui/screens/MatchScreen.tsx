import { useGame } from '../../state/GameContext';
import { isSeasonOver, totalRounds } from '../../domain/game/gameService';
import type { Fixture } from '../../domain/models/Match';

export default function MatchScreen() {
  const { state, advanceRound } = useGame();
  if (!state) return null;

  const nameOf = (id: string) => state.teams.find((t) => t.id === id)?.shortName ?? id;
  const max = totalRounds(state);
  const over = isSeasonOver(state);

  const upcoming = state.fixtures.filter((f) => f.round === state.currentRound);
  const lastRound = state.currentRound - 1;
  const lastResults = state.fixtures.filter((f) => f.round === lastRound && f.result);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {over ? (
          <p className="text-center font-semibold text-emerald-400">
            🏆 Stagione conclusa! Controlla la classifica finale.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              Giornata {state.currentRound} di {max}
            </p>
            <div className="mt-3 space-y-2">
              {upcoming.map((f) => (
                <FixtureRow key={f.id} fixture={f} nameOf={nameOf} userTeamId={state.userTeamId} />
              ))}
            </div>
            <button
              onClick={advanceRound}
              className="mt-4 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              ▶ Simula giornata {state.currentRound}
            </button>
          </>
        )}
      </div>

      {lastResults.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Risultati giornata {lastRound}
          </h2>
          <div className="space-y-3">
            {lastResults.map((f) => (
              <ResultCard key={f.id} fixture={f} nameOf={nameOf} userTeamId={state.userTeamId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FixtureRow({
  fixture,
  nameOf,
  userTeamId,
}: {
  fixture: Fixture;
  nameOf: (id: string) => string;
  userTeamId: string;
}) {
  const involvesUser = fixture.homeTeamId === userTeamId || fixture.awayTeamId === userTeamId;
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm ${
        involvesUser ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-300'
      }`}
    >
      <span className="w-16 text-right font-medium">{nameOf(fixture.homeTeamId)}</span>
      <span className="text-xs text-slate-500">vs</span>
      <span className="w-16 text-left font-medium">{nameOf(fixture.awayTeamId)}</span>
    </div>
  );
}

function ResultCard({
  fixture,
  nameOf,
  userTeamId,
}: {
  fixture: Fixture;
  nameOf: (id: string) => string;
  userTeamId: string;
}) {
  const r = fixture.result!;
  const involvesUser = fixture.homeTeamId === userTeamId || fixture.awayTeamId === userTeamId;

  return (
    <div
      className={`rounded-xl border p-3 ${
        involvesUser ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40'
      }`}
    >
      <div className="flex items-center justify-center gap-3 font-semibold text-white">
        <span className="w-20 text-right">{nameOf(fixture.homeTeamId)}</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 tabular-nums">
          {r.homeGoals} - {r.awayGoals}
        </span>
        <span className="w-20 text-left">{nameOf(fixture.awayTeamId)}</span>
      </div>
      {r.goals.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-center text-xs text-slate-400">
          {r.goals.map((g, i) => (
            <li key={i}>
              {g.minute}&apos; ⚽ {g.scorerName} ({nameOf(g.teamId)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
