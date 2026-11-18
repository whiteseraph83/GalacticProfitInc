import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { CARD_EFFECTS } from "../src/domain/cardEffectsConfig";
import { SeededRng } from "../src/domain/rng";
import {
  applicaGiocaCarta,
  integraCostoOperativoContratti,
  integraGenerazioneCarte,
  integraInvestigazioni,
  validaGiocaCarta,
} from "../src/simulation/cardEffects";
import type { CardInstance, GameState } from "../src/domain/types";

function trovaCartaInMano(stato: GameState, code: CardInstance["code"]): CardInstance {
  const carta = stato.manoCarte.find((c) => c.code === code);
  if (!carta) throw new Error(`carta ${code} non in mano`);
  return carta;
}

describe("validaGiocaCarta / applicaGiocaCarta — Esplora (OPS-01)", () => {
  it("rivela pianeti entro il raggio e consuma la carta atomicamente", () => {
    const stato = creaStatoIniziale("carte-esplora");
    const nonScoperto = stato.pianeti.find((p) => !p.scoperto);
    expect(nonScoperto).toBeDefined();
    if (!nonScoperto) return;
    const carta = trovaCartaInMano(stato, "OPS-01");
    const bersaglio = { punto: nonScoperto.posizione };

    expect(validaGiocaCarta(stato, carta.instanceId, bersaglio).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, carta.instanceId, bersaglio, new SeededRng("x"));

    expect(dopo.manoCarte.find((c) => c.instanceId === carta.instanceId)).toBeUndefined();
    expect(dopo.pianeti.find((p) => p.id === nonScoperto.id)?.scoperto).toBe(true);
    expect(dopo.review.carteGiocateTotali).toBe(stato.review.carteGiocateTotali + 1);
  });

  it("rifiuta un bersaglio non finito senza mutare lo stato", () => {
    const stato = creaStatoIniziale("carte-esplora-invalid");
    const carta = trovaCartaInMano(stato, "OPS-01");
    const risultato = validaGiocaCarta(stato, carta.instanceId, { punto: { x: Number.NaN, y: 0 } });
    expect(risultato.ok).toBe(false);
  });
});

describe("validaGiocaCarta / applicaGiocaCarta — Investiga (OPS-02)", () => {
  it("avvia un'investigazione temporizzata (non istantanea)", () => {
    const stato = creaStatoIniziale("carte-investiga");
    const pianeta = stato.pianeti.find((p) => p.scoperto);
    expect(pianeta).toBeDefined();
    if (!pianeta) return;
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
    const stato = creaStatoIniziale("carte-investiga-doppia");
    const pianeta = stato.pianeti.find((p) => p.scoperto);
    if (!pianeta) throw new Error("fixture");
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
    const stato = creaStatoIniziale("carte-investiga-completa");
    const pianeta = stato.pianeti.find((p) => p.scoperto);
    if (!pianeta) throw new Error("fixture");
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
    const stato = creaStatoIniziale(seed);
    const pianeta = stato.pianeti.find((p) => p.scoperto);
    if (!pianeta) throw new Error("fixture");
    const investigato = { ...pianeta, investigato: true };
    return {
      stato: { ...stato, pianeti: stato.pianeti.map((p) => (p.id === pianeta.id ? investigato : p)) },
      pianetaId: pianeta.id,
    };
  }

  it("rifiuta un pianeta non investigato", () => {
    const stato = creaStatoIniziale("carte-contratto-non-investigato");
    const pianeta = stato.pianeti.find((p) => p.scoperto);
    const carta = trovaCartaInMano(stato, "IND-01");
    if (!pianeta) throw new Error("fixture");
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
      const pianeta = base.pianeti.find((p) => p.scoperto)!;
      const investigato = { ...base, pianeti: base.pianeti.map((p) => (p.id === pianeta.id ? { ...p, investigato: true } : p)) };
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

describe("integraGenerazioneCarte", () => {
  it("genera una carta dopo l'intervallo se la mano non e' piena", () => {
    const stato = creaStatoIniziale("carte-generazione");
    const statoConSpazio: GameState = { ...stato, manoCarte: stato.manoCarte.slice(0, 2) };
    const rng = new SeededRng("gen");

    const { stato: troppoPresto } = integraGenerazioneCarte({ ...statoConSpazio, tempoSimulatoMs: 60_000 }, rng);
    expect(troppoPresto.manoCarte).toHaveLength(2);

    const { stato: dopo, notifiche } = integraGenerazioneCarte({ ...statoConSpazio, tempoSimulatoMs: 5 * 60_000 }, rng);
    expect(dopo.manoCarte).toHaveLength(3);
    expect(notifiche.length).toBe(1);
  });

  it("sospende la generazione se la mano e' piena, senza accumulare", () => {
    const stato = creaStatoIniziale("carte-generazione-piena");
    const statoPieno: GameState = { ...stato, tempoSimulatoMs: 5 * 60_000 };
    const { stato: dopo, notifiche } = integraGenerazioneCarte(statoPieno, new SeededRng("gen2"));
    expect(dopo.manoCarte).toHaveLength(statoPieno.manoCarte.length);
    expect(notifiche).toHaveLength(0);
    expect(dopo.ultimaGenerazioneCarteMs).toBe(statoPieno.tempoSimulatoMs);
  });
});
