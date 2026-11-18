import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { NAVE_MINERARIA_COSTO } from "../src/domain/modules";
import { applicaAcquistaNaveMineraria, validaAcquistaNaveMineraria } from "../src/simulation/fleet";
import type { GameState } from "../src/domain/types";

describe("validaAcquistaNaveMineraria / applicaAcquistaNaveMineraria", () => {
  function statoConRisorse(crediti: number, ferroRaffinato: number): GameState {
    const base = creaStatoIniziale("acquisto-nave");
    return { ...base, crediti, mothership: { ...base.mothership, stivaCarico: { ferroRaffinato } } };
  }

  it("rifiuta con crediti insufficienti", () => {
    const stato = statoConRisorse(0, NAVE_MINERARIA_COSTO.ferroRaffinato);
    expect(validaAcquistaNaveMineraria(stato).ok).toBe(false);
  });

  it("rifiuta con ferro raffinato insufficiente", () => {
    const stato = statoConRisorse(NAVE_MINERARIA_COSTO.crediti, 0);
    expect(validaAcquistaNaveMineraria(stato).ok).toBe(false);
  });

  it("accetta con risorse sufficienti e aggiunge una nuova nave mineraria", () => {
    const stato = statoConRisorse(NAVE_MINERARIA_COSTO.crediti, NAVE_MINERARIA_COSTO.ferroRaffinato);
    expect(validaAcquistaNaveMineraria(stato).ok).toBe(true);

    const naviPrima = stato.naviMinerarie.length;
    const dopo = applicaAcquistaNaveMineraria(stato);
    expect(dopo.naviMinerarie).toHaveLength(naviPrima + 1);
    expect(dopo.crediti).toBe(0);
    expect(dopo.mothership.stivaCarico.ferroRaffinato).toBe(0);
    expect(dopo.contabilita.speseTotali).toBe(stato.contabilita.speseTotali + NAVE_MINERARIA_COSTO.crediti);
  });

  it("le navi acquistate hanno id unici", () => {
    const stato = statoConRisorse(10 * NAVE_MINERARIA_COSTO.crediti, 10 * NAVE_MINERARIA_COSTO.ferroRaffinato);
    const dopoUnAcquisto = applicaAcquistaNaveMineraria(stato);
    const dopoDueAcquisti = applicaAcquistaNaveMineraria(dopoUnAcquisto);
    const idUnici = new Set(dopoDueAcquisti.naviMinerarie.map((n) => n.id));
    expect(idUnici.size).toBe(dopoDueAcquisti.naviMinerarie.length);
  });
});
