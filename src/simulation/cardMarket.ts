import { MERCATO_CARTE, PREZZI_CARTE } from "../domain/cardMarket";
import type { SeededRng } from "../domain/rng";
import type { CardCode, CardInstance, GameState, SlotMercatoCarte } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { registraSpesa } from "./economy";

// Mercato delle carte (B2, Macrostep 6): rotazione ogni 15 minuti di tempo
// attivo, acquisto diretto (nessuna carta necessaria), bloccato se la mano
// e' gia' piena (a differenza delle ricompense, un acquisto e' una scelta
// deliberata: non ha senso permetterla senza spazio).

let autoSlotCounter = 0;
function nextSlotId(): string {
  autoSlotCounter += 1;
  return `slot-carta-${autoSlotCounter}`;
}

export interface RisultatoMercatoCarte {
  stato: GameState;
  notifiche: string[];
}

export function integraRotazioneMercatoCarte(stato: GameState, rng: SeededRng): RisultatoMercatoCarte {
  if (stato.tempoSimulatoMs - stato.mercatoCarte.ultimaRotazioneMs < MERCATO_CARTE.intervalloRotazioneMs) {
    return { stato, notifiche: [] };
  }

  const codici = Object.keys(PREZZI_CARTE) as CardCode[];
  const slots: SlotMercatoCarte[] = Array.from({ length: MERCATO_CARTE.numeroSlot }, () => {
    const code = rng.pick(codici);
    return { id: nextSlotId(), code, prezzo: PREZZI_CARTE[code] as number };
  });

  return {
    stato: { ...stato, mercatoCarte: { slots, ultimaRotazioneMs: stato.tempoSimulatoMs } },
    notifiche: ["Il mercato delle carte si e' rinnovato."],
  };
}

export function validaAcquistaCartaMercato(stato: GameState, slotId: string): CommandValidationResult {
  const slot = stato.mercatoCarte.slots.find((s) => s.id === slotId);
  if (!slot) return { ok: false, motivo: "slot del mercato non disponibile (in attesa del prossimo rinnovo)" };
  if (stato.crediti < slot.prezzo) return { ok: false, motivo: "crediti insufficienti" };
  if (stato.manoCarte.length >= stato.capacitaManoCarte) return { ok: false, motivo: "mano carte piena" };
  return { ok: true };
}

let autoPurchaseCounter = 0;
function nextPurchaseId(): string {
  autoPurchaseCounter += 1;
  return `carta-mercato-${autoPurchaseCounter}`;
}

export function applicaAcquistaCartaMercato(stato: GameState, slotId: string): GameState {
  const slot = stato.mercatoCarte.slots.find((s) => s.id === slotId);
  if (!slot) return stato;
  const nuovaCarta: CardInstance = { instanceId: nextPurchaseId(), code: slot.code, livello: 1 };
  const nuovoStato: GameState = { ...stato, crediti: stato.crediti - slot.prezzo, manoCarte: [...stato.manoCarte, nuovaCarta] };
  return registraSpesa(nuovoStato, slot.prezzo);
}
