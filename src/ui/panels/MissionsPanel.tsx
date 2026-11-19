import { useId, useState } from "react";
import { useEngine, useGameState } from "../useEngine";
import { CAPITOLI } from "../../domain/narrative";
import { numeroCapitoloAttuale } from "../../domain/campaignScenes";
import type { Missione } from "../../domain/types";

function descriviRicompensa(m: Missione): string {
  const parti: string[] = [];
  if (m.ricompensa.crediti > 0) parti.push(`${m.ricompensa.crediti} Cr`);
  if (m.ricompensa.carte.length > 0) parti.push(`${m.ricompensa.carte.length} comando/i`);
  return parti.length > 0 ? parti.join(" + ") : "nessuna";
}

const MAX_DISPONIBILI_MOSTRATE = 8;

export interface MissionsPanelProps {
  /** Versione compatta per la sidebar sinistra (richiesta utente: "anche le
   * missioni attive devono essere presenti nella sidebar sinistra"): solo
   * principale + secondarie attive (gia' limitate a 3 dalla regola di
   * gioco), senza l'elenco delle disponibili ne' il conteggio completate. */
  compatta?: boolean;
}

/** Pannello missioni (B5, Macrostep 6): principale automatica, fino a 3
 * secondarie accettabili manualmente tra quelle disponibili, nessuna
 * scadenza per le secondarie, tracking automatico degli obiettivi. */
export function MissionsPanel({ compatta = false }: MissionsPanelProps = {}) {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();
  const [mostraTutte, setMostraTutte] = useState(false);

  const principale = state.missioni.find((m) => m.principale);
  const attive = state.missioni.filter((m) => m.stato === "attiva" && !m.principale);
  const disponibili = state.missioni.filter((m) => m.stato === "disponibile");
  const completate = state.missioni.filter((m) => m.stato === "completata").length;

  const accetta = (missioneId: string) =>
    engine.dispatch({ id: `${idBase}-accetta-${missioneId}`, type: "ui/accettaMissione", payload: { missioneId } });
  const abbandona = (missioneId: string) =>
    engine.dispatch({ id: `${idBase}-abbandona-${missioneId}-${Date.now()}`, type: "ui/abbandonaMissione", payload: { missioneId } });

  const disponibiliMostrate = mostraTutte ? disponibili : disponibili.slice(0, MAX_DISPONIBILI_MOSTRATE);
  const numeroCapitolo = numeroCapitoloAttuale(state.campagna.capitoloCorrente);
  const titoloCapitolo = CAPITOLI[state.campagna.capitoloCorrente ?? "CAP-1"];

  return (
    <section aria-label={compatta ? "Missioni attive" : "Missioni"}>
      {compatta ? (
        <h2>Missioni attive</h2>
      ) : (
        <>
          <h2>Missione principale</h2>
        </>
      )}
      <p className="management-panel__note">
        Capitolo {numeroCapitolo}: {titoloCapitolo}
      </p>
      {principale && (
        <div className="mission-card mission-card--principale">
          <p className="mission-card__titolo">{principale.titolo}</p>
          <p className="mission-card__desc">{principale.descrizione}</p>
          <p className="mission-card__ricompensa">Ricompensa: {descriviRicompensa(principale)}</p>
        </div>
      )}

      {!compatta && <h2>Secondarie attive ({attive.length}/3)</h2>}
      {attive.length === 0 && !principale && <p className="fleet-list__empty">Nessuna missione attiva al momento.</p>}
      <ul className="fleet-list">
        {attive.map((m) => (
          <li className="fleet-list__item mission-row" key={m.id}>
            <span className="fleet-list__name">
              {m.titolo}
              <span className="market-row__detail">{descriviRicompensa(m)}</span>
            </span>
            <button type="button" className="btn btn-small" onClick={() => abbandona(m.id)}>
              Abbandona
            </button>
          </li>
        ))}
      </ul>

      {!compatta && (
        <>
          <h2>Disponibili ({disponibili.length})</h2>
          <ul className="fleet-list">
            {disponibiliMostrate.map((m) => (
              <li className="fleet-list__item mission-row" key={m.id}>
                <span className="fleet-list__name">
                  {m.titolo}
                  <span className="market-row__detail">{descriviRicompensa(m)}</span>
                </span>
                <button type="button" className="btn btn-small" onClick={() => accetta(m.id)} disabled={attive.length >= 3}>
                  Accetta
                </button>
              </li>
            ))}
          </ul>
          {disponibili.length > MAX_DISPONIBILI_MOSTRATE && (
            <button type="button" className="btn btn-small" onClick={() => setMostraTutte((v) => !v)}>
              {mostraTutte ? "Mostra meno" : `Mostra tutte (${disponibili.length})`}
            </button>
          )}
          <p className="management-panel__note">Completate: {completate} di {state.missioni.length}.</p>
        </>
      )}
    </section>
  );
}
