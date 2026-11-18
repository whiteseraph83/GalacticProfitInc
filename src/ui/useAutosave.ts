import { useEffect, useRef, useState } from "react";
import { persistenceAdapter } from "../persistence/indexedDbAdapter";
import { SAVE_SCHEMA_VERSION } from "../persistence/types";
import type { SimulationEngine } from "../simulation/engine";

const INTERVALLO_AUTOSAVE_MS = 30_000;

/** Autosave ogni 30s di tempo reale a pagina aperta + su eventi importanti
 * (B1: fine partita, pagamento quota) — mai mentre la pagina e' chiusa
 * (nessun setTimeout sopravvive alla chiusura della tab, quindi la
 * condizione e' automaticamente rispettata). Ritorna l'istante
 * dell'ultimo salvataggio riuscito, per mostrarlo in UI. */
export function useAutosave(engine: SimulationEngine): Date | null {
  const [ultimoSalvataggio, setUltimoSalvataggio] = useState<Date | null>(null);
  const gameOverPrecedente = useRef(false);
  const statoRevisionePrecedente = useRef(engine.getState().review.statoRevisione);

  useEffect(() => {
    let annullato = false;

    const salva = async () => {
      const stato = engine.getState();
      try {
        await persistenceAdapter.salva({ schemaVersion: SAVE_SCHEMA_VERSION, salvatoIl: new Date().toISOString(), state: stato });
        if (!annullato) setUltimoSalvataggio(new Date());
      } catch {
        // Salvataggio best-effort: un fallimento (es. storage pieno/negato)
        // non deve interrompere la partita.
      }
    };

    const intervallo = window.setInterval(salva, INTERVALLO_AUTOSAVE_MS);

    const unsubscribe = engine.subscribe(() => {
      const stato = engine.getState();
      const gameOverOra = stato.gameOver !== null;
      const revisionePagataOra = statoRevisionePrecedente.current !== "nessuna" && stato.review.statoRevisione === "nessuna";
      if ((gameOverOra && !gameOverPrecedente.current) || revisionePagataOra) {
        void salva();
      }
      gameOverPrecedente.current = gameOverOra;
      statoRevisionePrecedente.current = stato.review.statoRevisione;
    });

    return () => {
      annullato = true;
      window.clearInterval(intervallo);
      unsubscribe();
    };
  }, [engine]);

  return ultimoSalvataggio;
}
