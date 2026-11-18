import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { CIVILTA } from "../src/domain/civilizations";
import { SeededRng } from "../src/domain/rng";
import {
  applicaCommerciaConCivilta,
  applicaInviaDonoCivilta,
  integraRichiesteCivilta,
  validaCommerciaConCivilta,
  validaInviaDonoCivilta,
} from "../src/simulation/civilizations";
import type { Civilta, GameState } from "../src/domain/types";

function statoConCiviltaScoperta(seed: string, overrides: Partial<Civilta> = {}): GameState {
  const base = creaStatoIniziale(seed);
  const civilta: Civilta = {
    id: "civilta-test",
    nome: "Collettivo di Test",
    posizione: { x: 0, y: 0 },
    raggio: 60,
    scoperta: true,
    relazione: CIVILTA.relazioneIniziale,
    richiestaAttiva: null,
    ...overrides,
  };
  return { ...base, civilta: [civilta], mothership: { ...base.mothership, stivaCarico: { ferro: 50 } } };
}

describe("validaCommerciaConCivilta / applicaCommerciaConCivilta", () => {
  it("rifiuta una civilta' sconosciuta", () => {
    const stato = statoConCiviltaScoperta("civ-sconosciuta");
    expect(validaCommerciaConCivilta(stato, "non-esiste", "ferro", 10).ok).toBe(false);
  });

  it("rifiuta una quantita' non disponibile in stiva", () => {
    const stato = statoConCiviltaScoperta("civ-quantita");
    expect(validaCommerciaConCivilta(stato, "civilta-test", "ferro", 999).ok).toBe(false);
  });

  it("accetta e scala la stiva, accredita i crediti", () => {
    const stato = statoConCiviltaScoperta("civ-ok");
    expect(validaCommerciaConCivilta(stato, "civilta-test", "ferro", 10).ok).toBe(true);
    const dopo = applicaCommerciaConCivilta(stato, "civilta-test", "ferro", 10);
    expect(dopo.mothership.stivaCarico.ferro).toBe(40);
    expect(dopo.crediti).toBeGreaterThan(stato.crediti);
  });

  it("applica un bonus di prezzo quando la relazione supera la soglia", () => {
    const statoBasso = statoConCiviltaScoperta("civ-bonus-basso", { relazione: 10 });
    const statoAlto = statoConCiviltaScoperta("civ-bonus-alto", { relazione: 100 });
    const incassoBasso = applicaCommerciaConCivilta(statoBasso, "civilta-test", "ferro", 10).crediti - statoBasso.crediti;
    const incassoAlto = applicaCommerciaConCivilta(statoAlto, "civilta-test", "ferro", 10).crediti - statoAlto.crediti;
    expect(incassoAlto).toBeGreaterThan(incassoBasso);
  });

  it("avanza il progresso della richiesta attiva quando si vende la risorsa richiesta", () => {
    const stato = statoConCiviltaScoperta("civ-richiesta", {
      richiestaAttiva: { risorsa: "ferro", quantita: 30, progresso: 0, ricompensaRelazione: 10, ricompensaCrediti: 200 },
    });
    const dopo = applicaCommerciaConCivilta(stato, "civilta-test", "ferro", 10);
    expect(dopo.civilta[0].richiestaAttiva?.progresso).toBe(10);
  });

  it("non fa avanzare il progresso di una richiesta per una risorsa diversa", () => {
    const stato = statoConCiviltaScoperta("civ-richiesta-altra-risorsa", {
      richiestaAttiva: { risorsa: "titanioStellare", quantita: 30, progresso: 0, ricompensaRelazione: 10, ricompensaCrediti: 200 },
    });
    const dopo = applicaCommerciaConCivilta(stato, "civilta-test", "ferro", 10);
    expect(dopo.civilta[0].richiestaAttiva?.progresso).toBe(0);
  });
});

describe("validaInviaDonoCivilta / applicaInviaDonoCivilta", () => {
  it("rifiuta un dono sotto il minimo", () => {
    const stato = statoConCiviltaScoperta("dono-minimo");
    expect(validaInviaDonoCivilta(stato, "civilta-test", CIVILTA.donoCostoMinimo - 1).ok).toBe(false);
  });

  it("rifiuta con crediti insufficienti", () => {
    const base = statoConCiviltaScoperta("dono-crediti");
    const stato: GameState = { ...base, crediti: 0 };
    expect(validaInviaDonoCivilta(stato, "civilta-test", CIVILTA.donoCostoMinimo).ok).toBe(false);
  });

  it("accetta, scala i crediti e aumenta la relazione proporzionalmente", () => {
    const stato = statoConCiviltaScoperta("dono-ok", { relazione: 0 });
    const dopo = applicaInviaDonoCivilta(stato, "civilta-test", 100);
    expect(dopo.crediti).toBe(stato.crediti - 100);
    expect(dopo.civilta[0].relazione).toBe(Math.floor(100 * CIVILTA.donoRelazionePerCrediti));
  });

  it("la relazione non supera il massimo (100)", () => {
    const stato = statoConCiviltaScoperta("dono-cap", { relazione: 98 });
    const dopo = applicaInviaDonoCivilta(stato, "civilta-test", 1000);
    expect(dopo.civilta[0].relazione).toBe(100);
  });
});

describe("integraRichiesteCivilta", () => {
  it("completa una richiesta soddisfatta: assegna crediti e relazione, azzera la richiesta", () => {
    const stato = statoConCiviltaScoperta("richiesta-completa", {
      relazione: 50,
      richiestaAttiva: { risorsa: "ferro", quantita: 20, progresso: 20, ricompensaRelazione: 15, ricompensaCrediti: 200 },
    });
    const rng = new SeededRng("rng-richiesta");
    const { stato: dopo, notifiche } = integraRichiesteCivilta(stato, rng);
    expect(dopo.crediti).toBe(stato.crediti + 200);
    expect(dopo.civilta[0].relazione).toBe(65);
    expect(dopo.civilta[0].richiestaAttiva).toBeNull();
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("non completa una richiesta con progresso insufficiente", () => {
    const stato = statoConCiviltaScoperta("richiesta-incompleta", {
      richiestaAttiva: { risorsa: "ferro", quantita: 20, progresso: 5, ricompensaRelazione: 15, ricompensaCrediti: 200 },
    });
    const rng = new SeededRng("rng-richiesta-incompleta");
    const { stato: dopo } = integraRichiesteCivilta(stato, rng);
    expect(dopo.civilta[0].richiestaAttiva?.progresso).toBe(5);
    expect(dopo.crediti).toBe(stato.crediti);
  });
});
