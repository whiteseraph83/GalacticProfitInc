import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { CARD_EFFECTS } from "../src/domain/cardEffectsConfig";
import { SeededRng } from "../src/domain/rng";
import { applicaGiocaCarta, validaGiocaCarta } from "../src/simulation/cardEffects";
import type { Civilta, GameState } from "../src/domain/types";

const rng = new SeededRng("rare-cards-rng");

function statoConCarta(seed: string, code: "RAR-01" | "RAR-02"): GameState {
  const base = creaStatoIniziale(seed);
  return { ...base, manoCarte: [...base.manoCarte, { instanceId: "carta-rara", code, livello: 1 }] };
}

describe("RAR-01 Diplomazia lampo", () => {
  function statoConCiviltaScoperta(seed: string): GameState {
    const base = statoConCarta(seed, "RAR-01");
    const civilta: Civilta = {
      id: "civilta-diplomazia",
      nome: "Collettivo Diplomazia",
      posizione: { x: 0, y: 0 },
      raggio: 50,
      scoperta: true,
      relazione: 40,
      richiestaAttiva: null,
    };
    return { ...base, civilta: [civilta] };
  }

  it("rifiuta senza un bersaglio civilta'", () => {
    const stato = statoConCiviltaScoperta("rar01-no-bersaglio");
    expect(validaGiocaCarta(stato, "carta-rara", {}).ok).toBe(false);
  });

  it("rifiuta una civilta' non scoperta", () => {
    const base = statoConCarta("rar01-non-scoperta", "RAR-01");
    const civilta: Civilta = {
      id: "civilta-nascosta",
      nome: "Collettivo Nascosto",
      posizione: { x: 0, y: 0 },
      raggio: 50,
      scoperta: false,
      relazione: 40,
      richiestaAttiva: null,
    };
    const stato: GameState = { ...base, civilta: [civilta] };
    expect(validaGiocaCarta(stato, "carta-rara", { civiltaId: "civilta-nascosta" }).ok).toBe(false);
  });

  it("accetta con una civilta' scoperta e aumenta la relazione del bonus fisso (non percentuale)", () => {
    const stato = statoConCiviltaScoperta("rar01-ok");
    expect(validaGiocaCarta(stato, "carta-rara", { civiltaId: "civilta-diplomazia" }).ok).toBe(true);
    const { stato: dopo } = applicaGiocaCarta(stato, "carta-rara", { civiltaId: "civilta-diplomazia" }, rng);
    expect(dopo.civilta[0].relazione).toBe(40 + CARD_EFFECTS.diplomaziaLampo.bonusRelazione);
    expect(dopo.manoCarte.find((c) => c.instanceId === "carta-rara")).toBeUndefined();
  });

  it("la relazione non supera il massimo (100)", () => {
    const base = statoConCiviltaScoperta("rar01-cap");
    const stato: GameState = { ...base, civilta: [{ ...base.civilta[0], relazione: 90 }] };
    const { stato: dopo } = applicaGiocaCarta(stato, "carta-rara", { civiltaId: "civilta-diplomazia" }, rng);
    expect(dopo.civilta[0].relazione).toBe(100);
  });
});

describe("RAR-02 Fuga d'emergenza", () => {
  it("e' sempre giocabile (nessuna precondizione di stato)", () => {
    const stato = statoConCarta("rar02-valida", "RAR-02");
    expect(validaGiocaCarta(stato, "carta-rara", {}).ok).toBe(true);
  });

  it("imposta l'immunita' ai pericoli per la durata configurata", () => {
    const stato = statoConCarta("rar02-applica", "RAR-02");
    const { stato: dopo } = applicaGiocaCarta(stato, "carta-rara", {}, rng);
    expect(dopo.mothership.immunitaPericoliFinoMs).toBe(dopo.tempoSimulatoMs + CARD_EFFECTS.fugaDEmergenza.durataImmunitaMs);
    expect(dopo.manoCarte.find((c) => c.instanceId === "carta-rara")).toBeUndefined();
  });
});
