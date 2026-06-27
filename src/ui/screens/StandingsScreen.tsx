import { useGame } from '../../state/GameContext';
import { computeStandings } from '../../domain/league/standings';

export default function StandingsScreen() {
  const { state } = useGame();
  if (!state) return null;

  const teamIds = state.teams.map((t) => t.id);
  const rows = computeStandings(teamIds, state.fixtures);
  const nameOf = (id: string) => state.teams.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
          <tr>
            <th className="px-2 py-2 text-center">#</th>
            <th className="px-3 py-2 text-left">Squadra</th>
            <th className="px-2 py-2 text-center" title="Giocate">G</th>
            <th className="px-2 py-2 text-center" title="Vinte">V</th>
            <th className="px-2 py-2 text-center" title="Pareggiate">N</th>
            <th className="px-2 py-2 text-center" title="Perse">P</th>
            <th className="px-2 py-2 text-center" title="Differenza reti">DR</th>
            <th className="px-2 py-2 text-center font-bold">Pt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isUser = row.teamId === state.userTeamId;
            return (
              <tr
                key={row.teamId}
                className={`border-t border-slate-800/70 ${
                  isUser ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-300'
                }`}
              >
                <td className="px-2 py-2 text-center text-slate-500">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-white">{nameOf(row.teamId)}</td>
                <td className="px-2 py-2 text-center">{row.played}</td>
                <td className="px-2 py-2 text-center">{row.won}</td>
                <td className="px-2 py-2 text-center">{row.drawn}</td>
                <td className="px-2 py-2 text-center">{row.lost}</td>
                <td className="px-2 py-2 text-center tabular-nums">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="px-2 py-2 text-center font-bold text-white">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
