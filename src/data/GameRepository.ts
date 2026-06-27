import type { GameState } from '../domain/game/GameState';

/**
 * Contratto astratto per la persistenza del gioco.
 *
 * Oggi: LocalStorageRepository.
 * Domani (produzione): basterà creare una ApiGameRepository che implementa
 * questa stessa interfaccia chiamando un backend — la UI non cambierà.
 */
export interface GameRepository {
  load(): GameState | null;
  save(state: GameState): void;
  clear(): void;
}
