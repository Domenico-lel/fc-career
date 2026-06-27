import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../domain/game/GameState';
import type { Team } from '../domain/models/Team';
import {
  createNewGame,
  playNextRound,
  swapStarter,
  buyPlayer,
  sellPlayer,
  SAVE_VERSION,
} from '../domain/game/gameService';
import { buildSeedTeams } from '../data/seed/teams';
import { LocalStorageRepository } from '../data/LocalStorageRepository';
import type { GameRepository } from '../data/GameRepository';

interface GameContextValue {
  state: GameState | null;
  availableTeams: Team[];
  startNewGame: (userTeamId: string) => void;
  advanceRound: () => void;
  resetGame: () => void;
  swapStarter: (outId: string, inId: string) => void;
  buyPlayer: (playerId: string) => void;
  sellPlayer: (playerId: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// Un solo punto in cui scegliamo l'implementazione di persistenza.
// Per andare in produzione, qui basterà sostituire con `new ApiGameRepository()`.
const repository: GameRepository = new LocalStorageRepository();

export function GameProvider({ children }: { children: ReactNode }) {
  const availableTeams = useMemo(() => buildSeedTeams(), []);
  const [state, setState] = useState<GameState | null>(() => {
    const saved = repository.load();
    // Scartiamo i salvataggi di una versione precedente (es. vecchio elenco squadre).
    if (saved && saved.version !== SAVE_VERSION) {
      repository.clear();
      return null;
    }
    return saved;
  });

  // Persistiamo automaticamente a ogni cambio di stato.
  useEffect(() => {
    if (state) repository.save(state);
  }, [state]);

  const value: GameContextValue = {
    state,
    availableTeams,
    startNewGame: (userTeamId) => {
      const teams = buildSeedTeams();
      setState(createNewGame(teams, userTeamId, 'Stagione 2026/27'));
    },
    advanceRound: () => {
      setState((prev) => (prev ? playNextRound(prev) : prev));
    },
    resetGame: () => {
      repository.clear();
      setState(null);
    },
    swapStarter: (outId, inId) => {
      setState((prev) => (prev ? swapStarter(prev, outId, inId) : prev));
    },
    buyPlayer: (playerId) => {
      setState((prev) => (prev ? buyPlayer(prev, playerId) : prev));
    },
    sellPlayer: (playerId) => {
      setState((prev) => (prev ? sellPlayer(prev, playerId) : prev));
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame deve essere usato dentro <GameProvider>');
  return ctx;
}
