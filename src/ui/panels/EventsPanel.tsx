import { useId } from "react";
import { EVENTO_DEFINITIONS } from "../../domain/events";
import { useEngine, useGameState } from "../useEngine";

const NOME_CATEGORIA: Record<string, string> = {
  aziendale: "Aziendale",
  economico: "Economico",
  diplomatico: "Diplomatico",
  misterioso: "Misterioso",
  pirateria: "Pirateria",
};

/** Pannello Eventi (B9, Macrostep 9): "eventi ordinari non modali" — qui
 * nel pannello gestionale, mai bloccanti, ignorabili senza conseguenze
 * oltre a perdere l'opportunita'. Gli eventi critici (pirateria grave) non
 * appaiono qui: usano una modale dedicata (vedi AppShell). */
export function EventsPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();

  const eventiNonCritici = state.eventi.attivi
    .map((e) => ({ attivo: e, def: EVENTO_DEFINITIONS[e.definizioneId] }))
    .filter((e) => e.def && !e.def.critico);

  if (eventiNonCritici.length === 0) {
    return (
      <section aria-label="Eventi">
        <h2>Eventi</h2>
        <p className="management-panel__note">Nessun evento in corso.</p>
      </section>
    );
  }

  const scegli = (eventoId: string, scelteId: string) =>
    engine.dispatch({ id: `${idBase}-scelta-${eventoId}-${scelteId}`, type: "ui/sceltaEvento", payload: { eventoId, scelteId } });
  const ignora = (eventoId: string) => engine.dispatch({ id: `${idBase}-ignora-${eventoId}`, type: "ui/ignoraEvento", payload: { eventoId } });

  return (
    <section aria-label="Eventi">
      <h2>Eventi</h2>
      {eventiNonCritici.map(({ attivo, def }) => (
        <div key={attivo.id} className="mission-card">
          <p className="mission-card__titolo">
            {def.titolo} <span className="market-row__detail">{NOME_CATEGORIA[def.categoria]}</span>
          </p>
          <p className="mission-card__desc">{def.descrizione}</p>
          {def.scelte.map((scelta) => (
            <button type="button" key={scelta.id} className="btn btn-small" onClick={() => scegli(attivo.id, scelta.id)}>
              {scelta.testo}
            </button>
          ))}
          <button type="button" className="btn btn-small" onClick={() => ignora(attivo.id)}>
            Ignora
          </button>
        </div>
      ))}
    </section>
  );
}
