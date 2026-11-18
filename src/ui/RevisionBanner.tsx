import { useId, useState } from "react";
import { useEngine, useGameState } from "./useEngine";
import { ConfirmModal } from "./components/ConfirmModal";

/** Banner di revisione aziendale (B3, CONFERMATO): dovuta esattamente alla
 * 40ª carta giocata, quota pagabile anche dal capitale iniziale, 5 carte di
 * tolleranza se non pagata prima che la partita termini. */
export function RevisionBanner() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();
  const [modaleAperto, setModaleAperto] = useState(false);

  if (state.review.statoRevisione === "nessuna") return null;

  const puoPagare = state.crediti >= state.review.quotaDaPagare;
  const confermaPagamento = () => {
    engine.dispatch({ id: `${idBase}-paga-${Date.now()}`, type: "ui/pagaQuotaRevisione" });
    setModaleAperto(false);
  };

  return (
    <div className="revision-banner" role="alert">
      <span>
        Revisione aziendale dovuta: <strong>{state.review.quotaDaPagare} Cr</strong>
        {state.review.statoRevisione === "inTolleranza" && (
          <> — tolleranza: {state.review.carteTolleranzaResidue} comandi rimanenti prima del Game Over</>
        )}
      </span>
      <button type="button" className="btn btn-primary" onClick={() => setModaleAperto(true)} disabled={!puoPagare}>
        Paga quota
      </button>

      <ConfirmModal
        aperto={modaleAperto}
        titolo="Paga quota aziendale"
        dettagli={[
          { etichetta: "Quota", valore: `${state.review.quotaDaPagare} Cr` },
          { etichetta: "Crediti disponibili", valore: `${Math.floor(state.crediti)} Cr` },
          { etichetta: "Reversibile", valore: "No" },
        ]}
        testoConferma="Paga"
        onConferma={confermaPagamento}
        onAnnulla={() => setModaleAperto(false)}
      />
    </div>
  );
}
