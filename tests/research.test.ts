import { describe, expect, it } from "vitest";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { SLOT_RICERCA_BASE, TECNOLOGIE, calcolaBonusRicerca } from "../src/domain/research";
import { SimulationEngine } from "../src/simulation/engine";
import { applicaAvviaRicerca, bonusRicerca, integraRicerca, slotRicercaMax, validaAvviaRicerca } from "../src/simulation/research";
import type { GameState } from "../src/domain/types";

describe("calcolaBonusRicerca", () => {
  it("ritorna i valori identita' quando nessuna tecnologia e' completata", () => {
    const bonus = calcolaBonusRicerca([]);
    expect(bonus.moltiplicatoreEstrazione).toBe(1);
    expect(bonus.moltiplicatoreVelocitaRaffinazione).toBe(1);
    expect(bonus.moltiplicatoreTrasporti).toBe(1);
    expect(bonus.moltiplicatoreCosti).toBe(1);
    expect(bonus.capacitaManoCarteBonus).toBe(0);
    expect(bonus.slotRicercaBonus).toBe(0);
    expect(bonus.slotModuloBonus).toBe(0);
  });

  it("somma gli effetti di piu' tecnologie completate", () => {
    const bonus = calcolaBonusRicerca(["IND-R1", "IND-R2"]);
    expect(bonus.moltiplicatoreEstrazione).toBeCloseTo(1.25);
    expect(bonus.moltiplicatoreVelocitaRaffinazione).toBeCloseTo(1.3);
  });

  it("il bonus slot modulo non supera il limite massimo anche con piu' tecnologie del previsto", () => {
    const bonus = calcolaBonusRicerca(["LOG-R3", "ECO-R3"]);
    expect(bonus.slotModuloBonus).toBe(2);
  });
});

describe("validaAvviaRicerca / applicaAvviaRicerca", () => {
  function statoBase(): GameState {
    const stato = creaStatoIniziale("ricerca-base");
    return { ...stato, crediti: 10_000, ricerca: { ...stato.ricerca, puntiRicerca: 100 } };
  }

  it("rifiuta una tecnologia sconosciuta", () => {
    expect(validaAvviaRicerca(statoBase(), "NON-ESISTE").ok).toBe(false);
  });

  it("rifiuta se i prerequisiti non sono soddisfatti", () => {
    // ESP-02 richiede ESP-01.
    expect(validaAvviaRicerca(statoBase(), "ESP-02").ok).toBe(false);
  });

  it("accetta una tecnologia senza prerequisiti con crediti sufficienti", () => {
    expect(validaAvviaRicerca(statoBase(), "ESP-01").ok).toBe(true);
  });

  it("rifiuta con crediti insufficienti", () => {
    const stato: GameState = { ...statoBase(), crediti: 0 };
    expect(validaAvviaRicerca(stato, "ESP-01").ok).toBe(false);
  });

  it("rifiuta una tecnologia gia' completata o gia' in corso", () => {
    let stato = statoBase();
    stato = applicaAvviaRicerca(stato, "ESP-01");
    expect(validaAvviaRicerca(stato, "ESP-01").ok).toBe(false); // gia' in corso

    const completata: GameState = { ...stato, ricerca: { ...stato.ricerca, progettiAttivi: [], completate: ["ESP-01"] } };
    expect(validaAvviaRicerca(completata, "ESP-01").ok).toBe(false); // gia' completata
  });

  it("rispetta il limite di slot di ricerca contemporanei (limite livello)", () => {
    let stato = statoBase();
    expect(slotRicercaMax(stato)).toBe(SLOT_RICERCA_BASE);
    stato = applicaAvviaRicerca(stato, "ESP-01");
    // Un secondo progetto, su un ramo diverso senza prerequisiti, deve essere rifiutato: nessuno slot libero.
    expect(validaAvviaRicerca(stato, "IND-R1").ok).toBe(false);

    // Con un bonus di slot (simulato direttamente nello stato), il secondo progetto e' ammesso.
    const statoConSlotExtra: GameState = { ...stato, ricerca: { ...stato.ricerca, completate: ["LOG-R1", "LOG-R2"] } };
    expect(slotRicercaMax(statoConSlotExtra)).toBe(SLOT_RICERCA_BASE + 1);
    expect(validaAvviaRicerca(statoConSlotExtra, "IND-R1").ok).toBe(true);
  });

  it("applicaAvviaRicerca deduce i crediti e crea un progetto con la durata corretta", () => {
    const stato = statoBase();
    const dopo = applicaAvviaRicerca(stato, "ESP-01");
    const tecnologia = TECNOLOGIE["ESP-01"];
    expect(dopo.crediti).toBe(stato.crediti - tecnologia.costoCrediti);
    expect(dopo.ricerca.progettiAttivi).toHaveLength(1);
    expect(dopo.ricerca.progettiAttivi[0].fineMs).toBe(dopo.tempoSimulatoMs + tecnologia.durataMs);
  });
});

describe("integraRicerca", () => {
  it("non completa un progetto prima dello scadere del timer", () => {
    const stato = applicaAvviaRicerca({ ...creaStatoIniziale("ricerca-timer"), crediti: 10_000 }, "ESP-01");
    const { stato: dopo, notifiche } = integraRicerca(stato);
    expect(dopo).toBe(stato);
    expect(notifiche).toHaveLength(0);
  });

  it("completa il progetto quando il tempo simulato raggiunge fineMs, spostando la tecnologia in completate", () => {
    let stato = applicaAvviaRicerca({ ...creaStatoIniziale("ricerca-completamento"), crediti: 10_000 }, "ESP-01");
    stato = { ...stato, tempoSimulatoMs: stato.ricerca.progettiAttivi[0].fineMs };
    const { stato: dopo, notifiche } = integraRicerca(stato);
    expect(dopo.ricerca.progettiAttivi).toHaveLength(0);
    expect(dopo.ricerca.completate).toContain("ESP-01");
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("applica i bonus attivi anche a piu' tecnologie completate contemporaneamente", () => {
    let stato = applicaAvviaRicerca({ ...creaStatoIniziale("ricerca-multi"), crediti: 10_000 }, "ESP-01");
    stato = { ...stato, tempoSimulatoMs: stato.ricerca.progettiAttivi[0].fineMs };
    const { stato: dopo } = integraRicerca(stato);
    expect(bonusRicerca(dopo).raggioFogBonus).toBe(TECNOLOGIE["ESP-01"].effetto.valore);
  });
});

describe("ricerca in pausa (via motore)", () => {
  it("un progetto di ricerca non avanza mentre il motore e' in pausa", () => {
    const engine = new SimulationEngine("ricerca-pausa");
    // Da' crediti e punti ricerca sufficienti direttamente sullo stato per il test (pattern gia' usato altrove).
    // @ts-expect-error accesso diretto allo stato privato solo per fixture di test.
    engine.state = { ...engine.getState(), crediti: 10_000, ricerca: { ...engine.getState().ricerca, puntiRicerca: 100 } };

    engine.dispatch({
      id: "avvia-ricerca",
      type: "ui/avviaRicerca",
      payload: { tecnologiaId: "ESP-01" },
    });
    expect(engine.getState().ricerca.progettiAttivi).toHaveLength(1);

    engine.dispatch({ id: "pausa", type: "ui/togglePause" });
    expect(engine.getState().inPausa).toBe(true);

    engine.update(TECNOLOGIE["ESP-01"].durataMs + 10_000);
    expect(engine.getState().ricerca.completate).toHaveLength(0);
    expect(engine.getState().tempoSimulatoMs).toBe(0);
  });
});

describe("idempotenza del comando ui/giocaCarta per RSH-01", () => {
  it("un id di comando ripetuto non avvia due volte la stessa ricerca ne' consuma due carte", () => {
    const engine = new SimulationEngine("ricerca-idempotenza");
    // @ts-expect-error accesso diretto allo stato privato solo per fixture di test.
    engine.state = { ...engine.getState(), crediti: 10_000 };

    const cartaRicerca = engine.getState().manoCarte.find((c) => c.code === "RSH-01")!;
    const comando = {
      id: "comando-duplicato",
      type: "ui/giocaCarta" as const,
      payload: { cardInstanceId: cartaRicerca.instanceId, bersaglio: { tecnologiaId: "ESP-01" } },
    };

    const primoRisultato = engine.dispatch(comando);
    expect(primoRisultato.ok).toBe(true);
    const creditiDopoPrimoDispatch = engine.getState().crediti;
    const progettiDopoPrimoDispatch = engine.getState().ricerca.progettiAttivi.length;

    const secondoRisultato = engine.dispatch(comando);
    expect(secondoRisultato.ok).toBe(false);
    expect(engine.getState().crediti).toBe(creditiDopoPrimoDispatch);
    expect(engine.getState().ricerca.progettiAttivi).toHaveLength(progettiDopoPrimoDispatch);
  });
});

describe("stato iniziale con ricerca", () => {
  it("resta valido secondo validaStato", () => {
    expect(validaStato(creaStatoIniziale("ricerca-stato-valido"))).toEqual([]);
  });
});
