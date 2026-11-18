import type { GameState, Missione } from "../domain/types";
import type { CommandValidationResult } from "./commands";

// Missioni e opportunita' (B5, Macrostep 6). Funzioni pure, testabili senza
// browser. Il tracking degli obiettivi e' automatico (integraMissioni,
// chiamata a ogni tick); accettare/abbandonare una missione secondaria e'
// un'azione libera, senza carta.

const MAX_MISSIONI_SECONDARIE_ATTIVE = 3;

export function validaAccettaMissione(stato: GameState, missioneId: string): CommandValidationResult {
  const missione = stato.missioni.find((m) => m.id === missioneId);
  if (!missione) return { ok: false, motivo: "missione inesistente" };
  if (missione.stato !== "disponibile") return { ok: false, motivo: "la missione non e' disponibile" };
  const attiveSecondarie = stato.missioni.filter((m) => m.stato === "attiva" && !m.principale).length;
  if (attiveSecondarie >= MAX_MISSIONI_SECONDARIE_ATTIVE) {
    return { ok: false, motivo: `massimo ${MAX_MISSIONI_SECONDARIE_ATTIVE} missioni secondarie attive contemporaneamente` };
  }
  return { ok: true };
}

export function applicaAccettaMissione(stato: GameState, missioneId: string): GameState {
  return { ...stato, missioni: stato.missioni.map((m) => (m.id === missioneId ? { ...m, stato: "attiva" } : m)) };
}

export function validaAbbandonaMissione(stato: GameState, missioneId: string): CommandValidationResult {
  const missione = stato.missioni.find((m) => m.id === missioneId);
  if (!missione) return { ok: false, motivo: "missione inesistente" };
  if (missione.principale) return { ok: false, motivo: "la missione principale non puo' essere abbandonata" };
  if (missione.stato !== "attiva") return { ok: false, motivo: "solo una missione attiva puo' essere abbandonata" };
  return { ok: true };
}

export function applicaAbbandonaMissione(stato: GameState, missioneId: string): GameState {
  return { ...stato, missioni: stato.missioni.map((m) => (m.id === missioneId ? { ...m, stato: "abbandonata" } : m)) };
}

function obiettivoCompletato(stato: GameState, missione: Missione): boolean {
  const o = missione.obiettivo;
  switch (o.tipo) {
    case "investigaPianeta":
      return stato.pianeti.find((p) => p.id === o.pianetaId)?.investigato === true;
    case "avviaContratto":
      return stato.contrattiMinerari.some((c) => c.pianetaId === o.pianetaId);
    case "recuperaRelitto":
      return stato.campiRelitti.find((r) => r.id === o.relittoId)?.recuperato === true;
    case "vendiRisorsa":
      return o.progresso >= o.quantita;
  }
}

export interface RisultatoMissioni {
  stato: GameState;
  notifiche: string[];
}

/** Completa automaticamente le missioni attive il cui obiettivo e'
 * soddisfatto (B5: "tracking automatico"), assegnando ricompensa (e
 * l'eventuale bonus nascosto) atomicamente insieme al cambio di stato. Le
 * carte di ricompensa possono eccedere temporaneamente la capacita' della
 * mano (B2: "le ricompense possono creare overflow temporaneo"). */
export function integraMissioni(stato: GameState): RisultatoMissioni {
  const attive = stato.missioni.filter((m) => m.stato === "attiva");
  if (attive.length === 0) return { stato, notifiche: [] };

  let nuovoStato = stato;
  const notifiche: string[] = [];
  let cambiato = false;

  for (const missione of attive) {
    if (!obiettivoCompletato(nuovoStato, missione)) continue;
    cambiato = true;

    let crediti = nuovoStato.crediti + missione.ricompensa.crediti;
    let nuoveCarte = [...nuovoStato.manoCarte, ...missione.ricompensa.carte.map((code, i) => ({
      instanceId: `${missione.id}-reward-${i}`,
      code,
      livello: 1,
    }))];
    let testoBonus = "";
    if (missione.ricompensaNascosta) {
      crediti += missione.ricompensaNascosta.crediti;
      nuoveCarte = [
        ...nuoveCarte,
        ...missione.ricompensaNascosta.carte.map((code, i) => ({ instanceId: `${missione.id}-bonus-${i}`, code, livello: 1 })),
      ];
      if (missione.ricompensaNascosta.crediti > 0 || missione.ricompensaNascosta.carte.length > 0) {
        testoBonus = " (incluso un bonus nascosto)";
      }
    }

    nuovoStato = {
      ...nuovoStato,
      crediti,
      manoCarte: nuoveCarte,
      missioni: nuovoStato.missioni.map((m) => (m.id === missione.id ? { ...m, stato: "completata" as const } : m)),
    };
    notifiche.push(`Missione completata: ${missione.titolo}${testoBonus}.`);
  }

  return cambiato ? { stato: nuovoStato, notifiche } : { stato, notifiche: [] };
}
