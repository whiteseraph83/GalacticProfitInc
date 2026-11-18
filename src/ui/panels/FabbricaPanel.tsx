import { useId, useState } from "react";
import { RICETTE_RAFFINAZIONE, FABBRICA_COSTO } from "../../domain/refineRecipes";
import { ConfirmModal } from "../components/ConfirmModal";
import { useEngine, useGameState } from "../useEngine";

const ETICHETTA_STATO_CODA: Record<string, string> = {
  inCoda: "In coda",
  inLavorazione: "In lavorazione",
};

/** Pannello Fabbrica (B1/Macrostep 4): coda di raffinazione impostata
 * manualmente dal giocatore (azione libera, non richiede carte, come le
 * rotte cargo delle navette: B2), con produzione automatica dopo l'avvio.
 * La costruzione della fabbrica resta invece legata alla carta Fabbrica. */
export function FabbricaPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();
  const [ricettaProposta, setRicettaProposta] = useState<string | null>(null);

  if (!state.fabbrica.costruita) {
    return (
      <section aria-label="Fabbrica">
        <h2>Fabbrica</h2>
        <p className="management-panel__note">
          Nessuna fabbrica costruita. Gioca la carta Fabbrica per costruirne
          una ({FABBRICA_COSTO.crediti} Cr + {FABBRICA_COSTO.ferro} ferro
          grezzo in stiva).
        </p>
      </section>
    );
  }

  const ricetta = ricettaProposta ? RICETTE_RAFFINAZIONE[ricettaProposta] : null;

  const confermaRicetta = () => {
    if (!ricettaProposta) return;
    engine.dispatch({ id: `${idBase}-raffina-${Date.now()}`, type: "ui/accodaRaffinazione", payload: { ricettaId: ricettaProposta } });
    setRicettaProposta(null);
  };

  return (
    <section aria-label="Fabbrica">
      <h2>Fabbrica</h2>
      <ul className="fleet-list">
        {Object.values(RICETTE_RAFFINAZIONE).map((r) => (
          <li className="fleet-list__item" key={r.id}>
            <span className="fleet-list__name">{r.nome}</span>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setRicettaProposta(r.id)}
              disabled={state.crediti < r.costoCrediti}
            >
              Avvia ({r.costoCrediti} Cr)
            </button>
          </li>
        ))}
      </ul>

      <h2>Coda di produzione</h2>
      <ul className="fleet-list">
        {state.fabbrica.coda.map((elemento) => {
          const def = RICETTE_RAFFINAZIONE[elemento.ricettaId];
          return (
            <li className="fleet-list__item" key={elemento.id}>
              <span className="fleet-list__name">{def?.nome ?? elemento.ricettaId}</span>
              <span className="fleet-list__detail">{ETICHETTA_STATO_CODA[elemento.stato] ?? elemento.stato}</span>
            </li>
          );
        })}
        {state.fabbrica.coda.length === 0 && <li className="fleet-list__empty">Nessuna produzione in coda.</li>}
      </ul>

      <ConfirmModal
        aperto={ricettaProposta !== null}
        titolo={ricetta ? `Avvia: ${ricetta.nome}` : ""}
        dettagli={
          ricetta
            ? [
                { etichetta: "Input", valore: `${ricetta.inputQuantita} ${ricetta.inputRisorsa} (grezzo, dalla stiva)` },
                { etichetta: "Output", valore: `${ricetta.outputQuantita} ${ricetta.outputRisorsa}` },
                { etichetta: "Costo", valore: `${ricetta.costoCrediti} Cr (dedotto subito)` },
                { etichetta: "Durata", valore: `${ricetta.durataSec} secondi` },
                { etichetta: "Reversibile", valore: "No" },
              ]
            : []
        }
        testoConferma="Accoda ricetta"
        onConferma={confermaRicetta}
        onAnnulla={() => setRicettaProposta(null)}
      />
    </section>
  );
}
