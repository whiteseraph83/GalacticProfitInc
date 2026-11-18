import { describe, expect, it } from "vitest";
import { calcolaPercorso } from "../src/simulation/pathfinding";

function distanzaPuntoSegmento(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

describe("calcolaPercorso", () => {
  it("senza ostacoli ritorna direttamente la destinazione", () => {
    const percorso = calcolaPercorso({ x: 0, y: 0 }, { x: 100, y: 0 }, [], 10);
    expect(percorso).toEqual([{ x: 100, y: 0 }]);
  });

  it("aggira un ostacolo esattamente sulla rotta diretta", () => {
    const partenza = { x: -100, y: 0 };
    const destinazione = { x: 100, y: 0 };
    const ostacoli = [{ posizione: { x: 0, y: 0 }, raggio: 20 }];
    const percorso = calcolaPercorso(partenza, destinazione, ostacoli, 10);

    expect(percorso.length).toBeGreaterThan(1);
    expect(percorso.at(-1)).toEqual(destinazione);

    // Ogni segmento del percorso completo (partenza inclusa) deve restare
    // fuori dal raggio effettivo dell'ostacolo.
    const puntiCompleti = [partenza, ...percorso];
    for (let i = 0; i < puntiCompleti.length - 1; i++) {
      const dist = distanzaPuntoSegmento(ostacoli[0].posizione, puntiCompleti[i], puntiCompleti[i + 1]);
      expect(dist).toBeGreaterThanOrEqual(ostacoli[0].raggio + 10 - 1); // tolleranza numerica
    }
  });

  it("non aggira ostacoli lontani dalla rotta", () => {
    const ostacoli = [{ posizione: { x: 500, y: 500 }, raggio: 20 }];
    const percorso = calcolaPercorso({ x: 0, y: 0 }, { x: 100, y: 0 }, ostacoli, 10);
    expect(percorso).toEqual([{ x: 100, y: 0 }]);
  });

  it("e' deterministico (stesso input, stesso output)", () => {
    const ostacoli = [
      { posizione: { x: 0, y: 0 }, raggio: 15 },
      { posizione: { x: 40, y: 10 }, raggio: 10 },
    ];
    const a = calcolaPercorso({ x: -80, y: 0 }, { x: 80, y: 0 }, ostacoli, 8);
    const b = calcolaPercorso({ x: -80, y: 0 }, { x: 80, y: 0 }, ostacoli, 8);
    expect(a).toEqual(b);
  });
});
