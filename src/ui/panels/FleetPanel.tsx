import { useId } from "react";
import { NAVE_MINERARIA_COSTO } from "../../domain/modules";
import { useEngine, useGameState } from "../useEngine";

const ETICHETTA_STATO: Record<string, string> = {
  libera: "Libera",
  inViaggio: "In viaggio",
  inAttesa: "In attesa di carico",
  caricamento: "Caricamento",
  ritorno: "Ritorno",
  scarico: "Scarico",
  indisponibile: "Indisponibile (stiva piena)",
};

function cargoTotale(carico: Partial<Record<string, number>>): number {
  const totale = Object.values(carico).reduce((somma: number, q) => somma + (q ?? 0), 0);
  return Math.round(totale * 10) / 10;
}

/** Pannello di stato della flotta (B1): nave madre, navi minerarie e
 * navette con posizione/carico persistenti, aggiornato in tempo reale una
 * volta avviato un contratto minerario con la carta Contratto minerario. */
export function FleetPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();

  const acquistaNave = () =>
    engine.dispatch({ id: `${idBase}-acquista-nave-${Date.now()}`, type: "ui/acquistaNaveMineraria" });
  const ferroRaffinatoDisponibile = state.mothership.stivaCarico.ferroRaffinato ?? 0;

  return (
    <section aria-label="Stato della flotta">
      <h2>Flotta</h2>
      <ul className="fleet-list">
        <li className="fleet-list__item">
          <span className="fleet-list__name">Nave madre</span>
          <span className="fleet-list__detail">
            {Math.round(state.mothership.carburante)}/{state.mothership.serbatoioCapacita} carburante ·{" "}
            {cargoTotale(state.mothership.stivaCarico)}/{state.mothership.stivaCapacita} stiva
          </span>
        </li>
        {state.naviMinerarie.map((nave) => (
          <li className="fleet-list__item" key={nave.id}>
            <span className="fleet-list__name">Nave mineraria</span>
            <span className="fleet-list__detail">
              {nave.contrattoAttivoId ? "In contratto" : "Senza contratto attivo"}
            </span>
          </li>
        ))}
        {state.navette.map((navetta, indice) => (
          <li className="fleet-list__item" key={navetta.id}>
            <span className="fleet-list__name">Navetta {indice + 1}</span>
            <span className="fleet-list__detail">
              {ETICHETTA_STATO[navetta.stato] ?? navetta.stato} · {cargoTotale(navetta.caricoAttuale)}/{navetta.capacitaCargo}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn"
        onClick={acquistaNave}
        disabled={state.crediti < NAVE_MINERARIA_COSTO.crediti || ferroRaffinatoDisponibile < NAVE_MINERARIA_COSTO.ferroRaffinato}
        title={`${NAVE_MINERARIA_COSTO.crediti} Cr + ${NAVE_MINERARIA_COSTO.ferroRaffinato} ferro raffinato in stiva`}
      >
        Acquista nave mineraria ({NAVE_MINERARIA_COSTO.crediti} Cr)
      </button>
    </section>
  );
}
