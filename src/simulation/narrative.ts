import {
  CAPITOLI,
  FINALI,
  MARGINE_EPILOGO_SEGRETO,
  SCENE_NARRATIVE,
  SOGLIA_FIDUCIA_LIQUIDAZIONE,
} from "../domain/narrative";
import type { EffettoScena, GameState, SceneNarrativaDefinition } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { registraRicavo, registraSpesa } from "./economy";

// Campagna narrativa a 5 capitoli (B7/B10, Macrostep 10). Funzioni pure,
// testabili senza browser: osservano lo stato di gioco in sola lettura per
// decidere quando una scena si sblocca, senza introdurre nuove regole nel
// motore di simulazione (B10).

function condizioneSoddisfatta(stato: GameState, scena: SceneNarrativaDefinition): boolean {
  switch (scena.condizione.tipo) {
    case "semprePrimo":
      return true;
    case "missioniCompletate":
      return stato.missioni.filter((m) => m.stato === "completata").length >= scena.condizione.minimo;
    case "ricercaCompletata":
      return stato.ricerca.completate.length >= scena.condizione.minimo;
    case "creditiAlmeno":
      return stato.crediti >= scena.condizione.minimo;
    case "pianetaAnomaloInvestigato":
      return stato.pianeti.some((p) => p.archetipo === "anomalo" && p.investigato);
    case "pericoloScoperto":
      return stato.pericoli.some((p) => p.scoperto);
    case "sceneCompletate":
      return scena.condizione.id.every((id) => stato.campagna.sceneCompletate.includes(id));
  }
}

/** La prossima scena da mostrare: la prima, nell'ordine di definizione (che
 * segue i 5 capitoli in sequenza), non ancora completata la cui condizione
 * e' soddisfatta. null se la campagna e' conclusa o non ci sono scene
 * sbloccabili al momento. Mai persistita a parte: ricalcolata ogni volta
 * da `campagna.sceneCompletate` e dal resto dello stato, stessa filosofia
 * di `bonusRicerca` (nessuna fonte di verita' duplicata). */
export function sceneAttiva(stato: GameState): SceneNarrativaDefinition | null {
  if (stato.campagna.finaleOttenuto) return null;
  for (const scena of Object.values(SCENE_NARRATIVE)) {
    if (stato.campagna.sceneCompletate.includes(scena.id)) continue;
    if (condizioneSoddisfatta(stato, scena)) return scena;
    return null; // la prima non ancora completata blocca le successive: ordine lineare
  }
  return null;
}

export interface RisultatoCampagna {
  stato: GameState;
  notifiche: string[];
}

/** Aggiorna `capitoloCorrente` quando la scena attiva appartiene a un
 * capitolo diverso da quello registrato (avanzamento di capitolo). */
export function integraCampagna(stato: GameState): RisultatoCampagna {
  const scena = sceneAttiva(stato);
  if (!scena || scena.capitolo === stato.campagna.capitoloCorrente) return { stato, notifiche: [] };

  return {
    stato: { ...stato, campagna: { ...stato.campagna, capitoloCorrente: scena.capitolo } },
    notifiche: [`Capitolo: ${CAPITOLI[scena.capitolo]}`],
  };
}

export function validaSceltaNarrativa(stato: GameState, sceneId: string, scelteId: string): CommandValidationResult {
  const scena = sceneAttiva(stato);
  if (!scena || scena.id !== sceneId) return { ok: false, motivo: "questa non e' la scena narrativa attiva" };
  if (scena.scelte === null) {
    return scelteId === "continua" ? { ok: true } : { ok: false, motivo: "scelta non valida" };
  }
  return scena.scelte.some((s) => s.id === scelteId) ? { ok: true } : { ok: false, motivo: "scelta non valida" };
}

function applicaEffettoScena(stato: GameState, effetto: EffettoScena): GameState {
  switch (effetto.tipo) {
    case "allineamento":
      return {
        ...stato,
        campagna: {
          ...stato.campagna,
          allineamento: { ...stato.campagna.allineamento, [effetto.asse]: stato.campagna.allineamento[effetto.asse] + effetto.valore },
        },
      };
    case "crediti": {
      const nuovoStato: GameState = { ...stato, crediti: Math.max(0, stato.crediti + effetto.valore) };
      return effetto.valore >= 0 ? registraRicavo(nuovoStato, effetto.valore) : registraSpesa(nuovoStato, -effetto.valore);
    }
    case "nessunEffetto":
      return stato;
  }
}

/** Determina il finale (B7: "quattro finali principali più possibile
 * epilogo segreto"): fiducia critica sovrasta qualunque allineamento
 * (liquidazione); tre assi vicini tra loro sblocca l'epilogo segreto;
 * altrimenti vince l'asse con il punteggio piu' alto. */
function assegnaFinale(stato: GameState): GameState {
  if (stato.review.fiducia < SOGLIA_FIDUCIA_LIQUIDAZIONE) {
    return { ...stato, campagna: { ...stato.campagna, finaleOttenuto: "FIN-LIQUIDAZIONE" } };
  }

  const { lealta, indipendenza, ribellione } = stato.campagna.allineamento;
  const massimo = Math.max(lealta, indipendenza, ribellione);
  const valoriVicini = [lealta, indipendenza, ribellione].filter((v) => massimo - v <= MARGINE_EPILOGO_SEGRETO).length;
  if (valoriVicini === 3) {
    return { ...stato, campagna: { ...stato.campagna, finaleOttenuto: "FIN-SEGRETO" } };
  }

  const finaleId = lealta === massimo ? "FIN-LEALTA" : indipendenza === massimo ? "FIN-INDIPENDENZA" : "FIN-RIBELLIONE";
  return { ...stato, campagna: { ...stato.campagna, finaleOttenuto: finaleId } };
}

export function applicaSceltaNarrativa(stato: GameState, sceneId: string, scelteId: string): RisultatoCampagna {
  const scena = SCENE_NARRATIVE[sceneId];
  if (!scena) return { stato, notifiche: [] };

  let nuovoStato: GameState = {
    ...stato,
    campagna: { ...stato.campagna, sceneCompletate: [...stato.campagna.sceneCompletate, sceneId] },
  };
  const notifiche: string[] = [];

  if (scena.scelte) {
    const scelta = scena.scelte.find((s) => s.id === scelteId);
    if (scelta) {
      for (const effetto of scelta.effetti) nuovoStato = applicaEffettoScena(nuovoStato, effetto);
      notifiche.push(`${scena.titolo}: ${scelta.testo}`);
    }
  }

  const prossimaScena = sceneAttiva(nuovoStato);
  if (!prossimaScena && !nuovoStato.campagna.finaleOttenuto && Object.keys(SCENE_NARRATIVE).every((id) => nuovoStato.campagna.sceneCompletate.includes(id))) {
    nuovoStato = assegnaFinale(nuovoStato);
    notifiche.push(`Finale raggiunto: ${FINALI[nuovoStato.campagna.finaleOttenuto as string].titolo}.`);
  }

  return { stato: nuovoStato, notifiche };
}
