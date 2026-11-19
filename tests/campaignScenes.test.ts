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

  it("C1_S03 (prima investigazione) resta bloccata finche' nessun pianeta e' investigato", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoInvestigato: GameState = { ...stato, pianeti: stato.pianeti.map((p, i) => (i === 0 ? { ...p, investigato: true } : p)) };
    expect(prossimaScenaSceneggiatura(statoInvestigato, viste)?.id).toBe("C1_S03");
  });

  it("C1_S05 (prima vendita) resta bloccata finche' venditeTotali e' 0", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02", "C1_S03", "C1_S04"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConVendita: GameState = { ...stato, contabilita: { ...stato.contabilita, venditeTotali: 1 } };
    expect(prossimaScenaSceneggiatura(statoConVendita, viste)?.id).toBe("C1_S05");
  });

  it("C1_S06 (prima fabbrica) resta bloccata finche' la fabbrica non e' costruita", () => {
    const stato = statoAlCapitolo1();
    const viste = new Set(["C1_S01", "C1_S02", "C1_S03", "C1_S04", "C1_S05"]);
    expect(prossimaScenaSceneggiatura(stato, viste)).toBeNull();

    const statoConFabbrica: GameState = { ...stato, fabbrica: { ...stato.fabbrica, costruita: true } };
    expect(prossimaScenaSceneggiatura(statoConFabbrica, viste)?.id).toBe("C1_S06");
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
      ["C1_S01", "C1_S02", "C1_S03", "C1_S04", "C1_S05", "C1_S06", "C1_S07", "C1_S08",
       "C2_S01", "C2_S02", "C2_S03", "C2_S04", "C2_S05", "C2_S06", "C2_S07", "C2_S08",
       "C3_S01", "C3_S02", "C3_S03", "C3_S04", "C3_S05", "C3_S06", "C3_S07", "C3_S08",
       "C4_S01", "C4_S02", "C4_S03", "C4_S04", "C4_S05", "C4_S06", "C4_S07", "C4_S08",
       "C5_S01", "C5_S02", "C5_S03", "C5_S04", "C5_S05", "C5_S06"],
    );
    expect(prossimaScenaSceneggiatura(stato, tutteTranneLiquidazione)).toBeNull();
  });
});
