import type { GameState } from "../domain/types";
import { generaRegione } from "./regionGenerator";

// Anteprima pre-salto (B6, CONFERMATO): "anteprima approssimativa di
// ricchezza risorse, presenza civilta' e rischi, SENZA scoprire pianeti e
// posizioni". La regione candidata e' generata dallo stesso seed
// deterministico che il salto userebbe davvero (vedi
// src/simulation/hyperspace.ts), quindi l'anteprima descrive esattamente
// la regione in cui si arriverebbe, senza alcuna sorpresa, ma senza
// rivelarne pianeti o posizioni specifici (solo aggregati).

export type LivelloRicchezza = "scarsa" | "media" | "abbondante";

export interface AnteprimaRegione {
  numeroRegione: number;
  numeroPianeti: number;
  numeroCampiRelitti: number;
  ricchezzaStimata: LivelloRicchezza;
}

export function seedProssimaRegione(stato: GameState): string {
  return `${stato.seed}|regione${stato.numeroRegione + 1}`;
}

/** Nessuna presenza di civilta' da segnalare in questo macrostep (B6 la
 * cita come parte dell'anteprima, ma le civilta' arrivano al Macrostep 9):
 * l'anteprima si limita a ricchezza e un indicatore di rischio approssimato
 * (numero di campi relitti, proxy per "zone da bonificare/rischiose" in
 * assenza di un sistema di rischio dedicato). */
export function generaAnteprimaRegione(stato: GameState): AnteprimaRegione {
  const numeroRegione = stato.numeroRegione + 1;
  const regione = generaRegione(seedProssimaRegione(stato));
  const giacimentoTotale = regione.pianeti.reduce((somma, p) => somma + p.giacimentoTotale, 0);
  const giacimentoMedio = giacimentoTotale / regione.pianeti.length;

  const ricchezzaStimata: LivelloRicchezza = giacimentoMedio < 500 ? "scarsa" : giacimentoMedio < 750 ? "media" : "abbondante";

  return {
    numeroRegione,
    numeroPianeti: regione.pianeti.length,
    numeroCampiRelitti: regione.campiRelitti.length,
    ricchezzaStimata,
  };
}
