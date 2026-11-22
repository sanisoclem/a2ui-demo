export type Weighted<T> = readonly (readonly [T, number])[];

export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  integer(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  weighted<T>(options: Weighted<T>): T {
    const total = options.reduce((sum, [, weight]) => sum + weight, 0);
    let remaining = this.next() * total;
    for (const [value, weight] of options) {
      remaining -= weight;
      if (remaining < 0) return value;
    }
    return options[options.length - 1]![0];
  }

  normal(mean: number, deviation: number): number {
    const u = 1 - this.next();
    const v = this.next();
    return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  count(mean: number): number {
    return Math.max(0, Math.round(this.normal(mean, Math.sqrt(mean))));
  }
}
