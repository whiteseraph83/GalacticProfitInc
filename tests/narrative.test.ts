import { describe, expect, it } from "vitest";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { FINALI, SCENE_NARRATIVE, SOGLIA_FIDUCIA_LIQUIDAZIONE } from "../src/domain/narrative";
import { applicaSceltaNarrativa, integraCampagna, sceneAttiva, validaSceltaNarrativa } from "../src/simulation/narrative";
import type { GameState } from "../src/domain/types";

describe("sceneAttiva", () => {
  it("la prima scena (N1-1) e' sempre disponibile su uno stato iniziale", () => {
    const stato = creaStatoIniziale("narrativa-prima-scena");
    expect(sceneAttiva(stato)?.id).toBe("N1-1");
  });

  it("resta bloccata su N1-1 finche' non viene completata, anche se N1-2 sarebbe soddisfatta", () => {
    const base = creaStatoIniziale("narrativa-ordine");
    // N1-2 richiede 1 missione completata: lo simuliamo direttamente sullo stato.
    const stato: GameState = { ...base, missioni: base.missioni.map((m, i) => (i === 0 ? { ...m, stato: "completata" as const } : m)) };
    expect(sceneAttiva(stato)?.id).toBe("N1-1"); // N1-1 non e' ancora in sceneCompletate: resta lei la scena attiva
  });

  it("dopo aver completato N1-1, passa a N1-2 solo se la condizione e' soddisfatta", () => {
    const base = creaStatoIniziale("narrativa-progressione");
    const statoSenzaMissioni: GameState = { ...base, campagna: { ...base.campagna, sceneCompletate: ["N1-1"] } };
    expect(sceneAttiva(statoSenzaMissioni)).toBeNull(); // N1-2 richiede una missione completata

    const statoConMissione: GameState = {
      ...statoSenzaMissioni,
      missioni: base.missioni.map((m, i) => (i === 0 ? { ...m, stato: "completata" as const } : m)),
    };
    expect(sceneAttiva(statoConMissione)?.id).toBe("N1-2");
  });

  it("nessuna scena attiva una volta raggiunto un finale", () => {
    const base = creaStatoIniziale("narrativa-finale-raggiunto");
    const stato: GameState = { ...base, campagna: { ...base.campagna, finaleOttenuto: "FIN-LEALTA" } };
    expect(sceneAttiva(stato)).toBeNull();
  });
});

describe("integraCampagna", () => {
  it("imposta capitoloCorrente a CAP-1 non appena N1-1 e' la scena attiva", () => {
    const stato = creaStatoIniziale("narrativa-capitolo-1");
    const { stato: dopo, notifiche } = integraCampagna(stato);
    expect(dopo.campagna.capitoloCorrente).toBe("CAP-1");
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("non cambia nulla se il capitolo e' gia' corretto", () => {
    const base = creaStatoIniziale("narrativa-capitolo-stabile");
    const stato: GameState = { ...base, campagna: { ...base.campagna, capitoloCorrente: "CAP-1" } };
    const { stato: dopo, notifiche } = integraCampagna(stato);
    expect(dopo).toBe(stato);
    expect(notifiche).toHaveLength(0);
  });

  it("avanza a CAP-2 quando la scena attiva appartiene al capitolo 2", () => {
    const base = creaStatoIniziale("narrativa-capitolo-2");
    const stato: GameState = {
      ...base,
      campagna: {
        ...base.campagna,
        capitoloCorrente: "CAP-1",
        sceneCompletate: ["N1-1", "N1-2", "N1-3", "N2-1"],
      },
      ricerca: { progettiAttivi: [], completate: ["ESP-01"] }, // N2-2 non richiede questo, ma verifichiamo comunque N2-1->N2-2 non blocca
    };
    const { stato: dopo } = integraCampagna(stato);
    expect(dopo.campagna.capitoloCorrente).toBe("CAP-2");
  });
});

describe("validaSceltaNarrativa / applicaSceltaNarrativa", () => {
  it("rifiuta una scena che non e' quella attiva", () => {
    const stato = creaStatoIniziale("narrativa-scena-sbagliata");
    expect(validaSceltaNarrativa(stato, "N3-1", "continua").ok).toBe(false);
  });

  it("rifiuta una scelta non valida per una scena informativa", () => {
    const stato = creaStatoIniziale("narrativa-scelta-invalida");
    expect(validaSceltaNarrativa(stato, "N1-1", "scelta-inesistente").ok).toBe(false);
  });

  it("accetta 'continua' per una scena informativa e la segna come completata", () => {
    const stato = creaStatoIniziale("narrativa-continua");
    expect(validaSceltaNarrativa(stato, "N1-1", "continua").ok).toBe(true);
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N1-1", "continua");
    expect(dopo.campagna.sceneCompletate).toContain("N1-1");
  });

  it("applica l'effetto di allineamento di una scelta narrativa", () => {
    const base = creaStatoIniziale("narrativa-allineamento");
    const stato: GameState = { ...base, campagna: { ...base.campagna, sceneCompletate: ["N1-1", "N1-2"] } };
    expect(validaSceltaNarrativa(stato, "N1-3", "fedele").ok).toBe(true);
    const { stato: dopo, notifiche } = applicaSceltaNarrativa(stato, "N1-3", "fedele");
    expect(dopo.campagna.allineamento.lealta).toBe(2);
    expect(dopo.campagna.sceneCompletate).toContain("N1-3");
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("una scelta non riconosciuta non applica effetti ma la scena resta completata", () => {
    const base = creaStatoIniziale("narrativa-scelta-ignota-ma-valida");
    const stato: GameState = { ...base, campagna: { ...base.campagna, sceneCompletate: ["N1-1", "N1-2"] } };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N1-3", "non-esiste");
    expect(dopo.campagna.sceneCompletate).toContain("N1-3");
    expect(dopo.campagna.allineamento.lealta).toBe(0);
    expect(dopo.campagna.allineamento.indipendenza).toBe(0);
  });
});

describe("assegnazione del finale", () => {
  function statoAllaSceltaFinale(seed: string, fiducia = 100): GameState {
    const base = creaStatoIniziale(seed);
    const tutteLeAltreScene = Object.keys(SCENE_NARRATIVE).filter((id) => id !== "N5-2");
    return {
      ...base,
      review: { ...base.review, fiducia },
      campagna: { ...base.campagna, sceneCompletate: tutteLeAltreScene },
    };
  }

  it("sceglie il finale lealta' quando quell'asse e' nettamente il piu' alto", () => {
    const base = statoAllaSceltaFinale("narrativa-finale-lealta");
    const stato: GameState = { ...base, campagna: { ...base.campagna, allineamento: { lealta: 10, indipendenza: 0, ribellione: 0 } } };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N5-2", "resta-fedele");
    expect(dopo.campagna.finaleOttenuto).toBe("FIN-LEALTA");
  });

  it("sceglie il finale indipendenza quando quell'asse e' nettamente il piu' alto", () => {
    const base = statoAllaSceltaFinale("narrativa-finale-indipendenza");
    const stato: GameState = { ...base, campagna: { ...base.campagna, allineamento: { lealta: 0, indipendenza: 10, ribellione: 0 } } };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N5-2", "dichiara-indipendenza");
    expect(dopo.campagna.finaleOttenuto).toBe("FIN-INDIPENDENZA");
  });

  it("sceglie il finale ribellione quando quell'asse e' nettamente il piu' alto", () => {
    const base = statoAllaSceltaFinale("narrativa-finale-ribellione");
    const stato: GameState = { ...base, campagna: { ...base.campagna, allineamento: { lealta: 0, indipendenza: 0, ribellione: 10 } } };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N5-2", "esponi-tutto");
    expect(dopo.campagna.finaleOttenuto).toBe("FIN-RIBELLIONE");
  });

  it("la fiducia critica sovrasta qualunque allineamento (liquidazione)", () => {
    const base = statoAllaSceltaFinale("narrativa-finale-liquidazione", SOGLIA_FIDUCIA_LIQUIDAZIONE - 1);
    const stato: GameState = { ...base, campagna: { ...base.campagna, allineamento: { lealta: 50, indipendenza: 0, ribellione: 0 } } };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N5-2", "resta-fedele");
    expect(dopo.campagna.finaleOttenuto).toBe("FIN-LIQUIDAZIONE");
  });

  it("tre assi vicini tra loro sbloccano l'epilogo segreto", () => {
    // La scelta finale aggiunge +5 all'asse scelto: si parte da due assi
    // gia' pari e un terzo a zero, cosi' dopo l'effetto i tre restano entro
    // il margine previsto per l'epilogo segreto.
    const base = statoAllaSceltaFinale("narrativa-finale-segreto");
    const stato: GameState = {
      ...base,
      campagna: { ...base.campagna, allineamento: { lealta: 5, indipendenza: 5, ribellione: 0 } },
    };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N5-2", "esponi-tutto");
    expect(dopo.campagna.allineamento).toEqual({ lealta: 5, indipendenza: 5, ribellione: 5 });
    expect(dopo.campagna.finaleOttenuto).toBe("FIN-SEGRETO");
    expect(FINALI["FIN-SEGRETO"].segreto).toBe(true);
  });

  it("dopo il finale, sceneAttiva ritorna null anche se restassero condizioni soddisfatte", () => {
    const base = statoAllaSceltaFinale("narrativa-finale-chiude-scene");
    const stato: GameState = { ...base, campagna: { ...base.campagna, allineamento: { lealta: 10, indipendenza: 0, ribellione: 0 } } };
    const { stato: dopo } = applicaSceltaNarrativa(stato, "N5-2", "resta-fedele");
    expect(sceneAttiva(dopo)).toBeNull();
  });
});

describe("stato iniziale con campagna", () => {
  it("resta valido secondo validaStato", () => {
    expect(validaStato(creaStatoIniziale("narrativa-stato-valido"))).toEqual([]);
  });

  it("tutti i finali referenziati dalla logica esistono come definizioni", () => {
    expect(FINALI["FIN-LEALTA"]).toBeDefined();
    expect(FINALI["FIN-INDIPENDENZA"]).toBeDefined();
    expect(FINALI["FIN-RIBELLIONE"]).toBeDefined();
    expect(FINALI["FIN-LIQUIDAZIONE"]).toBeDefined();
    expect(FINALI["FIN-SEGRETO"]).toBeDefined();
  });
});
