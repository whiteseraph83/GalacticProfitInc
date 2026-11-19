import { useId } from "react";
import { PLANET_ARCHETYPES } from "../../domain/planetArchetypes";
import type { Planet } from "../../domain/types";
import { BALANCE } from "../../domain/initialState";
import { useEngine, useGameState } from "../useEngine";
import { NOMI_RISORSA } from "../resourceNames";

export function PlanetPanel({ pianeta }: { pianeta: Planet | null }) {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();

  const contratto = pianeta ? state.contrattiMinerari.find((c) => c.pianetaId === pianeta.id && c.attivo) : undefined;

  const annullaContratto = () => {
    if (!contratto) return;
    engine.dispatch({
      id: `${idBase}-annulla-contratto-${contratto.id}`,
      type: "ui/annullaContrattoMinerario",
      payload: { contrattoId: contratto.id },
    });
  };

  return (
    <section aria-label="Dettagli corpo selezionato">
      <h2>Dettagli</h2>
      {pianeta ? (
        <div>
          <p className="planet-panel__name">{pianeta.nome}</p>
          <p className="planet-panel__archetype">{PLANET_ARCHETYPES[pianeta.archetipo].nomeVisualizzato}</p>
          <p className="planet-panel__note">
            Posizione: {Math.round(pianeta.posizione.x)}, {Math.round(pianeta.posizione.y)}
          </p>
          <p className="planet-panel__note">
            Dimensione: {pianeta.raggio < 20 ? "piccola" : pianeta.raggio < 32 ? "media" : "grande"}
          </p>
          <p className="planet-panel__placeholder-note">
            {pianeta.investigato
              ? `Risorsa rilevata: ${pianeta.risorsaDominante}`
              : "Risorse sconosciute: richiede il comando Investiga."}
          </p>
          {contratto && (
            <div className="planet-panel__contratto">
              <p className="planet-panel__note">
                Contratto minerario attivo: {Math.floor(contratto.depositoAccumulato)}/{BALANCE.capacitaNavetta}{" "}
                {NOMI_RISORSA[contratto.risorsa]} in attesa di ritiro.
              </p>
              <button type="button" className="btn btn-small btn-danger" onClick={annullaContratto}>
                Annulla contratto (richiama la navetta)
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="planet-panel__empty">
          Nessun corpo selezionato. Clicca un pianeta scoperto sulla mappa.
        </p>
      )}
    </section>
  );
}
