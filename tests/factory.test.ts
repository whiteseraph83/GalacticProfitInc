import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { FABBRICA_COSTO, RICETTE_RAFFINAZIONE } from "../src/domain/refineRecipes";
import { applicaGiocaCarta, validaGiocaCarta } from "../src/simulation/cardEffects";
import { applicaAccodaRaffinazione, integraRaffinazione, validaAccodaRaffinazione } from "../src/simulation/factory";
import { SeededRng } from "../src/domain/rng";
import type { CardInstance, GameState } from "../src/domain/types";

function trovaCarta(stato: GameState, code: CardInstance["code"]): CardInstance {
  const carta = stato.manoCarte.find((c) => c.code === code);
  if (!carta) throw new Error(`carta ${code} non in mano`);
  return carta;
}

function statoConFabbricaCostruita(seed: string): GameState {
  const base = creaStatoIniziale(seed);
  return {
    ...base,
    fabbrica: { ...base.fabbrica, costruita: true },
    // Quantita' modeste, entro la capacita' della stiva (500): sufficienti
    // per un paio di lotti senza violare l'invariante di capacita'.
    mothership: { ...base.mothership, stivaCarico: { ferro: 80, cristalliSilicio: 60 } },
  };
}

describe("carta Fabbrica (IND-02)", () => {
  it("rifiuta la costruzione senza abbastanza ferro in stiva", () => {
    const stato = creaStatoIniziale("fabbrica-no-ferro");
    const carta = trovaCarta(stato, "IND-02");
    expect(validaGiocaCarta(stato, carta.instanceId, {}).ok).toBe(false);
  });

  it("costruisce la fabbrica deducendo crediti e ferro", () => {
    const base = creaStatoIniziale("fabbrica-ok");
    const stato: GameState = { ...base, mothership: { ...base.mothership, stivaCarico: { ferro: FABBRICA_COSTO.ferro } } };
    const carta = trovaCarta(stato, "IND-02");

    expect(validaGiocaCarta(stato, carta.instanceId, {}).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, {}, new SeededRng("f"));

    expect(dopo.fabbrica.costruita).toBe(true);
    expect(dopo.crediti).toBe(base.crediti - FABBRICA_COSTO.crediti);
    expect(dopo.mothership.stivaCarico.ferro).toBe(0);
  });

  it("rifiuta una seconda costruzione", () => {
    const stato = statoConFabbricaCostruita("fabbrica-doppia");
    const carta = trovaCarta(stato, "IND-02");
    expect(validaGiocaCarta(stato, carta.instanceId, {}).ok).toBe(false);
  });
});

describe("coda di raffinazione", () => {
  it("rifiuta l'accodamento se la fabbrica non e' costruita", () => {
    const stato = creaStatoIniziale("coda-no-fabbrica");
    expect(validaAccodaRaffinazione(stato, "raffina-ferro").ok).toBe(false);
  });

  it("bilancio di massa: l'input consumato e l'output prodotto corrispondono esattamente alla ricetta", () => {
    let stato = statoConFabbricaCostruita("coda-bilancio-massa");
    stato = applicaAccodaRaffinazione(stato, "raffina-ferro");
    const ricetta = RICETTE_RAFFINAZIONE["raffina-ferro"];
    const ferroPrima = stato.mothership.stivaCarico.ferro ?? 0;

    // Avanza finche' la coda si svuota (avvio + completamento).
    for (let i = 0; i < 2000 && stato.fabbrica.coda.length > 0; i++) {
      stato = { ...stato, tempoSimulatoMs: stato.tempoSimulatoMs + 1000 };
      const risultato = integraRaffinazione(stato);
      stato = risultato.stato;
    }

    expect(stato.fabbrica.coda).toHaveLength(0);
    expect(stato.mothership.stivaCarico.ferro).toBe(ferroPrima - ricetta.inputQuantita);
    expect(stato.mothership.stivaCarico.ferroRaffinato).toBe(ricetta.outputQuantita);
  });

  it("non avvia la lavorazione se manca l'input grezzo, senza consumare nulla", () => {
    const base = creaStatoIniziale("coda-senza-input");
    let stato: GameState = { ...base, fabbrica: { ...base.fabbrica, costruita: true }, mothership: { ...base.mothership, stivaCarico: {} } };
    stato = applicaAccodaRaffinazione(stato, "raffina-ferro");
    const creditiDopoAccodamento = stato.crediti;

    const { stato: dopo } = integraRaffinazione({ ...stato, tempoSimulatoMs: 1000 });
    expect(dopo.fabbrica.coda[0].stato).toBe("inCoda");
    expect(dopo.crediti).toBe(creditiDopoAccodamento);
    expect(cargoTotaleTest(dopo.mothership.stivaCarico)).toBe(0);
  });

  it("il carburante raffinato riempie prima il serbatoio, poi trabocca in stiva", () => {
    let stato = statoConFabbricaCostruita("coda-carburante");
    stato = { ...stato, mothership: { ...stato.mothership, carburante: stato.mothership.serbatoioCapacita - 5 } };
    stato = applicaAccodaRaffinazione(stato, "raffina-carburante");

    for (let i = 0; i < 2000 && stato.fabbrica.coda.length > 0; i++) {
      stato = { ...stato, tempoSimulatoMs: stato.tempoSimulatoMs + 1000 };
      stato = integraRaffinazione(stato).stato;
    }

    const ricetta = RICETTE_RAFFINAZIONE["raffina-carburante"];
    expect(stato.mothership.carburante).toBe(stato.mothership.serbatoioCapacita);
    expect(stato.mothership.stivaCarico.carburante).toBe(ricetta.outputQuantita - 5);
  });

  it("non consegna l'output (e non completa l'elemento) se la stiva non ha spazio sufficiente", () => {
    const base = creaStatoIniziale("coda-stiva-piena");
    let stato: GameState = {
      ...base,
      fabbrica: { ...base.fabbrica, costruita: true },
      mothership: {
        ...base.mothership,
        // Giusto il ferro necessario per avviare la ricetta, piu' altro
        // materiale che riempie quasi tutta la stiva: dopo l'avvio (che
        // consuma il ferro) resta meno spazio libero di quanto servirebbe
        // per consegnare l'output (18 unita').
        stivaCarico: { ferro: 30, titanioRaffinato: base.mothership.stivaCapacita - 15 },
      },
    };
    stato = applicaAccodaRaffinazione(stato, "raffina-ferro");

    for (let i = 0; i < 2000; i++) {
      stato = { ...stato, tempoSimulatoMs: stato.tempoSimulatoMs + 1000 };
      stato = integraRaffinazione(stato).stato;
    }

    // L'elemento e' partito (input consumato) ma non puo' consegnare: resta in lavorazione, nessuna perdita.
    expect(stato.fabbrica.coda).toHaveLength(1);
    expect(stato.fabbrica.coda[0].stato).toBe("inLavorazione");
  });
});

function cargoTotaleTest(carico: Partial<Record<string, number>>): number {
  return Object.values(carico).reduce((a, b) => a + (b ?? 0), 0);
}

describe("carta Rifornimento (LOG-01)", () => {
  it("rifiuta se non c'e' carburante in stiva", () => {
    const stato = creaStatoIniziale("rifornimento-vuoto");
    const statoConCarta: GameState = { ...stato, manoCarte: [...stato.manoCarte, { instanceId: "log01", code: "LOG-01", livello: 1 }] };
    expect(validaGiocaCarta(statoConCarta, "log01", {}).ok).toBe(false);
  });

  it("trasferisce carburante dalla stiva al serbatoio senza superarne la capacita'", () => {
    const base = creaStatoIniziale("rifornimento-ok");
    const stato: GameState = {
      ...base,
      mothership: { ...base.mothership, carburante: base.mothership.serbatoioCapacita - 10, stivaCarico: { carburante: 50 } },
      manoCarte: [...base.manoCarte, { instanceId: "log01", code: "LOG-01", livello: 1 }],
    };

    expect(validaGiocaCarta(stato, "log01", {}).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, "log01", {}, new SeededRng("r"));

    expect(dopo.mothership.carburante).toBe(base.mothership.serbatoioCapacita);
    expect(dopo.mothership.stivaCarico.carburante).toBe(40); // 50 disponibili - 10 trasferiti
  });
});
