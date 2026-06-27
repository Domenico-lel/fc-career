import { useState } from 'react';
import { useGame } from './state/GameContext';
import { isMarketOpen } from './domain/game/gameService';
import StartScreen from './ui/screens/StartScreen';
import RosterScreen from './ui/screens/RosterScreen';
import MatchScreen from './ui/screens/MatchScreen';
import MarketScreen from './ui/screens/MarketScreen';
import StandingsScreen from './ui/screens/StandingsScreen';
import ScheduleScreen from './ui/screens/ScheduleScreen';

type Tab = 'match' | 'roster' | 'market' | 'standings' | 'schedule';

const TABS: { id: Tab; label: string }[] = [
  { id: 'match', label: 'Partita' },
  { id: 'roster', label: 'Rosa' },
  { id: 'market', label: 'Mercato' },
  { id: 'standings', label: 'Classifica' },
  { id: 'schedule', label: 'Calendario' },
];

export default function App() {
  const { state, resetGame } = useGame();
  const [tab, setTab] = useState<Tab>('match');

  if (!state) return <StartScreen />;

  const marketOpen = isMarketOpen(state);

  const userTeam = state.teams.find((t) => t.id === state.userTeamId);

  return (
    <div className="min-h-screen mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⚽ FC Career</h1>
          <p className="text-sm text-slate-400">
            {userTeam?.name} · {state.seasonName}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Vuoi davvero cancellare la stagione e ricominciare?')) resetGame();
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Nuova stagione
        </button>
      </header>

      <nav className="mb-6 flex gap-1 rounded-xl bg-slate-900/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.label}
            {t.id === 'market' && marketOpen && tab !== 'market' && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'match' && <MatchScreen />}
        {tab === 'roster' && <RosterScreen />}
        {tab === 'market' && <MarketScreen />}
        {tab === 'standings' && <StandingsScreen />}
        {tab === 'schedule' && <ScheduleScreen />}
      </main>
    </div>
  );
}
