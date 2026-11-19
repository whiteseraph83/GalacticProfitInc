import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { prossimaScenaSceneggiatura } from "../src/domain/campaignScenes";
import type { GameState } from "../src/domain/types";

// Verifica che le scene con un trigger reale (richiesta utente: "alcuni
// dialoghi devono innescarsi solo ad un evento specifico") restino bloccate
// finche' l'evento non e' avvenuto, anche se il capitolo e' gia' raggiunto,
// e si sblocchino non appena lo stato lo riflette.

function statoAlCapitolo1(): GameState {
  const base = creaStatoIniziale("scene-capitoli-test");
  return { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-1" } };
}

describe("prossimaScenaSceneggiatura", () => {
  it("C1_S01 e' sempre la prima scena su uno stato iniziale", () => {
    const stato = statoAlCapitolo1();
    expect(prossimaScenaSceneggiatura(stato, new Set())).not.toBeNull();
    expect(prossimaScenaSceneggiatura(stato, new Set())?.id).toBe("C1_S01");
  });

  it("C1_S02R (esito Radar) resta bloccata finche' Radar non e' stato davvero usato (richiesta utente)", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConRadar: GameState = { ...stato, pianeti: stato.pianeti.map((p, i) => (i === 0 ? { ...p, sempreVisibile: true } : p)) };
    expect(prossimaScenaSceneggiatura(statoConRadar, viste)?.id).toBe("C1_S02R");
  });

  it("C1_S03 (prima investigazione) resta bloccata finche' nessun pianeta e' investigato", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoInvestigato: GameState = { ...stato, pianeti: stato.pianeti.map((p, i) => (i === 0 ? { ...p, investigato: true } : p)) };
    expect(prossimaScenaSceneggiatura(statoInvestigato, viste)?.id).toBe("C1_S03");
  });

  it("C1_S05 (prima vendita) resta bloccata finche' venditeTotali e' 0", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConVendita: GameState = { ...stato, contabilita: { ...stato.contabilita, venditeTotali: 1 } };
    expect(prossimaScenaSceneggiatura(statoConVendita, viste)?.id).toBe("C1_S05");
  });

  it("C1_S06 (prima fabbrica) resta bloccata finche' la fabbrica non e' costruita", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConFabbrica: GameState = { ...stato, fabbrica: { ...stato.fabbrica, costruita: true } };
    expect(prossimaScenaSceneggiatura(statoConFabbrica, viste)?.id).toBe("C1_S06");
  });

  it("C2_S02 (offerta di Krix) resta bloccata finche' EVT-COM-01 non e' mai comparso", () => {
    const base = creaStatoIniziale("scene-capitoli-c2-s02");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-2" } };
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08", "C2_S01"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConKrix: GameState = { ...stato, campagna: { ...stato.campagna, eventiMercatoSpeciali: ["EVT-COM-01"] } };
    expect(prossimaScenaSceneggiatura(statoConKrix, viste)?.id).toBe("C2_S02");
  });

  it("C2_S07 (cliente cancellato) resta bloccata finche' EVT-COM-02 non e' mai comparso", () => {
    const base = creaStatoIniziale("scene-capitoli-c2-s07");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-2", eventiMercatoSpeciali: ["EVT-COM-01"] } };
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08", "C2_S01", "C2_S02", "C2_S03", "C2_S04", "C2_S05", "C2_S06"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConCliente: GameState = { ...stato, campagna: { ...stato.campagna, eventiMercatoSpeciali: ["EVT-COM-01", "EVT-COM-02"] } };
    expect(prossimaScenaSceneggiatura(statoConCliente, viste)?.id).toBe("C2_S07");
  });

  it("C2_S03 (primo contatto Xylo) resta bloccata finche' nessun pianeta e' sempreVisibile (Radar)", () => {
    const base = creaStatoIniziale("scene-capitoli-c2-s03");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-2", eventiMercatoSpeciali: ["EVT-COM-01", "EVT-COM-02"] } };
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08", "C2_S01", "C2_S02"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConRadar: GameState = { ...stato, pianeti: stato.pianeti.map((p, i) => (i === 0 ? { ...p, sempreVisibile: true } : p)) };
    expect(prossimaScenaSceneggiatura(statoConRadar, viste)?.id).toBe("C2_S03");
  });

  it("C2_S04 (relitto industriale) resta bloccata finche' nessun relitto e' recuperato", () => {
    const base = creaStatoIniziale("scene-capitoli-c2-s04");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-2" } };
    const viste = new Set(["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08", "C2_S01", "C2_S02", "C2_S03"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConRelitto: GameState = {
      ...stato,
      campiRelitti: [{ id: "w-1", tipo: "relitto", posizione: { x: 0, y: 0 }, raggio: 10, scoperto: true, recuperato: true }],
    };
    expect(prossimaScenaSceneggiatura(statoConRelitto, viste)?.id).toBe("C2_S04");
  });

  it("C3_S01 (segnale ripetuto) resta bloccata finche' nessun pericolo e' scoperto", () => {
    const base = creaStatoIniziale("scene-capitoli-c3-s01");
    const stato: GameState = {
      ...base,
      campagna: { ...base.campagna, capitoloCorrente: "CAP-3" },
      // Forzato esplicitamente a "nessuno scoperto": la generazione casuale
      // del mondo puo' comunque piazzare un pericolo dentro l'area sicura
      // (comportamento invariato, non riguardato dalla richiesta utente sui
      // pianeti), e la fixture non deve dipendere da quell'esito casuale.
      pericoli: base.pericoli.map((p) => ({ ...p, scoperto: false })),
    };
    const viste = new Set([
      "C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08",
      "C2_S01", "C2_S02", "C2_S03", "C2_S04", "C2_S05", "C2_S06", "C2_S07", "C2_S08",
    ]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConPericolo: GameState = { ...stato, pericoli: stato.pericoli.map((p, i) => (i === 0 ? { ...p, scoperto: true } : p)) };
    expect(prossimaScenaSceneggiatura(statoConPericolo, viste)?.id).toBe("C3_S01");
  });

  it("C4_S02 (autorizzazione mineraria) resta bloccata finche' nessuna civilta' ha una richiesta attiva", () => {
    const base = creaStatoIniziale("scene-capitoli-c4-s02");
    const stato: GameState = {
      ...base,
      campagna: { ...base.campagna, capitoloCorrente: "CAP-4" },
      civilta: base.civilta.map((c) => ({ ...c, richiestaAttiva: null })),
    };
    const viste = new Set([
      "C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08",
      "C2_S01", "C2_S02", "C2_S03", "C2_S04", "C2_S05", "C2_S06", "C2_S07", "C2_S08",
      "C3_S01", "C3_S02", "C3_S03", "C3_S04", "C3_S05", "C3_S06", "C3_S07", "C3_S08",
      "C4_S01",
    ]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConRichiesta: GameState = {
      ...stato,
      civilta: [{ id: "civ-1", nome: "Test", posizione: { x: 0, y: 0 }, raggio: 50, scoperta: true, relazione: 30, richiestaAttiva: { risorsa: "ferro", quantita: 10, progresso: 0, ricompensaCrediti: 100, ricompensaRelazione: 5 } }],
    };
    expect(prossimaScenaSceneggiatura(statoConRichiesta, viste)?.id).toBe("C4_S02");
  });

  it("C5_S08 (epilogo) e C5_S09 (epilogo segreto) restano bloccati finche' nessun finale e' stato assegnato", () => {
    const base = creaStatoIniziale("scene-capitoli-c5-s08");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-5" } };
    const viste = new Set([
      "C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08",
      "C2_S01", "C2_S02", "C2_S03", "C2_S04", "C2_S05", "C2_S06", "C2_S07", "C2_S08",
      "C3_S01", "C3_S02", "C3_S03", "C3_S04", "C3_S05", "C3_S06", "C3_S07", "C3_S08",
      "C4_S01", "C4_S02", "C4_S03", "C4_S04", "C4_S05", "C4_S06", "C4_S07", "C4_S08",
      "C5_S01", "C5_S02", "C5_S03", "C5_S04", "C5_S05", "C5_S06",
    ]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConFinale: GameState = { ...stato, campagna: { ...stato.campagna, finaleOttenuto: "FIN-LEALTA" } };
    expect(prossimaScenaSceneggiatura(statoConFinale, viste)?.id).toBe("C5_S08");
  });

  it("C5_S07 (liquidazione) compare subito quando scatta il game over, anche al capitolo 1", () => {
    const stato: GameState = { ...statoAlCapitolo1(), gameOver: { motivo: "test" } };
    expect(prossimaScenaSceneggiatura(stato, new Set())?.id).toBe("C5_S07");
  });

  it("C5_S07 non compare in sequenza al capitolo 5 se non c'e' stato un game over", () => {
    const base = creaStatoIniziale("scene-capitoli-c5-senza-gameover");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-5" } };
    // Tutte le scene precedenti gia' viste, compresa C5_S06; resta solo C5_S07.
    const tutteTranneLiquidazione = new Set(
      ["C1_S01", "C1_S02", "C1_S02R", "C1_S02I", "C1_S03", "C1_S03I", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08",
       "C2_S01", "C2_S02", "C2_S03", "C2_S04", "C2_S05", "C2_S06", "C2_S07", "C2_S08",
       "C3_S01", "C3_S02", "C3_S03", "C3_S04", "C3_S05", "C3_S06", "C3_S07", "C3_S08",
       "C4_S01", "C4_S02", "C4_S03", "C4_S04", "C4_S05", "C4_S06", "C4_S07", "C4_S08",
       "C5_S01", "C5_S02", "C5_S03", "C5_S04", "C5_S05", "C5_S06"],
    );
    expect(prossimaScenaSceneggiatura(stato, tutteTranneLiquidazione)).toBeNull();
  });
});
