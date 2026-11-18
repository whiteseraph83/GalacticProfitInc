import { MODULO_DEFINITIONS } from "../domain/modules";
import { SLOT_MODULO_BASE } from "../domain/research";
import type { EntityId, GameState, ModuloInstance } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { bonusRicerca } from "./research";
import { registraSpesa } from "./economy";

// Moduli craftabili per navi minerarie (B2, Macrostep 7): "craftabili solo
// con fabbrica, uno slot per nave iniziale, massimo due via ricerca; remote
// equip/unequip garantendo unicita'". Funzioni pure, testabili senza
// browser.

export function slotModuloMax(stato: GameState): number {
  return SLOT_MODULO_BASE + bonusRicerca(stato).slotModuloBonus;
}

export function moduliEquipaggiatiSu(stato: GameState, naveMinerariaId: EntityId): ModuloInstance[] {
  return stato.moduli.filter((m) => m.naveMinerariaId === naveMinerariaId);
}

/** Bonus di estrazione al minuto dato dai moduli equipaggiati su una nave,
 * sommato al moltiplicatore da ricerca quando un contratto viene creato
 * (cardEffects.ts, caso "IND-01"): un modulo equipaggiato dopo l'avvio del
 * contratto non ha effetto retroattivo su quel contratto, coerente con la
 * natura fisica dell'equipaggiamento. */
export function bonusEstrazioneModuli(stato: GameState, naveMinerariaId: EntityId): number {
  return moduliEquipaggiatiSu(stato, naveMinerariaId).reduce((somma, istanza) => {
    const def = MODULO_DEFINITIONS[istanza.definizioneId];
    return somma + (def?.bonusEstrazioneAlMinuto ?? 0);
  }, 0);
}

export function validaCraftModulo(stato: GameState, moduloId: string): CommandValidationResult {
  const def = MODULO_DEFINITIONS[moduloId];
  if (!def) return { ok: false, motivo: "modulo sconosciuto" };
  if (!stato.fabbrica.costruita) return { ok: false, motivo: "la fabbrica non e' ancora stata costruita" };
  if (stato.crediti < def.costoCrediti) return { ok: false, motivo: "crediti insufficienti" };
  for (const [risorsa, quantita] of Object.entries(def.costoRisorsaRaffinata)) {
    if ((stato.mothership.stivaCarico[risorsa as keyof typeof stato.mothership.stivaCarico] ?? 0) < (quantita ?? 0)) {
      return { ok: false, motivo: `${risorsa} raffinato insufficiente in stiva` };
    }
  }
  return { ok: true };
}

let autoModuleCounter = 0;
function nextModuleInstanceId(): string {
  autoModuleCounter += 1;
  return `modulo-${autoModuleCounter}`;
}

export function applicaCraftModulo(stato: GameState, moduloId: string): GameState {
  const def = MODULO_DEFINITIONS[moduloId];
  if (!def) return stato;
  let stivaCarico = { ...stato.mothership.stivaCarico };
  for (const [risorsa, quantita] of Object.entries(def.costoRisorsaRaffinata)) {
    const chiave = risorsa as keyof typeof stivaCarico;
    stivaCarico = { ...stivaCarico, [chiave]: (stivaCarico[chiave] ?? 0) - (quantita ?? 0) };
  }
  const istanza: ModuloInstance = { instanceId: nextModuleInstanceId(), definizioneId: moduloId, naveMinerariaId: null };
  const nuovoStato: GameState = {
    ...stato,
    crediti: stato.crediti - def.costoCrediti,
    mothership: { ...stato.mothership, stivaCarico },
    moduli: [...stato.moduli, istanza],
  };
  return registraSpesa(nuovoStato, def.costoCrediti);
}

export function validaEquipaggiaModulo(stato: GameState, moduloInstanceId: string, naveMinerariaId: EntityId): CommandValidationResult {
  const istanza = stato.moduli.find((m) => m.instanceId === moduloInstanceId);
  if (!istanza) return { ok: false, motivo: "modulo non posseduto" };
  if (istanza.naveMinerariaId !== null) return { ok: false, motivo: "modulo gia' equipaggiato su un'altra nave" };
  const nave = stato.naviMinerarie.find((n) => n.id === naveMinerariaId);
  if (!nave) return { ok: false, motivo: "nave mineraria sconosciuta" };
  if (moduliEquipaggiatiSu(stato, naveMinerariaId).length >= slotModuloMax(stato)) {
    return { ok: false, motivo: "nessuno slot modulo libero su questa nave" };
  }
  return { ok: true };
}

export function applicaEquipaggiaModulo(stato: GameState, moduloInstanceId: string, naveMinerariaId: EntityId): GameState {
  return {
    ...stato,
    moduli: stato.moduli.map((m) => (m.instanceId === moduloInstanceId ? { ...m, naveMinerariaId } : m)),
  };
}

export function validaRimuoviModulo(stato: GameState, moduloInstanceId: string): CommandValidationResult {
  const istanza = stato.moduli.find((m) => m.instanceId === moduloInstanceId);
  if (!istanza) return { ok: false, motivo: "modulo non posseduto" };
  if (istanza.naveMinerariaId === null) return { ok: false, motivo: "modulo gia' in magazzino" };
  return { ok: true };
}

export function applicaRimuoviModulo(stato: GameState, moduloInstanceId: string): GameState {
  return {
    ...stato,
    moduli: stato.moduli.map((m) => (m.instanceId === moduloInstanceId ? { ...m, naveMinerariaId: null } : m)),
  };
}
