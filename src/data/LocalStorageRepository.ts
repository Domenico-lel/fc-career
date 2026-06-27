import type { GameRepository } from './GameRepository';
import type { GameState } from '../domain/game/GameState';

const STORAGE_KEY = 'fc-career:save';

/** Implementazione di persistenza basata su localStorage del browser. */
export class LocalStorageRepository implements GameRepository {
  load(): GameState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GameState;
    } catch (err) {
      console.error('Salvataggio corrotto, lo ignoro.', err);
      return null;
    }
  }

  save(state: GameState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
