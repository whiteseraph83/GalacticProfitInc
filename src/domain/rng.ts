// RNG deterministico a seed (mulberry32). Usato per generazione mondo e
// qualunque casualita' di gioco; la casualita' puramente grafica NON deve
// usare questa classe, per restare riproducibile a parita' di seed.

function hashStringToSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export class SeededRng {
  private state: number;
  readonly seed: string;

  constructor(seed: string) {
    this.seed = seed;
    this.state = hashStringToSeed(seed) || 0xdeadbeef;
  }

  /** Numero float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Intero in [min, max] inclusi. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max). */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)];
  }
}
