import { describe, expect, it } from "vitest";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { VANTAGGI_EREDITATI, applicaVantaggioEreditato } from "../src/domain/legacy";

describe("applicaVantaggioEreditato", () => {
  it("VNT-CREDITI aggiunge crediti al capitale iniziale", () => {
    const base = creaStatoIniziale("legacy-crediti");
    const dopo = applicaVantaggioEreditato(base, "VNT-CREDITI");
    expect(dopo.crediti).toBe(base.crediti + 500);
  });

  it("VNT-CARBURANTE aggiunge carburante senza superare la capacita' del serbatoio", () => {
    const base = creaStatoIniziale("legacy-carburante");
    const dopo = applicaVantaggioEreditato(base, "VNT-CARBURANTE");
    expect(dopo.mothership.carburante).toBe(Math.min(base.mothership.serbatoioCapacita, base.mothership.carburante + 30));
    expect(dopo.mothership.carburante).toBeLessThanOrEqual(dopo.mothership.serbatoioCapacita);
  });

  it("VNT-MANO aumenta la capacita' massima della mano di carte", () => {
    const base = creaStatoIniziale("legacy-mano");
    const dopo = applicaVantaggioEreditato(base, "VNT-MANO");
    expect(dopo.capacitaManoCarte).toBe(base.capacitaManoCarte + 1);
  });

  it("VNT-FIDUCIA aumenta la fiducia senza superare 100", () => {
    const base = creaStatoIniziale("legacy-fiducia");
    const dopo = applicaVantaggioEreditato(base, "VNT-FIDUCIA");
    expect(dopo.review.fiducia).toBe(Math.min(100, base.review.fiducia + 15));
  });

  it("un id sconosciuto lascia lo stato invariato", () => {
    const base = creaStatoIniziale("legacy-sconosciuto");
    const dopo = applicaVantaggioEreditato(base, "VNT-INESISTENTE");
    expect(dopo).toBe(base);
  });

  it("ogni vantaggio definito produce uno stato ancora valido", () => {
    for (const id of Object.keys(VANTAGGI_EREDITATI)) {
      const base = creaStatoIniziale(`legacy-valido-${id}`);
      const dopo = applicaVantaggioEreditato(base, id);
      expect(validaStato(dopo)).toEqual([]);
    }
  });
});

describe("creaStatoIniziale con vantaggio ereditato", () => {
  it("applica il vantaggio e produce comunque uno stato valido", () => {
    const stato = creaStatoIniziale("legacy-creazione", "VNT-CREDITI");
    expect(stato.crediti).toBe(2000 + 500);
    expect(validaStato(stato)).toEqual([]);
  });

  it("senza vantaggio specificato, lo stato e' identico a prima (nessuna regressione)", () => {
    const statoSenza = creaStatoIniziale("legacy-senza-vantaggio");
    expect(statoSenza.crediti).toBe(2000);
  });
});
