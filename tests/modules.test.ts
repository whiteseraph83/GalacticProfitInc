import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { MODULO_DEFINITIONS } from "../src/domain/modules";
import { SLOT_MODULO_BASE } from "../src/domain/research";
import {
  applicaCraftModulo,
  applicaEquipaggiaModulo,
  applicaRimuoviModulo,
  bonusEstrazioneModuli,
  slotModuloMax,
  validaCraftModulo,
  validaEquipaggiaModulo,
  validaRimuoviModulo,
} from "../src/simulation/modules";
import type { GameState, ModuloInstance } from "../src/domain/types";

const PERFORATORE = MODULO_DEFINITIONS["MOD-PERFORATORE"];

function statoConFabbrica(crediti: number): GameState {
  const base = creaStatoIniziale("moduli-base");
  return {
    ...base,
    crediti,
    fabbrica: { ...base.fabbrica, costruita: true },
    mothership: { ...base.mothership, stivaCarico: { ferroRaffinato: 100, titanioRaffinato: 100 } },
  };
}

describe("validaCraftModulo / applicaCraftModulo", () => {
  it("rifiuta se la fabbrica non e' costruita", () => {
    const base = creaStatoIniziale("moduli-no-fabbrica");
    const stato: GameState = { ...base, crediti: 10_000, mothership: { ...base.mothership, stivaCarico: { ferroRaffinato: 100 } } };
    expect(validaCraftModulo(stato, "MOD-PERFORATORE").ok).toBe(false);
  });

  it("rifiuta un modulo sconosciuto", () => {
    expect(validaCraftModulo(statoConFabbrica(10_000), "MOD-INESISTENTE").ok).toBe(false);
  });

  it("rifiuta con crediti insufficienti", () => {
    expect(validaCraftModulo(statoConFabbrica(0), "MOD-PERFORATORE").ok).toBe(false);
  });

  it("rifiuta con risorsa raffinata insufficiente in stiva", () => {
    const stato: GameState = { ...statoConFabbrica(10_000), mothership: { ...statoConFabbrica(10_000).mothership, stivaCarico: {} } };
    expect(validaCraftModulo(stato, "MOD-PERFORATORE").ok).toBe(false);
  });

  it("produce un'istanza modulo in magazzino, deducendo crediti e risorse", () => {
    const stato = statoConFabbrica(10_000);
    const dopo = applicaCraftModulo(stato, "MOD-PERFORATORE");
    expect(dopo.moduli).toHaveLength(1);
    expect(dopo.moduli[0].naveMinerariaId).toBeNull();
    expect(dopo.crediti).toBe(stato.crediti - PERFORATORE.costoCrediti);
    expect(dopo.mothership.stivaCarico.ferroRaffinato).toBe(100 - (PERFORATORE.costoRisorsaRaffinata.ferroRaffinato ?? 0));
  });
});

describe("equipaggiamento moduli: collisioni inventario, limite slot (livello)", () => {
  function statoConModuloInMagazzino(): { stato: GameState; istanza: ModuloInstance } {
    const stato = applicaCraftModulo(statoConFabbrica(10_000), "MOD-PERFORATORE");
    return { stato, istanza: stato.moduli[0] };
  }

  it("equipaggia un modulo in magazzino su una nave con slot libero", () => {
    const { stato, istanza } = statoConModuloInMagazzino();
    const nave = stato.naviMinerarie[0];
    expect(validaEquipaggiaModulo(stato, istanza.instanceId, nave.id).ok).toBe(true);
    const dopo = applicaEquipaggiaModulo(stato, istanza.instanceId, nave.id);
    expect(dopo.moduli[0].naveMinerariaId).toBe(nave.id);
  });

  it("rifiuta di equipaggiare un modulo gia' equipaggiato su un'altra nave (collisione inventario)", () => {
    // Crea una seconda nave mineraria manualmente per il test.
    const { stato: base, istanza } = statoConModuloInMagazzino();
    const secondaNave = { id: "nave-extra", contrattoAttivoId: null, estrazioneBaseAlMinuto: 4 };
    const stato: GameState = { ...base, naviMinerarie: [...base.naviMinerarie, secondaNave] };
    const equipaggiata = applicaEquipaggiaModulo(stato, istanza.instanceId, stato.naviMinerarie[0].id);

    expect(validaEquipaggiaModulo(equipaggiata, istanza.instanceId, secondaNave.id).ok).toBe(false);
  });

  it("rispetta il limite di slot per nave (limite livello): rifiuta oltre lo slot massimo", () => {
    let stato = statoConFabbrica(10_000);
    stato = applicaCraftModulo(stato, "MOD-PERFORATORE");
    stato = applicaCraftModulo(stato, "MOD-STABILIZZATORE");
    const nave = stato.naviMinerarie[0];
    expect(slotModuloMax(stato)).toBe(SLOT_MODULO_BASE);

    const [primo, secondo] = stato.moduli;
    stato = applicaEquipaggiaModulo(stato, primo.instanceId, nave.id);
    expect(validaEquipaggiaModulo(stato, secondo.instanceId, nave.id).ok).toBe(false); // slot gia' occupato (base = 1)
  });

  it("un bonus di slot da ricerca aumenta lo slot massimo per nave", () => {
    let stato = statoConFabbrica(10_000);
    stato = { ...stato, ricerca: { ...stato.ricerca, completate: ["LOG-R1", "LOG-R2", "LOG-R3"] } };
    expect(slotModuloMax(stato)).toBe(SLOT_MODULO_BASE + 1);
  });

  it("rimuovere un modulo equipaggiato lo riporta in magazzino, libero per una nuova assegnazione", () => {
    const { stato, istanza } = statoConModuloInMagazzino();
    const nave = stato.naviMinerarie[0];
    let dopo = applicaEquipaggiaModulo(stato, istanza.instanceId, nave.id);
    expect(validaRimuoviModulo(dopo, istanza.instanceId).ok).toBe(true);
    dopo = applicaRimuoviModulo(dopo, istanza.instanceId);
    expect(dopo.moduli[0].naveMinerariaId).toBeNull();
    expect(validaEquipaggiaModulo(dopo, istanza.instanceId, nave.id).ok).toBe(true);
  });

  it("rifiuta di rimuovere un modulo gia' in magazzino", () => {
    const { stato, istanza } = statoConModuloInMagazzino();
    expect(validaRimuoviModulo(stato, istanza.instanceId).ok).toBe(false);
  });

  it("bonusEstrazioneModuli somma il bonus solo dei moduli equipaggiati su quella nave", () => {
    let stato = statoConFabbrica(10_000);
    stato = applicaCraftModulo(stato, "MOD-PERFORATORE");
    const nave = stato.naviMinerarie[0];
    expect(bonusEstrazioneModuli(stato, nave.id)).toBe(0);
    stato = applicaEquipaggiaModulo(stato, stato.moduli[0].instanceId, nave.id);
    expect(bonusEstrazioneModuli(stato, nave.id)).toBe(PERFORATORE.bonusEstrazioneAlMinuto);
  });
});
