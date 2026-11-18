import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { CARD_EFFECTS } from "../src/domain/cardEffectsConfig";
import { SimulationEngine } from "../src/simulation/engine";
import { integraCostoOperativoContratti } from "../src/simulation/cardEffects";
import type { GameState, MiningContract } from "../src/domain/types";

// Suite di regressione dedicata ai 12 "test prioritari" del documento di
// design (sezione G2). La maggior parte e' gia' coperta da test esistenti
// nei rispettivi file (vedi i riferimenti nei commenti); qui restano solo
// le verifiche che non avevano ancora un test dedicato, aggiunte in
// occasione del Macrostep 11 ("test di regressione completa").

describe("G2.1 — stesso seed e stessa sequenza di decisioni -> stessi risultati economici", () => {
  it("due motori con lo stesso seed, sottoposti alla stessa sequenza di comandi, producono crediti identici", () => {
    const seed = "regressione-g2-determinismo";
    const comandi = [
      { id: "c1", type: "ui/togglePause" as const },
      { id: "c2", type: "ui/togglePause" as const },
      { id: "c3", type: "ui/soccorsoCarburante" as const },
    ];

    const motoreA = new SimulationEngine(seed);
    const motoreB = new SimulationEngine(seed);
    for (const comando of comandi) {
      motoreA.dispatch(comando);
      motoreB.dispatch(comando);
    }
    motoreA.update(5000);
    motoreB.update(5000);

    expect(motoreA.getState().crediti).toBe(motoreB.getState().crediti);
    expect(motoreA.getState().mothership.carburante).toBe(motoreB.getState().mothership.carburante);
    expect(motoreA.getState().review.fiducia).toBe(motoreB.getState().review.fiducia);
  });
});

describe("G2.6 — contratto sospeso per costi non coperti, senza debiti invisibili", () => {
  it("un contratto si sospende (attivo:false) quando i crediti non bastano, senza che i crediti scendano mai sotto zero", () => {
    const base = creaStatoIniziale("regressione-g2-contratto-sospeso");
    const contratto: MiningContract = {
      id: "contratto-sospeso-test",
      pianetaId: base.pianeti[0].id,
      naveMinerariaId: base.naviMinerarie[0].id,
      risorsa: "ferro",
      giacimentoResiduo: 1000,
      estrazioneAlMinuto: 4,
      depositoAccumulato: 0,
      priorita: 1,
      ultimaAssegnazioneMs: 0,
      attivo: true,
    };
    // Crediti insufficienti per anche un solo minuto di costo operativo.
    const stato: GameState = { ...base, crediti: CARD_EFFECTS.contrattoMinerario.costoOperativoAlMinuto / 2, contrattiMinerari: [contratto] };

    const { stato: dopo, notifiche } = integraCostoOperativoContratti(stato, 60_000);

    expect(dopo.crediti).toBe(0); // mai negativo
    expect(dopo.contrattiMinerari[0].attivo).toBe(false); // sospeso, non in debito
    expect(notifiche.some((n) => n.includes("sospeso"))).toBe(true);
  });
});

describe("G2.8 — i prezzi di mercato non cambiano mentre il gioco e' in pausa", () => {
  it("l'orologio simulato e il mercato restano fermi con il motore in pausa, anche dopo update() ripetuti", () => {
    const engine = new SimulationEngine("regressione-g2-pausa-mercato");
    engine.dispatch({ id: "pausa", type: "ui/togglePause" });
    expect(engine.getState().inPausa).toBe(true);

    const prezziPrima = engine.getState().mercato.prezzi;
    const tempoPrima = engine.getState().tempoSimulatoMs;

    engine.update(10 * 60 * 1000); // ben oltre l'intervallo di aggiornamento mercato (5 min)
    engine.update(10 * 60 * 1000);

    expect(engine.getState().tempoSimulatoMs).toBe(tempoPrima);
    expect(engine.getState().mercato.prezzi).toEqual(prezziPrima);
  });
});

describe("G2.10 — ricaricare un salvataggio non duplica premi missione/estrazioni/carte", () => {
  it("caricaStato sostituisce interamente lo stato senza rieseguire alcuna logica di gioco", () => {
    const engine = new SimulationEngine("regressione-g2-reload");
    engine.update(500);
    const statoPrimaDelReload = engine.getState();
    const manoPrima = statoPrimaDelReload.manoCarte.length;
    const creditiPrima = statoPrimaDelReload.crediti;
    const missioniCompletatePrima = statoPrimaDelReload.missioni.filter((m) => m.stato === "completata").length;

    // Simula un "ricaricamento" di pagina: nuovo motore, stesso stato salvato.
    const motoreRicaricato = new SimulationEngine(statoPrimaDelReload.seed, statoPrimaDelReload);

    expect(motoreRicaricato.getState().manoCarte.length).toBe(manoPrima);
    expect(motoreRicaricato.getState().crediti).toBe(creditiPrima);
    expect(motoreRicaricato.getState().missioni.filter((m) => m.stato === "completata").length).toBe(missioniCompletatePrima);
    // Nessun avanzamento di tempo "fantasma" al semplice ricaricamento.
    expect(motoreRicaricato.getState().tempoSimulatoMs).toBe(statoPrimaDelReload.tempoSimulatoMs);
  });
});

describe("G2.12 — un evento critico non sblocca una pausa volontaria preesistente", () => {
  it("il motore resta in pausa anche con un evento critico attivo, e la scelta dell'evento non la rimuove", () => {
    const engine = new SimulationEngine("regressione-g2-pausa-evento-critico");
    engine.dispatch({ id: "pausa", type: "ui/togglePause" });
    expect(engine.getState().inPausa).toBe(true);

    // @ts-expect-error accesso diretto allo stato privato solo per fixture di test.
    engine.state = { ...engine.getState(), eventi: { ...engine.getState().eventi, attivi: [{ id: "evt-critico", definizioneId: "EVT-PIR-02", creatoAlMs: 0 }] } };

    const risultato = engine.dispatch({ id: "scelta-evento-critico", type: "ui/sceltaEvento", payload: { eventoId: "evt-critico", scelteId: "pagaPesante" } });

    expect(risultato.ok).toBe(true);
    expect(engine.getState().inPausa).toBe(true); // la pausa volontaria resta intatta
  });
});
