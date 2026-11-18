import { describe, expect, it } from "vitest";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { generaMissioni } from "../src/world/missionGenerator";
import { generaRegione } from "../src/world/regionGenerator";
import {
  applicaAbbandonaMissione,
  applicaAccettaMissione,
  integraMissioni,
  validaAbbandonaMissione,
  validaAccettaMissione,
} from "../src/simulation/missions";
import type { GameState, Missione } from "../src/domain/types";

describe("generaMissioni", () => {
  it("genera tra 20 e 30 missioni, tutte con id unici", () => {
    const regione = generaRegione("missioni-conteggio");
    const missioni = generaMissioni("missioni-conteggio", regione);
    expect(missioni.length).toBeGreaterThanOrEqual(20);
    expect(missioni.length).toBeLessThanOrEqual(30);
    expect(new Set(missioni.map((m) => m.id)).size).toBe(missioni.length);
  });

  it("esattamente una missione e' principale, gia' attiva da subito", () => {
    const regione = generaRegione("missioni-principale");
    const missioni = generaMissioni("missioni-principale", regione);
    const principali = missioni.filter((m) => m.principale);
    expect(principali).toHaveLength(1);
    expect(principali[0].stato).toBe("attiva");
  });

  it("le 4 missioni introduttive garantiscono esattamente 1 carta ciascuna (4 totali)", () => {
    const regione = generaRegione("missioni-intro");
    const missioni = generaMissioni("missioni-intro", regione);
    const introduttive = missioni.filter((m) => m.titolo === "Primo contatto planetario" || m.titolo === "Secondo rilevamento" || m.titolo === "Prima estrazione" || m.titolo === "Primo scambio");
    expect(introduttive).toHaveLength(4);
    const totaleCarte = introduttive.reduce((somma, m) => somma + m.ricompensa.carte.length, 0);
    expect(totaleCarte).toBe(4);
  });

  it("e' deterministico (stesso seed, stesse missioni)", () => {
    const regione = generaRegione("missioni-det");
    const a = generaMissioni("missioni-det", regione);
    const b = generaMissioni("missioni-det", regione);
    expect(a.map((m) => ({ ...m, id: undefined }))).toEqual(b.map((m) => ({ ...m, id: undefined })));
  });

  it("nessun pianeta e' bersaglio di piu' di una missione 'investigaPianeta'", () => {
    const regione = generaRegione("missioni-no-duplicati");
    const missioni = generaMissioni("missioni-no-duplicati", regione);
    const bersagli = missioni
      .filter((m) => m.obiettivo.tipo === "investigaPianeta")
      .map((m) => (m.obiettivo as { pianetaId: string }).pianetaId);
    expect(new Set(bersagli).size).toBe(bersagli.length);
  });
});

describe("accettare/abbandonare missioni", () => {
  function statoConMissioniDisponibili(): GameState {
    return creaStatoIniziale("missioni-engine");
  }

  it("accetta una missione disponibile, rifiuta oltre il limite di 3 secondarie attive", () => {
    let stato = statoConMissioniDisponibili();
    const disponibili = stato.missioni.filter((m) => m.stato === "disponibile");
    expect(disponibili.length).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < 3; i++) {
      expect(validaAccettaMissione(stato, disponibili[i].id).ok).toBe(true);
      stato = applicaAccettaMissione(stato, disponibili[i].id);
    }
    expect(stato.missioni.filter((m) => m.stato === "attiva" && !m.principale)).toHaveLength(3);

    const risultato = validaAccettaMissione(stato, disponibili[3].id);
    expect(risultato.ok).toBe(false);
  });

  it("non si puo' abbandonare la missione principale", () => {
    const stato = statoConMissioniDisponibili();
    const principale = stato.missioni.find((m) => m.principale)!;
    expect(validaAbbandonaMissione(stato, principale.id).ok).toBe(false);
  });

  it("abbandonare libera uno slot per una nuova missione secondaria", () => {
    let stato = statoConMissioniDisponibili();
    const disponibili = stato.missioni.filter((m) => m.stato === "disponibile");
    for (let i = 0; i < 3; i++) stato = applicaAccettaMissione(stato, disponibili[i].id);

    stato = applicaAbbandonaMissione(stato, disponibili[0].id);
    expect(stato.missioni.find((m) => m.id === disponibili[0].id)?.stato).toBe("abbandonata");
    expect(validaAccettaMissione(stato, disponibili[3].id).ok).toBe(true);
  });
});

describe("integraMissioni (tracking automatico)", () => {
  it("completa una missione 'investigaPianeta' quando il pianeta diventa investigato, assegnando la ricompensa", () => {
    const base = creaStatoIniziale("missioni-completamento");
    const missione = base.missioni.find((m) => m.obiettivo.tipo === "investigaPianeta")! as Missione & { obiettivo: { tipo: "investigaPianeta"; pianetaId: string } };
    let stato: GameState = {
      ...base,
      missioni: base.missioni.map((m) => (m.id === missione.id ? { ...m, stato: "attiva" as const } : m)),
      pianeti: base.pianeti.map((p) => (p.id === missione.obiettivo.pianetaId ? { ...p, investigato: true } : p)),
    };
    const creditiPrima = stato.crediti;
    const carteTotaliPrima = stato.manoCarte.length;

    const { stato: dopo, notifiche } = integraMissioni(stato);

    expect(dopo.missioni.find((m) => m.id === missione.id)?.stato).toBe("completata");
    expect(dopo.crediti).toBe(creditiPrima + missione.ricompensa.crediti);
    expect(dopo.manoCarte.length).toBe(carteTotaliPrima + missione.ricompensa.carte.length);
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("completa una missione 'vendiRisorsa' solo quando il progresso raggiunge la quantita' richiesta", () => {
    const base = creaStatoIniziale("missioni-vendi");
    const missione = base.missioni.find((m) => m.obiettivo.tipo === "vendiRisorsa")!;
    const obiettivo = missione.obiettivo as { tipo: "vendiRisorsa"; risorsa: string; quantita: number; progresso: number };

    let stato: GameState = { ...base, missioni: base.missioni.map((m) => (m.id === missione.id ? { ...m, stato: "attiva" as const } : m)) };
    const parziale = integraMissioni(stato).stato;
    expect(parziale.missioni.find((m) => m.id === missione.id)?.stato).toBe("attiva"); // progresso 0, non completa

    stato = {
      ...stato,
      missioni: stato.missioni.map((m) => (m.id === missione.id ? { ...m, obiettivo: { ...obiettivo, progresso: obiettivo.quantita } } : m)),
    };
    const completata = integraMissioni(stato).stato;
    expect(completata.missioni.find((m) => m.id === missione.id)?.stato).toBe("completata");
  });

  it("non completa missioni non attive (disponibili/abbandonate)", () => {
    const base = creaStatoIniziale("missioni-non-attive");
    const missione = base.missioni.find((m) => m.obiettivo.tipo === "investigaPianeta" && m.stato === "disponibile")! as Missione & {
      obiettivo: { tipo: "investigaPianeta"; pianetaId: string };
    };
    const stato: GameState = {
      ...base,
      pianeti: base.pianeti.map((p) => (p.id === missione.obiettivo.pianetaId ? { ...p, investigato: true } : p)),
    };
    const { stato: dopo } = integraMissioni(stato);
    expect(dopo.missioni.find((m) => m.id === missione.id)?.stato).toBe("disponibile");
  });
});

describe("stato iniziale con missioni", () => {
  it("resta valido secondo validaStato", () => {
    const stato = creaStatoIniziale("missioni-stato-valido");
    expect(validaStato(stato)).toEqual([]);
  });
});
