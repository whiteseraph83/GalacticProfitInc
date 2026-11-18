import { describe, expect, it } from "vitest";
import { BALANCE, creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { WORLD } from "../src/domain/worldConstants";

describe("stato iniziale", () => {
  it("rispetta i valori confermati in B1/B2", () => {
    const stato = creaStatoIniziale("test-seed");

    expect(stato.crediti).toBe(2000);
    expect(stato.mothership.stivaCapacita).toBe(500);
    expect(stato.mothership.serbatoioCapacita).toBe(150);
    expect(stato.mothership.carburante).toBe(120);
    expect(stato.naviMinerarie).toHaveLength(1);
    expect(stato.navette).toHaveLength(2);
    for (const navetta of stato.navette) {
      expect(navetta.capacitaCargo).toBe(20);
      expect(navetta.stato).toBe("libera");
    }
    expect(stato.review.quotaDaPagare).toBe(600);
    expect(stato.review.fiducia).toBe(100);
  });

  it("assegna esattamente la mano iniziale di 5 carte nell'ordine previsto", () => {
    const stato = creaStatoIniziale("test-seed");
    expect(stato.manoCarte).toHaveLength(5);
    expect(stato.manoCarte.map((c) => c.code)).toEqual(["OPS-01", "OPS-02", "IND-01", "IND-02", "RSH-01"]);
  });

  it("non valida uno stato con crediti negativi", () => {
    const stato = creaStatoIniziale("test-seed");
    const statoRotto = { ...stato, crediti: -10 };
    const problemi = validaStato(statoRotto);
    expect(problemi).toContain("crediti negativi");
  });

  it("non valida uno stato con carburante oltre il serbatoio", () => {
    const stato = creaStatoIniziale("test-seed");
    const statoRotto = { ...stato, mothership: { ...stato.mothership, carburante: 999 } };
    const problemi = validaStato(statoRotto);
    expect(problemi.length).toBeGreaterThan(0);
  });

  it("il valore di BALANCE.carburanteIniziale resta entro il serbatoio", () => {
    expect(BALANCE.carburanteIniziale).toBeLessThanOrEqual(BALANCE.serbatoioMothershipCapacita);
  });

  it("genera una regione con pianeti e alcuni gia' scoperti nell'area sicura", () => {
    const stato = creaStatoIniziale("test-seed-regione");
    expect(stato.pianeti.length).toBeGreaterThanOrEqual(WORLD.pianetiMin);
    const scoperti = stato.pianeti.filter((p) => p.scoperto);
    expect(scoperti.length).toBeGreaterThan(0);
    expect(stato.pianeti.filter((p) => p.investigato)).toHaveLength(0);
  });

  it("stesso seed produce lo stesso stato iniziale (determinismo)", () => {
    const a = creaStatoIniziale("determinismo-seed");
    const b = creaStatoIniziale("determinismo-seed");
    expect(a.pianeti.map((p) => p.posizione)).toEqual(b.pianeti.map((p) => p.posizione));
    expect(a.pianeti.map((p) => p.archetipo)).toEqual(b.pianeti.map((p) => p.archetipo));
  });
});
