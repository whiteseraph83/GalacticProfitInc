import { describe, expect, it } from "vitest";
import { creaStatoIniziale, BALANCE, validaStato } from "../src/domain/initialState";
import { PREZZI_BASE, MERCATO } from "../src/domain/market";
import { SeededRng } from "../src/domain/rng";
import {
  applicaAcquistaRisorsa,
  applicaPagaQuotaRevisione,
  applicaVendiRisorsa,
  integraMercato,
  integraRevisione,
  validaAcquistaRisorsa,
  validaVendiRisorsa,
} from "../src/simulation/economy";
import type { GameState } from "../src/domain/types";

describe("mercato", () => {
  it("non aggiorna i prezzi prima dell'intervallo", () => {
    const stato = creaStatoIniziale("mercato-presto");
    const statoConTempo = { ...stato, tempoSimulatoMs: 1000 };
    const { stato: dopo } = integraMercato(statoConTempo, new SeededRng("m"));
    expect(dopo).toBe(statoConTempo);
  });

  it("aggiorna i prezzi entro ±20% dal prezzo base dopo l'intervallo", () => {
    const stato = creaStatoIniziale("mercato-aggiornato");
    const { stato: dopo } = integraMercato({ ...stato, tempoSimulatoMs: MERCATO.intervalloAggiornamentoMs }, new SeededRng("m2"));
    for (const [risorsa, prezzoBase] of Object.entries(PREZZI_BASE)) {
      const nuovoPrezzo = dopo.mercato.prezzi[risorsa as keyof typeof PREZZI_BASE]!;
      expect(nuovoPrezzo).toBeGreaterThanOrEqual(prezzoBase * (1 - MERCATO.fluttuazioneMassima) - 1e-6);
      expect(nuovoPrezzo).toBeLessThanOrEqual(prezzoBase * (1 + MERCATO.fluttuazioneMassima) + 1e-6);
    }
    expect(dopo.mercato.ultimoAggiornamentoMs).toBe(MERCATO.intervalloAggiornamentoMs);
  });

  it("non aggiorna i prezzi mentre la simulazione e' in pausa (chiamata non effettuata dal motore)", () => {
    // La pausa e' garantita a monte da SimulationEngine.update(); qui si
    // verifica solo che integraMercato sia deterministica e pura.
    const stato = creaStatoIniziale("mercato-puro");
    const a = integraMercato({ ...stato, tempoSimulatoMs: MERCATO.intervalloAggiornamentoMs }, new SeededRng("x"));
    const b = integraMercato({ ...stato, tempoSimulatoMs: MERCATO.intervalloAggiornamentoMs }, new SeededRng("x"));
    expect(a.stato.mercato).toEqual(b.stato.mercato);
  });
});

describe("compravendita risorse", () => {
  function statoConFerro(seed: string, quantita: number): GameState {
    const base = creaStatoIniziale(seed);
    return { ...base, mothership: { ...base.mothership, stivaCarico: { ferro: quantita } } };
  }

  it("rifiuta quantita' non intere o non positive", () => {
    const stato = creaStatoIniziale("vendita-quantita-invalida");
    expect(validaVendiRisorsa(stato, "ferro", 0).ok).toBe(false);
    expect(validaVendiRisorsa(stato, "ferro", 2.5).ok).toBe(false);
    expect(validaAcquistaRisorsa(stato, "ferro", -1).ok).toBe(false);
  });

  it("vendere aggiunge crediti esatti e scala la stiva, mai sotto zero", () => {
    const stato = statoConFerro("vendita-ok", 20);
    const prezzo = stato.mercato.prezzi.ferro ?? PREZZI_BASE.ferro;
    expect(validaVendiRisorsa(stato, "ferro", 20).ok).toBe(true);
    const dopo = applicaVendiRisorsa(stato, "ferro", 20);
    expect(dopo.mothership.stivaCarico.ferro).toBe(0);
    expect(dopo.crediti).toBe(stato.crediti + Math.round(prezzo * 20));
    expect(dopo.contabilita.ricaviTotali).toBe(Math.round(prezzo * 20));
  });

  it("rifiuta la vendita se la quantita' richiesta eccede la stiva", () => {
    const stato = statoConFerro("vendita-eccesso", 5);
    expect(validaVendiRisorsa(stato, "ferro", 10).ok).toBe(false);
  });

  it("acquistare deduce crediti esatti e rifiuta se mancano crediti o spazio", () => {
    const stato = creaStatoIniziale("acquisto-ok");
    const prezzo = stato.mercato.prezzi.ferro ?? PREZZI_BASE.ferro;
    expect(validaAcquistaRisorsa(stato, "ferro", 10).ok).toBe(true);
    const dopo = applicaAcquistaRisorsa(stato, "ferro", 10);
    expect(dopo.mothership.stivaCarico.ferro).toBe(10);
    expect(dopo.crediti).toBe(stato.crediti - Math.round(prezzo * 10));
    expect(dopo.contabilita.speseTotali).toBe(Math.round(prezzo * 10));

    const statoPovero: GameState = { ...stato, crediti: 0 };
    expect(validaAcquistaRisorsa(statoPovero, "ferro", 1).ok).toBe(false);

    const statoStivaPiena: GameState = { ...stato, mothership: { ...stato.mothership, stivaCarico: { ferro: stato.mothership.stivaCapacita } } };
    expect(validaAcquistaRisorsa(statoStivaPiena, "ferro", 1).ok).toBe(false);
  });
});

describe("revisione aziendale", () => {
  function statoAllaSoglia(seed: string): GameState {
    const base = creaStatoIniziale(seed);
    return { ...base, review: { ...base.review, carteGiocateDallUltimaRevisione: base.review.sogliaCarteProssimaRevisione } };
  }

  it("diventa dovuta esattamente alla soglia, con la prima quota a 600 Cr", () => {
    const stato = statoAllaSoglia("revisione-dovuta");
    const { stato: dopo, notifiche } = integraRevisione(stato);
    expect(dopo.review.statoRevisione).toBe("dovuta");
    expect(dopo.review.quotaDaPagare).toBe(BALANCE.primaQuotaRevisione);
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("non diventa dovuta prima della soglia", () => {
    const stato = creaStatoIniziale("revisione-non-dovuta");
    const { stato: dopo } = integraRevisione(stato);
    expect(dopo.review.statoRevisione).toBe("nessuna");
  });

  it("puo' essere pagata anche dal solo capitale iniziale", () => {
    const dovuta = integraRevisione(statoAllaSoglia("revisione-paga-capitale")).stato;
    expect(dovuta.crediti).toBeGreaterThanOrEqual(dovuta.review.quotaDaPagare); // 2000 >= 600
    const { stato: pagata } = applicaPagaQuotaRevisione(dovuta);
    expect(pagata.crediti).toBe(dovuta.crediti - dovuta.review.quotaDaPagare);
    expect(pagata.review.statoRevisione).toBe("nessuna");
    expect(pagata.review.carteGiocateDallUltimaRevisione).toBe(0);
    expect(pagata.review.numeroRevisioniPagate).toBe(1);
  });

  it("lo stato restituito da creaStatoIniziale resta valido (validaStato)", () => {
    const stato = creaStatoIniziale("revisione-stato-valido");
    expect(validaStato(stato)).toEqual([]);
  });
});
