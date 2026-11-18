import { useId, useState } from "react";
import { useEngine, useGameState } from "../useEngine";
import { ConfirmModal } from "../components/ConfirmModal";

/** Comandi diretti non legati a una carta: soccorso carburante (B2, una
 * sola volta per carriera) e un'azione dimostrativa usata per collaudare il
 * flusso di conferma (A2). Estratto dal pannello gestionale in un pannello
 * dedicato, raggiunto tramite il bottone Impostazioni. */
export function CommandsPanel() {
  const engine = useEngine();
  const state = useGameState();
  const [modalAperto, setModalAperto] = useState(false);
  const [modalSoccorsoAperto, setModalSoccorsoAperto] = useState(false);
  const idBase = useId();

  const aprireDemo = () => setModalAperto(true);
  const confermaDemo = () => {
    engine.dispatch({ id: `${idBase}-demo-${Date.now()}`, type: "demo/confirmableAction", payload: {} });
    setModalAperto(false);
  };
  const annullaDemo = () => setModalAperto(false);

  const confermaSoccorso = () => {
    engine.dispatch({ id: `${idBase}-soccorso-${Date.now()}`, type: "ui/soccorsoCarburante" });
    setModalSoccorsoAperto(false);
  };
  const annullaSoccorso = () => setModalSoccorsoAperto(false);

  const soccorsoGiaUsato = state.review.soccorsoCarburanteUsato;
  const carburanteMancante = state.mothership.serbatoioCapacita - state.mothership.carburante;

  return (
    <section aria-label="Comandi">
      <h2>Comandi</h2>
      <button
        type="button"
        className="btn"
        onClick={() => setModalSoccorsoAperto(true)}
        disabled={soccorsoGiaUsato}
        title={soccorsoGiaUsato ? "Gia' utilizzato in questa carriera" : undefined}
      >
        Soccorso carburante{soccorsoGiaUsato ? " (usato)" : ""}
      </button>
      <button type="button" className="btn" onClick={aprireDemo}>
        Azione dimostrativa (test conferma)
      </button>

      <ConfirmModal
        aperto={modalAperto}
        titolo="Azione dimostrativa"
        dettagli={[
          { etichetta: "Effetto", valore: "Registra una notifica di test" },
          { etichetta: "Costo", valore: "Nessuno" },
          { etichetta: "Reversibile", valore: "Si'" },
        ]}
        onConferma={confermaDemo}
        onAnnulla={annullaDemo}
      />

      <ConfirmModal
        aperto={modalSoccorsoAperto}
        titolo="Soccorso carburante"
        dettagli={[
          { etichetta: "Carburante", valore: `+30 (max ${Math.max(0, carburanteMancante).toFixed(0)} utile)` },
          { etichetta: "Fiducia", valore: "-10" },
          { etichetta: "Disponibilita'", valore: "Una sola volta per carriera" },
          { etichetta: "Reversibile", valore: "No" },
        ]}
        testoConferma="Richiedi soccorso"
        onConferma={confermaSoccorso}
        onAnnulla={annullaSoccorso}
      />
    </section>
  );
}
