import { SLOT_RICERCA_BASE, TECNOLOGIE, calcolaBonusRicerca } from "../domain/research";
import type { BonusRicerca, GameState, ProgettoRicercaAttivo } from "../domain/types";
import type { CommandValidationResult } from "./commands";

// Ricerca (B2, Macrostep 7): quattro rami, un progetto contemporaneo
// iniziale (sblocco di slot aggiuntivi via ricerca), ogni ricerca richiede
// una carta Ricerca giocata (gestito da cardEffects.ts, caso "RSH-01", che
// chiama le funzioni qui sotto). Funzioni pure, testabili senza browser.

export function bonusRicerca(stato: GameState): BonusRicerca {
  return calcolaBonusRicerca(stato.ricerca.completate);
}

export function slotRicercaMax(stato: GameState): number {
  return SLOT_RICERCA_BASE + bonusRicerca(stato).slotRicercaBonus;
}

export function validaAvviaRicerca(stato: GameState, tecnologiaId: string): CommandValidationResult {
  const tecnologia = TECNOLOGIE[tecnologiaId];
  if (!tecnologia) return { ok: false, motivo: "tecnologia sconosciuta" };
  if (stato.ricerca.completate.includes(tecnologiaId)) {
    return { ok: false, motivo: "tecnologia gia' completata" };
  }
  if (stato.ricerca.progettiAttivi.some((p) => p.tecnologiaId === tecnologiaId)) {
    return { ok: false, motivo: "progetto gia' in corso per questa tecnologia" };
  }
  const prerequisitiMancanti = tecnologia.prerequisiti.filter((id) => !stato.ricerca.completate.includes(id));
  if (prerequisitiMancanti.length > 0) {
    return { ok: false, motivo: `prerequisiti mancanti: ${prerequisitiMancanti.join(", ")}` };
  }
  if (stato.ricerca.progettiAttivi.length >= slotRicercaMax(stato)) {
    return { ok: false, motivo: "nessuno slot di ricerca libero" };
  }
  if (stato.crediti < tecnologia.costoCrediti) {
    return { ok: false, motivo: "crediti insufficienti per avviare la ricerca" };
  }
  if (stato.ricerca.puntiRicerca < tecnologia.costoPuntiRicerca) {
    return { ok: false, motivo: "punti ricerca insufficienti: gioca altri comandi Ricerca" };
  }
  return { ok: true };
}

let autoProjectCounter = 0;
function nextProjectId(): string {
  autoProjectCounter += 1;
  return `progetto-ricerca-${autoProjectCounter}`;
}

/** Avvia un progetto di ricerca: deduce i crediti e crea il progetto attivo.
 * Il consumo della carta RSH-01 e il conteggio ai fini della revisione sono
 * gestiti genericamente da applicaGiocaCarta (cardEffects.ts), come per
 * ogni altra carta (A2). */
export function applicaAvviaRicerca(stato: GameState, tecnologiaId: string): GameState {
  const tecnologia = TECNOLOGIE[tecnologiaId];
  if (!tecnologia) return stato;
  const progetto: ProgettoRicercaAttivo = {
    id: nextProjectId(),
    tecnologiaId,
    inizioMs: stato.tempoSimulatoMs,
    fineMs: stato.tempoSimulatoMs + tecnologia.durataMs,
  };
  return {
    ...stato,
    crediti: stato.crediti - tecnologia.costoCrediti,
    ricerca: {
      ...stato.ricerca,
      progettiAttivi: [...stato.ricerca.progettiAttivi, progetto],
      puntiRicerca: stato.ricerca.puntiRicerca - tecnologia.costoPuntiRicerca,
    },
  };
}

export interface RisultatoRicerca {
  stato: GameState;
  notifiche: string[];
}

/** Completa i progetti il cui timer e' scaduto, spostando la tecnologia in
 * `completate`. Non avanza mentre la partita e' in pausa (A3: "la pausa
 * congela tutti i sistemi simulati... i tempi di ricerca"): il motore non
 * chiama integrate() affatto quando inPausa, quindi questa funzione non ha
 * bisogno di controllarlo esplicitamente. */
export function integraRicerca(stato: GameState): RisultatoRicerca {
  if (stato.ricerca.progettiAttivi.length === 0) return { stato, notifiche: [] };

  const notifiche: string[] = [];
  const completatiOra: string[] = [];
  const progettiAttivi = stato.ricerca.progettiAttivi.filter((progetto) => {
    if (stato.tempoSimulatoMs < progetto.fineMs) return true;
    completatiOra.push(progetto.tecnologiaId);
    const tecnologia = TECNOLOGIE[progetto.tecnologiaId];
    notifiche.push(`Ricerca completata: ${tecnologia?.nome ?? progetto.tecnologiaId}.`);
    return false;
  });

  if (completatiOra.length === 0) return { stato, notifiche: [] };

  return {
    stato: {
      ...stato,
      ricerca: { ...stato.ricerca, progettiAttivi, completate: [...stato.ricerca.completate, ...completatiOra] },
    },
    notifiche,
  };
}
