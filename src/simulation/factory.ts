import { RICETTE_RAFFINAZIONE } from "../domain/refineRecipes";
import type { GameState, RefineQueueItem, ResourceType } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { registraSpesa } from "./economy";
import { bonusRicerca } from "./research";

// Fabbrica e coda di raffinazione (B1/Macrostep 4). Funzioni pure, nello
// stesso stile di logistics.ts e cardEffects.ts: testabili senza browser.

function cargoTotale(carico: Partial<Record<ResourceType, number>>): number {
  return Object.values(carico).reduce((somma: number, q) => somma + (q ?? 0), 0);
}

export function validaAccodaRaffinazione(stato: GameState, ricettaId: string): CommandValidationResult {
  if (!stato.fabbrica.costruita) return { ok: false, motivo: "la fabbrica non e' ancora stata costruita" };
  const ricetta = RICETTE_RAFFINAZIONE[ricettaId];
  if (!ricetta) return { ok: false, motivo: "ricetta sconosciuta" };
  if (stato.crediti < ricetta.costoCrediti) return { ok: false, motivo: "crediti insufficienti" };
  return { ok: true };
}

let autoQueueCounter = 0;
function nextQueueItemId(): string {
  autoQueueCounter += 1;
  return `coda-${autoQueueCounter}`;
}

/** Accoda una ricetta (azione libera, senza carta, come l'impostazione di
 * una rotta cargo: B2). Il costo in crediti viene dedotto subito; l'input
 * grezzo viene consumato solo quando la linea la avvia davvero
 * (integraRaffinazione), non all'accodamento. */
export function applicaAccodaRaffinazione(stato: GameState, ricettaId: string): GameState {
  const ricetta = RICETTE_RAFFINAZIONE[ricettaId];
  if (!ricetta) return stato;
  const nuovoElemento: RefineQueueItem = { id: nextQueueItemId(), ricettaId, stato: "inCoda", tempoCompletamentoMs: null };
  const nuovoStato: GameState = {
    ...stato,
    crediti: stato.crediti - ricetta.costoCrediti,
    fabbrica: { ...stato.fabbrica, coda: [...stato.fabbrica.coda, nuovoElemento] },
  };
  return registraSpesa(nuovoStato, ricetta.costoCrediti);
}

export interface RisultatoRaffinazione {
  stato: GameState;
  notifiche: string[];
}

/** Avvia il primo elemento in coda quando la linea e' libera e l'input e'
 * disponibile (consumo atomico in quel momento); consegna l'output solo
 * quando puo' essere immagazzinato per intero (A2: trasferimenti atomici,
 * niente perdita silenziosa ne' produzione nel vuoto). Il carburante
 * raffinato riempie prima il serbatoio, poi trabocca in stiva. */
export function integraRaffinazione(stato: GameState): RisultatoRaffinazione {
  if (!stato.fabbrica.costruita || stato.fabbrica.coda.length === 0) return { stato, notifiche: [] };

  const notifiche: string[] = [];
  let coda = stato.fabbrica.coda;
  let mothership = stato.mothership;
  let cambiato = false;

  const bonus = bonusRicerca(stato);
  const lineeEffettive = stato.fabbrica.linee + bonus.lineeFabbricaBonus;
  const inLavorazione = coda.filter((e) => e.stato === "inLavorazione").length;
  const lineeLibere = lineeEffettive - inLavorazione;

  // --- Avvio di nuovi elementi in coda se c'e' una linea libera e l'input c'e'. ---
  if (lineeLibere > 0) {
    let lineeDisponibili = lineeLibere;
    coda = coda.map((elemento) => {
      if (lineeDisponibili <= 0 || elemento.stato !== "inCoda") return elemento;
      const ricetta = RICETTE_RAFFINAZIONE[elemento.ricettaId];
      if (!ricetta) return elemento;
      const disponibile = mothership.stivaCarico[ricetta.inputRisorsa] ?? 0;
      if (disponibile < ricetta.inputQuantita) return elemento; // in attesa di materia prima

      mothership = {
        ...mothership,
        stivaCarico: { ...mothership.stivaCarico, [ricetta.inputRisorsa]: disponibile - ricetta.inputQuantita },
      };
      lineeDisponibili -= 1;
      cambiato = true;
      const durataEffettivaMs = (ricetta.durataSec * 1000) / bonus.moltiplicatoreVelocitaRaffinazione;
      return { ...elemento, stato: "inLavorazione", tempoCompletamentoMs: stato.tempoSimulatoMs + durataEffettivaMs };
    });
  }

  // --- Completamento degli elementi il cui timer e' scaduto, se c'e' spazio per l'output. ---
  coda = coda.map((elemento) => {
    if (elemento.stato !== "inLavorazione" || elemento.tempoCompletamentoMs === null) return elemento;
    if (stato.tempoSimulatoMs < elemento.tempoCompletamentoMs) return elemento;
    const ricetta = RICETTE_RAFFINAZIONE[elemento.ricettaId];
    if (!ricetta) return elemento;

    if (ricetta.outputRisorsa === "carburante") {
      const spazioSerbatoio = mothership.serbatoioCapacita - mothership.carburante;
      const alSerbatoio = Math.min(spazioSerbatoio, ricetta.outputQuantita);
      const residuo = ricetta.outputQuantita - alSerbatoio;
      const spazioStiva = mothership.stivaCapacita - cargoTotale(mothership.stivaCarico);
      if (residuo > spazioStiva) return elemento; // non c'e' posto per l'eccedenza: attende

      const carburanteInStiva = (mothership.stivaCarico.carburante ?? 0) + residuo;
      mothership = {
        ...mothership,
        carburante: mothership.carburante + alSerbatoio,
        stivaCarico: residuo > 0 ? { ...mothership.stivaCarico, carburante: carburanteInStiva } : mothership.stivaCarico,
      };
    } else {
      const spazioStiva = mothership.stivaCapacita - cargoTotale(mothership.stivaCarico);
      if (spazioStiva < ricetta.outputQuantita) return elemento; // stiva piena: la linea resta occupata in attesa

      const quantitaAttuale = mothership.stivaCarico[ricetta.outputRisorsa] ?? 0;
      mothership = {
        ...mothership,
        stivaCarico: { ...mothership.stivaCarico, [ricetta.outputRisorsa]: quantitaAttuale + ricetta.outputQuantita },
      };
    }

    cambiato = true;
    notifiche.push(`Raffinazione completata: ${ricetta.nome}.`);
    return null;
  }).filter((e): e is RefineQueueItem => e !== null);

  if (!cambiato) return { stato, notifiche: [] };
  return { stato: { ...stato, mothership, fabbrica: { ...stato.fabbrica, coda } }, notifiche };
}
