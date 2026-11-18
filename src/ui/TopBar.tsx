import { brandingPostCampagna } from "../domain/narrative";
import { useGameState } from "./useEngine";
import { IconCarburante, IconCrediti, IconFiducia, IconQuota } from "./icons/StatIcons";
import "./TopBar.css";

export function TopBar({ onTogglePause }: { onTogglePause: () => void }) {
  const state = useGameState();
  const { mothership, review } = state;
  // B11: dopo la campagna, il marchio mostrato si adatta al finale
  // raggiunto (indipendenza/ribellione non hanno piu' senso sotto il
  // marchio OmniProfit invariato) — vedi domain/narrative.ts.
  const branding = brandingPostCampagna(state.campagna.finaleOttenuto) ?? {
    main: "OMNIPROFIT",
    sub: "GALACTIC CORPORATION™",
  };

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <span className="top-bar__brand-main">{branding.main}</span>
        <span className="top-bar__brand-sub">{branding.sub}</span>
      </div>

      <div className="top-bar__stats">
        <div className="top-bar__stat" title="Crediti disponibili">
          <IconCrediti />
          <span className="top-bar__stat-label">Cr</span>
          <span className="top-bar__stat-value">{Math.floor(state.crediti).toLocaleString("it-IT")}</span>
        </div>
        <div className="top-bar__stat" title="Carburante / capacita' serbatoio">
          <IconCarburante />
          <span className="top-bar__stat-label">Carburante</span>
          <span className="top-bar__stat-value">
            {Math.round(mothership.carburante)} / {mothership.serbatoioCapacita}
          </span>
        </div>
        <div className="top-bar__stat" title="Comandi eseguiti dall'ultima revisione / soglia prossima revisione">
          <IconQuota />
          <span className="top-bar__stat-label">Quota</span>
          <span className="top-bar__stat-value">
            {review.carteGiocateDallUltimaRevisione} / {review.sogliaCarteProssimaRevisione}
          </span>
        </div>
        <div className="top-bar__stat" title="Fiducia aziendale (0-100)">
          <IconFiducia />
          <span className="top-bar__stat-label">Fiducia</span>
          <span className="top-bar__stat-value">{review.fiducia}</span>
        </div>
      </div>

      <div className="top-bar__controls">
        <button type="button" className="btn" onClick={onTogglePause}>
          {state.inPausa ? "Riprendi" : "Pausa"}
        </button>
      </div>
    </header>
  );
}
