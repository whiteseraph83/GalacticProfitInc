import { PERICOLI } from "../domain/hazards";
import type { GameState, RegionalHazard, Vector2 } from "../domain/types";

// Pericoli regionali (B9, Macrostep 9): "tempeste, gravita'/radiazioni,
// rischi con avvisi proporzionati". L'avviso proporzionato all'intensita'
// avviene alla scoperta (fog of war, engine.ts); qui l'effetto continuo
// mentre la nave madre resta nella zona, silenzioso (nessuno spam di
// notifiche a ogni sub-step), osservabile nei numeri (carburante/fiducia).

function distanza(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function naveInPericolo(stato: GameState, pericolo: RegionalHazard): boolean {
  if (stato.tempoSimulatoMs < stato.mothership.immunitaPericoliFinoMs) return false;
  return distanza(stato.mothership.posizione, pericolo.posizione) <= pericolo.raggio;
}

/** Fattore di riduzione della velocita' massima della nave madre dato dai
 * campi gravitazionali attivi (il piu' forte vince, non si sommano): letto
 * direttamente dal motore a ogni sub-step (non persistito, cosi' cessa
 * esattamente quando si esce dalla zona, senza stato da ripristinare). */
export function moltiplicatoreVelocitaPericoli(stato: GameState): number {
  let moltiplicatore = 1;
  for (const pericolo of stato.pericoli) {
    if (pericolo.tipo !== "campoGravitazionale" || !pericolo.scoperto) continue;
    if (!naveInPericolo(stato, pericolo)) continue;
    const fattore = 1 - PERICOLI.gravitaRiduzioneVelocitaMax * pericolo.intensita;
    moltiplicatore = Math.min(moltiplicatore, Math.max(0.1, fattore));
  }
  return moltiplicatore;
}

export interface RisultatoPericoli {
  stato: GameState;
  notifiche: string[];
}

/** Applica gli effetti continui di tempeste (consumo carburante extra) e
 * radiazioni (erosione fiducia) mentre la nave madre e' dentro una zona
 * scoperta; i campi gravitazionali sono gestiti a parte (vedi
 * `moltiplicatoreVelocitaPericoli`, letto dal motore). */
export function integraPericoli(stato: GameState, dtMs: number): RisultatoPericoli {
  if (stato.pericoli.length === 0) return { stato, notifiche: [] };
  const dtMin = dtMs / 60000;

  let carburante = stato.mothership.carburante;
  let fiducia = stato.review.fiducia;
  let cambiato = false;

  for (const pericolo of stato.pericoli) {
    if (!pericolo.scoperto || !naveInPericolo(stato, pericolo)) continue;

    if (pericolo.tipo === "tempesta") {
      const consumo = PERICOLI.tempestaConsumoExtraAlMinutoMax * pericolo.intensita * dtMin;
      if (consumo > 0) {
        carburante = Math.max(0, carburante - consumo);
        cambiato = true;
      }
    } else if (pericolo.tipo === "radiazioni") {
      const perdita = PERICOLI.radiazioniFiduciaPerMinutoMax * pericolo.intensita * dtMin;
      if (perdita > 0) {
        fiducia = Math.max(0, fiducia - perdita);
        cambiato = true;
      }
    }
  }

  if (!cambiato) return { stato, notifiche: [] };
  return {
    stato: {
      ...stato,
      mothership: { ...stato.mothership, carburante },
      review: { ...stato.review, fiducia },
    },
    notifiche: [],
  };
}
