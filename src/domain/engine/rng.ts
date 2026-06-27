/**
 * Generatore di numeri pseudo-casuali deterministico (mulberry32).
 * Stesso seed => stessa sequenza. Fondamentale per test e simulazioni riproducibili.
 * Se non passi un seed, usa Math.random (comportamento "casuale" normale).
 */
export interface Rng {
  next(): number; // float in [0, 1)
  int(maxExclusive: number): number;
}

export function createRng(seed?: number): Rng {
  if (seed === undefined) {
    return {
      next: () => Math.random(),
      int: (max) => Math.floor(Math.random() * max),
    };
  }

  let state = seed >>> 0;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (max) => Math.floor(next() * max),
  };
}
