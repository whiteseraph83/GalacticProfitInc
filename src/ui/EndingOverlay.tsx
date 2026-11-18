import { FINALI } from "../domain/narrative";
import { useGameState } from "./useEngine";

export interface EndingOverlayProps {
  chiuso: boolean;
  onChiudi: () => void;
}

/** Schermata del finale della campagna (B7/B10: "quattro finali principali
 * più possibile epilogo segreto"). A differenza di GameOverOverlay NON
 * blocca la partita: la campagna conclusa non termina la carriera (la
 * modalita' infinita post-campagna arriva al Macrostep 11), quindi resta
 * dismissibile e non ricompare dopo la chiusura (stato locale, non
 * persistito — stessa scelta gia' fatta per TutorialPanel). */
export function EndingOverlay({ chiuso, onChiudi }: EndingOverlayProps) {
  const state = useGameState();
  const finaleId = state.campagna.finaleOttenuto;
  if (!finaleId || chiuso) return null;
  const finale = FINALI[finaleId];
  if (!finale) return null;

  return (
    <div className="game-over-overlay" role="alertdialog" aria-modal="true" aria-label="Finale della campagna">
      <div className="game-over-overlay__box">
        <h1>{finale.segreto ? "EPILOGO SEGRETO" : "FINALE DELLA CAMPAGNA"}</h1>
        <h2 className="ending-overlay__titolo">{finale.titolo}</h2>
        <p>{finale.testo}</p>
        <p className="management-panel__note">
          Lealta' {state.campagna.allineamento.lealta} · Indipendenza {state.campagna.allineamento.indipendenza} · Ribellione{" "}
          {state.campagna.allineamento.ribellione}
        </p>
        <button type="button" className="btn btn-primary" onClick={onChiudi}>
          Continua a giocare
        </button>
      </div>
    </div>
  );
}
