import { useEffect, type ReactNode } from "react";
import "./OverlayPanel.css";

export interface OverlayPanelProps {
  onChiudi: () => void;
  ariaLabel: string;
  children: ReactNode;
}

/**
 * Overlay generico centrato sul gioco, per pannelli che prima vivevano
 * sempre visibili nella barra laterale (Missioni, Mercato, Dettagli
 * pianeta) e che l'utente ha chiesto di spostare qui per liberare spazio
 * permanente: si apre su richiesta (click bottoniera o selezione pianeta) e
 * si chiude con il bottone di chiusura, Esc o click sullo sfondo, senza
 * alterare lo stato di gioco (stesso trattamento di `ConfirmModal`, non
 * modale: la simulazione continua a girare dietro l'overlay).
 */
export function OverlayPanel({ onChiudi, ariaLabel, children }: OverlayPanelProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onChiudi]);

  return (
    <div className="overlay-panel-backdrop" role="presentation" onClick={onChiudi}>
      <div className="overlay-panel" role="dialog" aria-label={ariaLabel} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="overlay-panel__chiudi" onClick={onChiudi} aria-label="Chiudi">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
