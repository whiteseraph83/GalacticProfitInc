import { describe, expect, it } from "vitest";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { HYPERSPACE } from "../src/domain/hyperspace";
import { generaAnteprimaRegione, seedProssimaRegione } from "../src/world/hyperspacePreview";
import { applicaSaltoIperspaziale, validaSaltoIperspaziale } from "../src/simulation/hyperspace";
import { SimulationEngine } from "../src/simulation/engine";
import type { GameState, MiningContract } from "../src/domain/types";

function statoConRicercaSbloccata(seed: string, carburante = 150): GameState {
  const base = creaStatoIniziale(seed);
  return {
    ...base,
    ricerca: { progettiAttivi: [], completate: ["ESP-01", "ESP-02", "ESP-03", "ESP-04"] },
    mothership: { ...base.mothership, carburante },
  };
}

describe("validaSaltoIperspaziale", () => {
  it("rifiuta se la tecnologia Iperspazio non e' stata completata", () => {
    const stato = creaStatoIniziale("iperspazio-no-tech");
    expect(validaSaltoIperspaziale(stato).ok).toBe(false);
  });

  it("rifiuta con carburante insufficiente anche a tecnologia sbloccata", () => {
    const stato = statoConRicercaSbloccata("iperspazio-no-fuel", HYPERSPACE.costoCarburante - 1);
    expect(validaSaltoIperspaziale(stato).ok).toBe(false);
  });

  it("accetta con tecnologia sbloccata e carburante sufficiente", () => {
    const stato = statoConRicercaSbloccata("iperspazio-ok", HYPERSPACE.costoCarburante);
    expect(validaSaltoIperspaziale(stato).ok).toBe(true);
  });
});

describe("generaAnteprimaRegione", () => {
  it("e' deterministica e corrisponde esattamente alla regione che il salto genererebbe", () => {
    const stato = statoConRicercaSbloccata("iperspazio-anteprima");
    const anteprima = generaAnteprimaRegione(stato);
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(dopo.numeroRegione).toBe(anteprima.numeroRegione);
    expect(dopo.pianeti).toHaveLength(anteprima.numeroPianeti);
    expect(dopo.campiRelitti).toHaveLength(anteprima.numeroCampiRelitti);
  });

  it("non rivela posizioni o nomi dei pianeti (solo aggregati)", () => {
    const stato = statoConRicercaSbloccata("iperspazio-niente-dettagli");
    const anteprima = generaAnteprimaRegione(stato);
    expect(Object.keys(anteprima)).toEqual(["numeroRegione", "numeroPianeti", "numeroCampiRelitti", "ricchezzaStimata"]);
  });

  it("usa un seed derivato deterministicamente dal numero di regione", () => {
    const stato = statoConRicercaSbloccata("iperspazio-seed");
    expect(seedProssimaRegione(stato)).toBe(`${stato.seed}|regione${stato.numeroRegione + 1}`);
  });
});

describe("applicaSaltoIperspaziale", () => {
  it("incrementa numeroRegione e genera una nuova regione con nuove missioni", () => {
    const stato = statoConRicercaSbloccata("iperspazio-applica");
    const missioniPrima = stato.missioni.map((m) => m.id);
    const dopo = applicaSaltoIperspaziale(stato).stato;

    expect(dopo.numeroRegione).toBe(stato.numeroRegione + 1);
    expect(dopo.missioni.length).toBeGreaterThanOrEqual(20);
    expect(dopo.missioni.map((m) => m.id)).not.toEqual(missioniPrima);
    expect(dopo.pianetaSelezionatoId).toBeNull();
  });

  it("deduce esattamente il costo in carburante confermato (60)", () => {
    const stato = statoConRicercaSbloccata("iperspazio-carburante", 100);
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(dopo.mothership.carburante).toBe(100 - HYPERSPACE.costoCarburante);
  });

  it("riporta la nave madre all'origine della nuova regione", () => {
    const base = statoConRicercaSbloccata("iperspazio-posizione");
    const stato: GameState = { ...base, mothership: { ...base.mothership, posizione: { x: 500, y: -300 }, percorso: [{ x: 10, y: 10 }] } };
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(dopo.mothership.posizione).toEqual({ x: 0, y: 0 });
    expect(dopo.mothership.percorso).toEqual([]);
  });

  it("interrompe tutti i contratti minerari attivi e libera le navi minerarie", () => {
    const base = statoConRicercaSbloccata("iperspazio-contratti");
    const contratto: MiningContract = {
      id: "contratto-test",
      pianetaId: base.pianeti[0].id,
      naveMinerariaId: base.naviMinerarie[0].id,
      risorsa: "ferro",
      giacimentoResiduo: 100,
      estrazioneAlMinuto: 4,
      depositoAccumulato: 25, // materiale non ancora ritirato: va perso per abbandono (B6)
      priorita: 1,
      ultimaAssegnazioneMs: 0,
      attivo: true,
    };
    const stato: GameState = {
      ...base,
      contrattiMinerari: [contratto],
      naviMinerarie: base.naviMinerarie.map((n) => ({ ...n, contrattoAttivoId: contratto.id })),
    };
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(dopo.contrattiMinerari).toHaveLength(0);
    expect(dopo.naviMinerarie.every((n) => n.contrattoAttivoId === null)).toBe(true);
  });

  it("trasferisce il cargo gia' caricato sulle navette nella stiva della nave madre", () => {
    const base = statoConRicercaSbloccata("iperspazio-cargo-navette");
    const stato: GameState = {
      ...base,
      navette: base.navette.map((n, i) => (i === 0 ? { ...n, caricoAttuale: { ferro: 15 }, stato: "ritorno" as const } : n)),
    };
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(dopo.mothership.stivaCarico.ferro).toBe(15);
    expect(dopo.navette[0].caricoAttuale.ferro ?? 0).toBe(0);
    expect(dopo.navette.every((n) => n.stato === "libera")).toBe(true);
  });

  it("lascia in navetta l'eccedenza quando la stiva della nave madre e' piena (nessuna perdita ne' duplicazione)", () => {
    const base = statoConRicercaSbloccata("iperspazio-stiva-piena");
    const stato: GameState = {
      ...base,
      mothership: { ...base.mothership, stivaCarico: { ferro: base.mothership.stivaCapacita - 5 } },
      navette: base.navette.map((n, i) => (i === 0 ? { ...n, caricoAttuale: { ferro: 20 } } : n)),
    };
    const totalePrima = (stato.mothership.stivaCarico.ferro ?? 0) + (stato.navette[0].caricoAttuale.ferro ?? 0);
    const dopo = applicaSaltoIperspaziale(stato).stato;
    const totaleDopo = (dopo.mothership.stivaCarico.ferro ?? 0) + (dopo.navette[0].caricoAttuale.ferro ?? 0);

    expect(dopo.mothership.stivaCarico.ferro).toBe(base.mothership.stivaCapacita); // riempita esattamente
    expect(dopo.navette[0].caricoAttuale.ferro).toBe(15); // eccedenza rimasta in navetta
    expect(totaleDopo).toBe(totalePrima); // nessuna perdita ne' duplicazione
  });

  it("mantiene crediti, carte, fiducia, moduli e tecnologie completate (progressione globale)", () => {
    const base = statoConRicercaSbloccata("iperspazio-globale");
    const stato: GameState = { ...base, crediti: 12_345, review: { ...base.review, fiducia: 77 } };
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(dopo.crediti).toBe(stato.crediti - 0); // il salto stesso non tocca i crediti
    expect(dopo.review.fiducia).toBe(77);
    expect(dopo.manoCarte).toEqual(stato.manoCarte);
    expect(dopo.ricerca.completate).toEqual(stato.ricerca.completate);
  });

  it("lo stato risultante resta valido secondo validaStato (idoneo a un refresh/autosave nel momento del passaggio)", () => {
    const stato = statoConRicercaSbloccata("iperspazio-valido");
    const dopo = applicaSaltoIperspaziale(stato).stato;
    expect(validaStato(dopo)).toEqual([]);
    // Round-trip JSON, come il salvataggio IndexedDB farebbe davvero (Macrostep 5).
    const roundTrip = JSON.parse(JSON.stringify(dopo));
    expect(validaStato(roundTrip)).toEqual([]);
  });
});

describe("salto iperspaziale tramite il motore (carta IPS-01)", () => {
  it("consuma la carta e il carburante solo quando il comando viene davvero applicato", () => {
    const engine = new SimulationEngine("iperspazio-motore");
    // @ts-expect-error accesso diretto allo stato privato solo per fixture di test.
    engine.state = {
      ...engine.getState(),
      ricerca: { progettiAttivi: [], completate: ["ESP-01", "ESP-02", "ESP-03", "ESP-04"] },
      manoCarte: [...engine.getState().manoCarte, { instanceId: "carta-iperspazio", code: "IPS-01", livello: 1 }],
    };

    const carburantePrima = engine.getState().mothership.carburante;
    const manoPrima = engine.getState().manoCarte.length;

    const risultato = engine.dispatch({
      id: "salto-1",
      type: "ui/giocaCarta",
      payload: { cardInstanceId: "carta-iperspazio", bersaglio: {} },
    });

    expect(risultato.ok).toBe(true);
    expect(engine.getState().mothership.carburante).toBe(carburantePrima - HYPERSPACE.costoCarburante);
    expect(engine.getState().manoCarte).toHaveLength(manoPrima - 1);
    expect(engine.getState().numeroRegione).toBe(2);
  });

  it("un comando duplicato (stesso id) non consuma una seconda volta carta/carburante (idempotenza)", () => {
    const engine = new SimulationEngine("iperspazio-idempotenza");
    // @ts-expect-error accesso diretto allo stato privato solo per fixture di test.
    engine.state = {
      ...engine.getState(),
      ricerca: { progettiAttivi: [], completate: ["ESP-01", "ESP-02", "ESP-03", "ESP-04"] },
      manoCarte: [...engine.getState().manoCarte, { instanceId: "carta-iperspazio", code: "IPS-01", livello: 1 }],
    };
    const comando = {
      id: "salto-duplicato",
      type: "ui/giocaCarta" as const,
      payload: { cardInstanceId: "carta-iperspazio", bersaglio: {} },
    };

    engine.dispatch(comando);
    const regioneDopoPrimo = engine.getState().numeroRegione;
    const carburanteDopoPrimo = engine.getState().mothership.carburante;

    const secondoRisultato = engine.dispatch(comando);
    expect(secondoRisultato.ok).toBe(false);
    expect(engine.getState().numeroRegione).toBe(regioneDopoPrimo);
    expect(engine.getState().mothership.carburante).toBe(carburanteDopoPrimo);
  });

  it("senza la tecnologia sbloccata il comando e' rifiutato e nulla viene consumato", () => {
    const engine = new SimulationEngine("iperspazio-bloccato");
    // @ts-expect-error accesso diretto allo stato privato solo per fixture di test.
    engine.state = {
      ...engine.getState(),
      manoCarte: [...engine.getState().manoCarte, { instanceId: "carta-iperspazio", code: "IPS-01", livello: 1 }],
    };
    const manoPrima = engine.getState().manoCarte.length;
    const carburantePrima = engine.getState().mothership.carburante;

    const risultato = engine.dispatch({
      id: "salto-bloccato",
      type: "ui/giocaCarta",
      payload: { cardInstanceId: "carta-iperspazio", bersaglio: {} },
    });

    expect(risultato.ok).toBe(false);
    expect(engine.getState().manoCarte).toHaveLength(manoPrima);
    expect(engine.getState().mothership.carburante).toBe(carburantePrima);
  });
});
