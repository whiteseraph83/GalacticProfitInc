import { useEffect, useState, type ReactNode } from "react";
import { SimulationEngine } from "../simulation/engine";
import { validaStato } from "../domain/initialState";
import { persistenceAdapter } from "../persistence/indexedDbAdapter";
import { SAVE_SCHEMA_VERSION } from "../persistence/types";
import { EngineContext } from "./engineContextDef";

/**
 * Al montaggio prova a riprendere l'ultimo salvataggio (IndexedDB,
 * Macrostep 5): se presente e valido per lo schema corrente, il motore
 * riparte esattamente da quello stato (nessuna simulazione del tempo
 * trascorso a pagina chiusa, A3); altrimenti genera una nuova partita dal
 * seed fornito. Il caricamento e' asincrono: i figli non sono montati
 * finche' il motore non e' pronto.
 */
export function EngineProvider({ seed, children }: { seed: string; children: ReactNode }) {
  const [engine, setEngine] = useState<SimulationEngine | null>(null);

  useEffect(() => {
    let annullato = false;

    persistenceAdapter
      .carica()
      .then((save) => {
        if (annullato) return;
        if (save && save.schemaVersion === SAVE_SCHEMA_VERSION && validaStato(save.state).length === 0) {
          setEngine(new SimulationEngine(save.state.seed, save.state));
        } else {
          setEngine(new SimulationEngine(seed));
        }
      })
      .catch(() => {
        if (!annullato) setEngine(new SimulationEngine(seed));
      });

    return () => {
      annullato = true;
    };
  }, [seed]);

  if (!engine) {
    return (
      <div className="engine-loading" role="status">
        Caricamento partita…
      </div>
    );
  }

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}
