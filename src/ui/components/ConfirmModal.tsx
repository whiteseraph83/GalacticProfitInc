import { useEffect, useRef } from "react";
import { audioEngine } from "../../audio/audioEngine";
import "./ConfirmModal.css";

export interface ConfirmModalProps {
  aperto: boolean;
  titolo: string;
  dettagli: { etichetta: string; valore: string }[];
  testoConferma?: string;
  onConferma: () => void;
  onAnnulla: () => void;
}

/**
 * Modale di conferma generica. Usata per ogni comando "importante" prima di
 * consumare una carta o applicare un effetto irreversibile (A2). Esc e il
 * pulsante Annulla non hanno alcun effetto sullo stato di gioco. Il
 * pulsante Conferma si disabilita subito dopo il primo click per proteggere
 * dal doppio click (il motore rifiuta comunque un comando duplicato).
 */
export function ConfirmModal({ aperto, titolo, dettagli, testoConferma = "Conferma", onConferma, onAnnulla }: ConfirmModalProps) {
  const confermatoRef = useRef(false);
  const confermaBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aperto) {
      confermatoRef.current = false;
      return;
    }
    confermaBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onAnnulla();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aperto, onAnnulla]);

  if (!aperto) return null;

  const handleConferma = () => {
    if (confermatoRef.current) return;
    confermatoRef.current = true;
    audioEngine.suonaEffetto("conferma");
    onConferma();
  };

  const handleAnnulla = () => {
    audioEngine.suonaEffetto("click");
    onAnnulla();
  };

  return (
    <div className="confirm-modal-backdrop" role="presentation" onClick={handleAnnulla}>
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title">{titolo}</h2>
        <dl className="confirm-modal-details">
          {dettagli.map((d) => (
            <div key={d.etichetta} className="confirm-modal-row">
              <dt>{d.etichetta}</dt>
              <dd>{d.valore}</dd>
            </div>
          ))}
        </dl>
        <div className="confirm-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={handleAnnulla}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" ref={confermaBtnRef} onClick={handleConferma}>
            {testoConferma}
          </button>
        </div>
      </div>
    </div>
  );
}
