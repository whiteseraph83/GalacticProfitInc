import type { SeededRng } from "../domain/rng";

/** Varia leggermente un colore 0xRRGGBB mantenendo la tonalita' generale,
 * cosi' lo stesso archetipo non produce mai pianeti identici (A5). */
export function jitterColor(rng: SeededRng, color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const jitter = (channel: number) => {
    const delta = rng.nextFloat(-amount, amount);
    return Math.max(0, Math.min(255, Math.round(channel + delta)));
  };
  return (jitter(r) << 16) | (jitter(g) << 8) | jitter(b);
}
