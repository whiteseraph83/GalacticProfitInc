import { describe, expect, it } from "vitest";
import { SeededRng } from "../src/domain/rng";

describe("SeededRng", () => {
  it("produce la stessa sequenza a parita' di seed", () => {
    const a = new SeededRng("regione-alfa");
    const b = new SeededRng("regione-alfa");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produce sequenze diverse per seed diversi", () => {
    const a = new SeededRng("regione-alfa");
    const b = new SeededRng("regione-beta");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("nextInt rispetta i limiti inclusi", () => {
    const rng = new SeededRng("limiti");
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });
});
