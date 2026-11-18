import { PLANET_ARCHETYPES } from "../../domain/planetArchetypes";
import type { Planet } from "../../domain/types";

export function PlanetPanel({ pianeta }: { pianeta: Planet | null }) {
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
              : "Risorse sconosciute: richiede la carta Investiga."}
          </p>
        </div>
      ) : (
        <p className="planet-panel__empty">
          Nessun corpo selezionato. Clicca un pianeta scoperto sulla mappa.
        </p>
      )}
    </section>
  );
}
