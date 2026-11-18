import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { PERICOLI } from "../src/domain/hazards";
import { integraPericoli, moltiplicatoreVelocitaPericoli, naveInPericolo } from "../src/simulation/hazards";
import type { GameState, RegionalHazard } from "../src/domain/types";

function statoConPericolo(seed: string, pericolo: Partial<RegionalHazard> = {}): GameState {
  const base = creaStatoIniziale(seed);
  const completo: RegionalHazard = {
    id: "pericolo-test",
    tipo: "tempesta",
    posizione: { x: 0, y: 0 },
    raggio: 100,
    scoperto: true,
    intensita: 1,
    ...pericolo,
  };
  return { ...base, pericoli: [completo], mothership: { ...base.mothership, posizione: { x: 0, y: 0 } } };
}

describe("naveInPericolo", () => {
  it("vero quando la nave e' entro il raggio", () => {
    const stato = statoConPericolo("pericolo-dentro");
    expect(naveInPericolo(stato, stato.pericoli[0])).toBe(true);
  });

  it("falso quando la nave e' fuori dal raggio", () => {
    const base = statoConPericolo("pericolo-fuori");
    const stato: GameState = { ...base, mothership: { ...base.mothership, posizione: { x: 1000, y: 1000 } } };
    expect(naveInPericolo(stato, stato.pericoli[0])).toBe(false);
  });

  it("falso durante l'immunita' attiva (carta Fuga d'emergenza)", () => {
    const base = statoConPericolo("pericolo-immune");
    const stato: GameState = { ...base, mothership: { ...base.mothership, immunitaPericoliFinoMs: 999_999 } };
    expect(naveInPericolo(stato, stato.pericoli[0])).toBe(false);
  });
});

describe("integraPericoli", () => {
  it("tempesta: consuma carburante extra proporzionale a intensita' e tempo", () => {
    const stato = statoConPericolo("tempesta-consumo", { tipo: "tempesta", intensita: 1 });
    const dtMs = 60_000; // 1 minuto
    const { stato: dopo } = integraPericoli(stato, dtMs);
    expect(dopo.mothership.carburante).toBe(stato.mothership.carburante - PERICOLI.tempestaConsumoExtraAlMinutoMax);
  });

  it("tempesta: il consumo e' proporzionale all'intensita'", () => {
    const stato = statoConPericolo("tempesta-proporzionale", { tipo: "tempesta", intensita: 0.5 });
    const { stato: dopo } = integraPericoli(stato, 60_000);
    expect(dopo.mothership.carburante).toBe(stato.mothership.carburante - PERICOLI.tempestaConsumoExtraAlMinutoMax * 0.5);
  });

  it("il carburante non scende sotto zero", () => {
    const base = statoConPericolo("tempesta-zero", { tipo: "tempesta", intensita: 1 });
    const stato: GameState = { ...base, mothership: { ...base.mothership, carburante: 1 } };
    const { stato: dopo } = integraPericoli(stato, 600_000);
    expect(dopo.mothership.carburante).toBe(0);
  });

  it("radiazioni: erode la fiducia proporzionale a intensita' e tempo", () => {
    const stato = statoConPericolo("radiazioni-fiducia", { tipo: "radiazioni", intensita: 1 });
    const { stato: dopo } = integraPericoli(stato, 60_000);
    expect(dopo.review.fiducia).toBe(stato.review.fiducia - PERICOLI.radiazioniFiduciaPerMinutoMax);
  });

  it("nessun effetto se la nave non e' dentro un pericolo scoperto", () => {
    const stato = statoConPericolo("pericolo-non-scoperto", { scoperto: false, tipo: "tempesta", intensita: 1 });
    const { stato: dopo, notifiche } = integraPericoli(stato, 60_000);
    expect(dopo).toBe(stato);
    expect(notifiche).toHaveLength(0);
  });

  it("nessun effetto durante l'immunita' attiva", () => {
    const base = statoConPericolo("pericolo-immune-tempesta", { tipo: "tempesta", intensita: 1 });
    const stato: GameState = { ...base, mothership: { ...base.mothership, immunitaPericoliFinoMs: 999_999 } };
    const { stato: dopo } = integraPericoli(stato, 60_000);
    expect(dopo.mothership.carburante).toBe(stato.mothership.carburante);
  });
});

describe("moltiplicatoreVelocitaPericoli", () => {
  it("riduce la velocita' massima dentro un campo gravitazionale, proporzionalmente all'intensita'", () => {
    const stato = statoConPericolo("gravita-riduzione", { tipo: "campoGravitazionale", intensita: 1 });
    const moltiplicatore = moltiplicatoreVelocitaPericoli(stato);
    expect(moltiplicatore).toBeCloseTo(1 - PERICOLI.gravitaRiduzioneVelocitaMax);
  });

  it("nessuna riduzione se non c'e' nessun campo gravitazionale attivo", () => {
    const stato = statoConPericolo("gravita-assente", { tipo: "tempesta", intensita: 1 });
    expect(moltiplicatoreVelocitaPericoli(stato)).toBe(1);
  });
});
