import { describe, expect, it } from "vitest";
import { MERCATO_CARTE, PREZZI_CARTE } from "../src/domain/cardMarket";
import { creaStatoIniziale } from "../src/domain/initialState";
import { SeededRng } from "../src/domain/rng";
import {
  applicaAcquistaCartaMercato,
  integraRotazioneMercatoCarte,
  validaAcquistaCartaMercato,
} from "../src/simulation/cardMarket";
import type { GameState } from "../src/domain/types";

describe("integraRotazioneMercatoCarte", () => {
  it("non rinnova il mercato prima che sia trascorso l'intervallo", () => {
    const base = creaStatoIniziale("mercato-rotazione-presto");
    const rng = new SeededRng("rng-rotazione");
    const stato: GameState = { ...base, tempoSimulatoMs: MERCATO_CARTE.intervalloRotazioneMs - 1 };
    const { stato: dopo, notifiche } = integraRotazioneMercatoCarte(stato, rng);
    expect(dopo).toBe(stato);
    expect(notifiche).toHaveLength(0);
  });

  it("rinnova gli slot una volta trascorso l'intervallo, aggiornando ultimaRotazioneMs", () => {
    const base = creaStatoIniziale("mercato-rotazione-dovuta");
    const rng = new SeededRng("rng-rotazione-2");
    const slotsPrima = base.mercatoCarte.slots;
    const stato: GameState = { ...base, tempoSimulatoMs: MERCATO_CARTE.intervalloRotazioneMs };
    const { stato: dopo, notifiche } = integraRotazioneMercatoCarte(stato, rng);

    expect(dopo.mercatoCarte.slots).toHaveLength(MERCATO_CARTE.numeroSlot);
    expect(dopo.mercatoCarte.slots).not.toBe(slotsPrima);
    expect(dopo.mercatoCarte.ultimaRotazioneMs).toBe(stato.tempoSimulatoMs);
    expect(notifiche.length).toBeGreaterThan(0);
    for (const slot of dopo.mercatoCarte.slots) {
      expect(PREZZI_CARTE[slot.code]).toBe(slot.prezzo);
    }
  });
});

describe("validaAcquistaCartaMercato / applicaAcquistaCartaMercato", () => {
  function statoConCrediti(crediti: number): GameState {
    return { ...creaStatoIniziale("mercato-acquisto"), crediti };
  }

  it("rifiuta uno slotId inesistente", () => {
    const stato = statoConCrediti(10_000);
    expect(validaAcquistaCartaMercato(stato, "slot-inesistente").ok).toBe(false);
  });

  it("rifiuta l'acquisto con crediti insufficienti", () => {
    const stato = statoConCrediti(0);
    const slot = stato.mercatoCarte.slots[0];
    expect(validaAcquistaCartaMercato(stato, slot.id).ok).toBe(false);
  });

  it("rifiuta l'acquisto se la mano e' piena", () => {
    let stato = statoConCrediti(100_000);
    const slot = stato.mercatoCarte.slots[0];
    while (stato.manoCarte.length < stato.capacitaManoCarte) {
      stato = { ...stato, manoCarte: [...stato.manoCarte, { instanceId: `riempi-${stato.manoCarte.length}`, code: slot.code, livello: 1 }] };
    }
    expect(validaAcquistaCartaMercato(stato, slot.id).ok).toBe(false);
  });

  it("acquista correttamente: scala i crediti, aggiunge la carta alla mano, registra la spesa", () => {
    const base = statoConCrediti(10_000);
    // Libera uno slot: la mano iniziale e' gia' alla capacita' massima.
    const stato: GameState = { ...base, manoCarte: base.manoCarte.slice(1) };
    const slot = stato.mercatoCarte.slots[0];
    expect(validaAcquistaCartaMercato(stato, slot.id).ok).toBe(true);

    const manoPrima = stato.manoCarte.length;
    const speseTotaliPrima = stato.contabilita.speseTotali;
    const dopo = applicaAcquistaCartaMercato(stato, slot.id);

    expect(dopo.crediti).toBe(stato.crediti - slot.prezzo);
    expect(dopo.manoCarte).toHaveLength(manoPrima + 1);
    expect(dopo.manoCarte.at(-1)?.code).toBe(slot.code);
    expect(dopo.contabilita.speseTotali).toBe(speseTotaliPrima + slot.prezzo);
  });

  it("un acquisto con slotId inesistente lascia lo stato invariato", () => {
    const stato = statoConCrediti(10_000);
    const dopo = applicaAcquistaCartaMercato(stato, "slot-inesistente");
    expect(dopo).toBe(stato);
  });
});
