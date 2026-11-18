import { useEffect, useId } from "react";
import { sceneAttiva } from "../../simulation/narrative";
import { useEngine, useGameState } from "../useEngine";

/** Pannello Campagna (B7/B10, Macrostep 10): avanza la scena narrativa
 * attiva (calcolata in sola lettura dallo stato di gioco, mai persistita a
 * parte). Il testo della scena non si mostra piu' qui (duplicava l'overlay
 * a comparsa — richiesta utente): questo pannello resta solo il punto in
 * cui si dispaccia `ui/sceltaNarrativa`, visibile unicamente quando c'e'
 * davvero una scelta da fare; le scene senza scelte avanzano da sole. */
export function NarrativePanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();

  const scena = state.campagna.finaleOttenuto ? null : sceneAttiva(state);

  const scegli = (sceneId: string, scelteId: string) =>
    engine.dispatch({ id: `${idBase}-narrativa-${sceneId}-${scelteId}`, type: "ui/sceltaNarrativa", payload: { sceneId, scelteId } });

  const sceneSenzaScelteId = scena && scena.scelte === null ? scena.id : null;
  useEffect(() => {
    if (sceneSenzaScelteId) engine.dispatch({ id: `${idBase}-narrativa-${sceneSenzaScelteId}-continua`, type: "ui/sceltaNarrativa", payload: { sceneId: sceneSenzaScelteId, scelteId: "continua" } });
  }, [sceneSenzaScelteId, engine, idBase]);

  if (!scena || scena.scelte === null) return null;

  return (
    <section aria-label="Campagna" className="mission-card mission-card--principale">
      <p className="mission-card__titolo">{scena.titolo}</p>
      {scena.scelte.map((scelta) => (
        <button type="button" key={scelta.id} className="btn btn-small" onClick={() => scegli(scena.id, scelta.id)}>
          {scelta.testo}
        </button>
      ))}
    </section>
  );
}
