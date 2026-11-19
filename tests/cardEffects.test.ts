import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { CARD_EFFECTS } from "../src/domain/cardEffectsConfig";
import { SeededRng } from "../src/domain/rng";
import {
  applicaAvviaEsplorazione,
  applicaGiocaCarta,
  integraCostoOperativoContratti,
  integraEsplorazione,
  integraInvestigazioni,
  validaAvviaEsplorazione,
  validaGiocaCarta,
} from "../src/simulation/cardEffects";
import { WORLD } from "../src/domain/worldConstants";
import type { CardInstance, GameState, Planet } from "../src/domain/types";

function trovaCartaInMano(stato: GameState, code: CardInstance["code"]): CardInstance {
  const carta = stato.manoCarte.find((c) => c.code === code);
  if (!carta) throw new Error(`carta ${code} non in mano`);
  return carta;
}

describe("validaGiocaCarta / applicaGiocaCarta — Radar (OPS-01, ex Esplora)", () => {
  it("rileva un pianeta non investigato fuori dal raggio sensori, lo rende sempre visibile e consuma la carta atomicamente", () => {
    const stato = creaStatoIniziale("carte-radar");
    const fuoriRaggio = stato.pianeti.find(
      (p) => !p.investigato && Math.hypot(p.posizione.x - stato.mothership.posizione.x, p.posizione.y - stato.mothership.posizione.y) > WORLD.visibilitaRaggio,
    );
    expect(fuoriRaggio).toBeDefined();
    if (!fuoriRaggio) return;
    const carta = trovaCartaInMano(stato, "OPS-01");

    expect(validaGiocaCarta(stato, carta.instanceId, {}).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, {}, new SeededRng("x"));

    expect(dopo.manoCarte.find((c) => c.instanceId === carta.instanceId)).toBeUndefined();
    const rilevato = dopo.pianeti.find((p) => p.sempreVisibile);
    expect(rilevato).toBeDefined();
    expect(rilevato?.scoperto).toBe(true);
    expect(dopo.review.carteGiocateTotali).toBe(stato.review.carteGiocateTotali + 1);
  });

  it("rifiuta se nessun pianeta e' idoneo (tutti investigati o entro il raggio sensori)", () => {
    const stato = creaStatoIniziale("carte-radar-nessuno");
    const carta = trovaCartaInMano(stato, "OPS-01");
    // Tutti i pianeti vengono portati entro il raggio sensori: nessun bersaglio idoneo.
    const statoSenzaBersagli: GameState = {
      ...stato,
      pianeti: stato.pianeti.map((p) => ({ ...p, posizione: { x: 0, y: 0 } })),
    };
    const risultato = validaGiocaCarta(statoSenzaBersagli, carta.instanceId, {});
    expect(risultato.ok).toBe(false);
  });

  it("rileva sempre il pianeta idoneo piu' vicino, non uno a caso (richiesta utente)", () => {
    const base = creaStatoIniziale("carte-radar-vicino");
    const lontano: Planet = { ...base.pianeti[0], id: "lontano", posizione: { x: 1000, y: 0 }, investigato: false };
    const vicino: Planet = { ...base.pianeti[0], id: "vicino", posizione: { x: WORLD.visibilitaRaggio + 20, y: 0 }, investigato: false };
    const medio: Planet = { ...base.pianeti[0], id: "medio", posizione: { x: WORLD.visibilitaRaggio + 150, y: 0 }, investigato: false };
    const stato: GameState = { ...base, pianeti: [lontano, vicino, medio] };
    const carta = trovaCartaInMano(stato, "OPS-01");

    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, {}, new SeededRng("qualsiasi-seed"));
    const rilevato = dopo.pianeti.find((p) => p.sempreVisibile);
    expect(rilevato?.id).toBe("vicino");
  });
});

describe("validaGiocaCarta / applicaGiocaCarta — Investiga (OPS-02)", () => {
  it("avvia un'investigazione temporizzata (non istantanea)", () => {
    const base = creaStatoIniziale("carte-investiga");
    // Nessun pianeta e' gia' scoperto a inizio partita (richiesta utente):
    // si simula qui l'esito del Radar segnando il primo pianeta scoperto.
    const stato: GameState = { ...base, pianeti: base.pianeti.map((p, i) => (i === 0 ? { ...p, scoperto: true } : p)) };
    const pianeta = stato.pianeti[0];
    const carta = trovaCartaInMano(stato, "OPS-02");
    const bersaglio = { planetId: pianeta.id };

    expect(validaGiocaCarta(stato, carta.instanceId, bersaglio).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, bersaglio, new SeededRng("y"));

    const aggiornato = dopo.pianeti.find((p) => p.id === pianeta.id);
    expect(aggiornato?.investigato).toBe(false); // non ancora: deve passare il tempo
    expect(aggiornato?.investigazioneCompletataAlMs).not.toBeNull();
  });

  it("rifiuta un pianeta non scoperto", () => {
    const stato = creaStatoIniziale("carte-investiga-non-scoperto");
    const nonScoperto = stato.pianeti.find((p) => !p.scoperto);
    const carta = trovaCartaInMano(stato, "OPS-02");
    expect(nonScoperto).toBeDefined();
    if (!nonScoperto) return;
    expect(validaGiocaCarta(stato, carta.instanceId, { planetId: nonScoperto.id }).ok).toBe(false);
  });

  it("rifiuta una seconda investigazione sullo stesso pianeta gia' in corso", () => {
    const base = creaStatoIniziale("carte-investiga-doppia");
    const stato: GameState = { ...base, pianeti: base.pianeti.map((p, i) => (i === 0 ? { ...p, scoperto: true } : p)) };
    const pianeta = stato.pianeti[0];
    const carta = trovaCartaInMano(stato, "OPS-02");
    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, { planetId: pianeta.id }, new SeededRng("z"));

    // Nessun'altra copia di OPS-02 in mano per questo test: verifichiamo solo la validazione.
    const risultato = validaGiocaCarta(dopo, "carta-fittizia", { planetId: pianeta.id });
    expect(risultato.ok).toBe(false); // carta inesistente comunque rifiutata

    const statoConSecondaCarta: GameState = {
      ...dopo,
      manoCarte: [...dopo.manoCarte, { instanceId: "seconda-investiga", code: "OPS-02", livello: 1 }],
    };
    expect(validaGiocaCarta(statoConSecondaCarta, "seconda-investiga", { planetId: pianeta.id }).ok).toBe(false);
  });

  it("l'investigazione si completa dopo il tempo previsto (10-30s)", () => {
    const base = creaStatoIniziale("carte-investiga-completa");
    const stato: GameState = { ...base, pianeti: base.pianeti.map((p, i) => (i === 0 ? { ...p, scoperto: true } : p)) };
    const pianeta = stato.pianeti[0];
    const carta = trovaCartaInMano(stato, "OPS-02");
    const { stato: dopoAvvio } = applicaGiocaCarta(stato, carta.instanceId, { planetId: pianeta.id }, new SeededRng("durata"));

    const { stato: troppoPresto } = integraInvestigazioni({ ...dopoAvvio, tempoSimulatoMs: dopoAvvio.tempoSimulatoMs + 5000 });
    expect(troppoPresto.pianeti.find((p) => p.id === pianeta.id)?.investigato).toBe(false);

    const { stato: completata, notifiche } = integraInvestigazioni({ ...dopoAvvio, tempoSimulatoMs: dopoAvvio.tempoSimulatoMs + 31000 });
    expect(completata.pianeti.find((p) => p.id === pianeta.id)?.investigato).toBe(true);
    expect(notifiche.length).toBeGreaterThan(0);
  });
});

describe("validaGiocaCarta / applicaGiocaCarta — Contratto minerario (IND-01)", () => {
  function statoConPianetaInvestigato(seed: string): { stato: GameState; pianetaId: string } {
    const base = creaStatoIniziale(seed);
    const pianeta = base.pianeti[0];
    const investigato = { ...pianeta, scoperto: true, investigato: true };
    return {
      stato: { ...base, pianeti: base.pianeti.map((p) => (p.id === pianeta.id ? investigato : p)) },
      pianetaId: pianeta.id,
    };
  }

  it("rifiuta un pianeta non investigato", () => {
    const base = creaStatoIniziale("carte-contratto-non-investigato");
    const stato: GameState = { ...base, pianeti: base.pianeti.map((p, i) => (i === 0 ? { ...p, scoperto: true } : p)) };
    const pianeta = stato.pianeti[0];
    const carta = trovaCartaInMano(stato, "IND-01");
    expect(validaGiocaCarta(stato, carta.instanceId, { planetId: pianeta.id }).ok).toBe(false);
  });

  it("avvia il contratto, deduce il costo iniziale e occupa la nave mineraria", () => {
    const { stato, pianetaId } = statoConPianetaInvestigato("carte-contratto-ok");
    const carta = trovaCartaInMano(stato, "IND-01");
    const crediti0 = stato.crediti;

    expect(validaGiocaCarta(stato, carta.instanceId, { planetId: pianetaId }).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, { planetId: pianetaId }, new SeededRng("contratto"));

    expect(dopo.crediti).toBe(crediti0 - CARD_EFFECTS.contrattoMinerario.costoIniziale);
    expect(dopo.contrattiMinerari).toHaveLength(1);
    expect(dopo.contrattiMinerari[0].pianetaId).toBe(pianetaId);
    expect(dopo.naviMinerarie[0].contrattoAttivoId).toBe(dopo.contrattiMinerari[0].id);
  });

  it("rifiuta un secondo contratto sullo stesso pianeta mentre il primo e' attivo", () => {
    const { stato, pianetaId } = statoConPianetaInvestigato("carte-contratto-doppio");
    const carta = trovaCartaInMano(stato, "IND-01");
    const { stato: dopoPrimo } = applicaGiocaCarta(stato, carta.instanceId, { planetId: pianetaId }, new SeededRng("c1"));

    const statoConSecondaCarta: GameState = {
      ...dopoPrimo,
      manoCarte: [...dopoPrimo.manoCarte, { instanceId: "seconda-ind01", code: "IND-01", livello: 1 }],
    };
    expect(validaGiocaCarta(statoConSecondaCarta, "seconda-ind01", { planetId: pianetaId }).ok).toBe(false);
  });

  it("rifiuta se i crediti sono insufficienti", () => {
    const { stato, pianetaId } = statoConPianetaInvestigato("carte-contratto-poveri");
    const statoPovero: GameState = { ...stato, crediti: 0 };
    const carta = trovaCartaInMano(statoPovero, "IND-01");
    expect(validaGiocaCarta(statoPovero, carta.instanceId, { planetId: pianetaId }).ok).toBe(false);
  });
});

describe("integraCostoOperativoContratti", () => {
  it("deduce il costo operativo nel tempo e sospende il contratto se i crediti finiscono", () => {
    const { stato, pianetaId } = (() => {
      const base = creaStatoIniziale("carte-costo-operativo");
      const pianeta = base.pianeti[0];
      const investigato = {
        ...base,
        pianeti: base.pianeti.map((p) => (p.id === pianeta.id ? { ...p, scoperto: true, investigato: true } : p)),
      };
      return { stato: investigato, pianetaId: pianeta.id };
    })();
    const carta = trovaCartaInMano(stato, "IND-01");
    const { stato: conContratto } = applicaGiocaCarta(stato, carta.instanceId, { planetId: pianetaId }, new SeededRng("op"));
    const statoPoveroConContratto: GameState = { ...conContratto, crediti: 1 };

    const { stato: dopo, notifiche } = integraCostoOperativoContratti(statoPoveroConContratto, 60_000);
    expect(dopo.crediti).toBe(0);
    expect(dopo.contrattiMinerari[0].attivo).toBe(false);
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("non modifica lo stato se non ci sono contratti", () => {
    const stato = creaStatoIniziale("carte-costo-nessun-contratto");
    const { stato: dopo } = integraCostoOperativoContratti(stato, 60_000);
    expect(dopo).toBe(stato);
  });
});

describe("Esplora: validaAvviaEsplorazione / applicaAvviaEsplorazione / integraEsplorazione", () => {
  it("rifiuta di avviare un'esplorazione se la mano e' piena", () => {
    const stato = creaStatoIniziale("esplora-mano-piena");
    expect(stato.manoCarte).toHaveLength(stato.capacitaManoCarte);
    expect(validaAvviaEsplorazione(stato).ok).toBe(false);
  });

  it("rifiuta di avviarne una seconda mentre una e' gia' in corso (una alla volta)", () => {
    const stato = creaStatoIniziale("esplora-gia-in-corso");
    const statoConSpazio: GameState = {
      ...stato,
      manoCarte: stato.manoCarte.slice(0, 2),
      esplorazione: { completataAlMs: 12_345 },
    };
    expect(validaAvviaEsplorazione(statoConSpazio).ok).toBe(false);
  });

  it("avvia un conto alla rovescia tra 1 e 3 minuti", () => {
    const stato = creaStatoIniziale("esplora-avvio");
    const statoConSpazio: GameState = { ...stato, manoCarte: stato.manoCarte.slice(0, 2) };
    const dopo = applicaAvviaEsplorazione(statoConSpazio, new SeededRng("esplora"));
    expect(dopo.esplorazione.completataAlMs).not.toBeNull();
    const durata = dopo.esplorazione.completataAlMs! - dopo.tempoSimulatoMs;
    expect(durata).toBeGreaterThanOrEqual(60_000);
    expect(durata).toBeLessThanOrEqual(3 * 60_000);
  });

  it("integraEsplorazione non fa nulla prima dello scadere del timer", () => {
    const stato = creaStatoIniziale("esplora-timer-non-scaduto");
    const statoInCorso: GameState = { ...stato, manoCarte: stato.manoCarte.slice(0, 2), esplorazione: { completataAlMs: 100_000 } };
    const { stato: dopo, notifiche } = integraEsplorazione({ ...statoInCorso, tempoSimulatoMs: 50_000 }, new SeededRng("x"));
    expect(dopo.manoCarte).toHaveLength(2);
    expect(dopo.esplorazione.completataAlMs).toBe(100_000);
    expect(notifiche).toHaveLength(0);
  });

  it("integraEsplorazione assegna una carta casuale e azzera il timer allo scadere", () => {
    const stato = creaStatoIniziale("esplora-completata");
    const statoInCorso: GameState = { ...stato, manoCarte: stato.manoCarte.slice(0, 2), esplorazione: { completataAlMs: 100_000 } };
    const { stato: dopo, notifiche } = integraEsplorazione({ ...statoInCorso, tempoSimulatoMs: 100_000 }, new SeededRng("y"));
    expect(dopo.manoCarte).toHaveLength(3);
    expect(dopo.esplorazione.completataAlMs).toBeNull();
    expect(notifiche.length).toBe(1);
  });
});
