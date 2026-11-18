import { useRef } from "react";
import "./ConfirmModal.css";

export interface SceltaCriticoProps {
  id: string;
  testo: string;
}

export interface EventoCriticoModalProps {
  titolo: string;
  descrizione: string;
  scelte: SceltaCriticoProps[];
  onScelta: (scelteId: string) => void;
}

/**
 * Modale per gli eventi critici (B9: "eventi ordinari non modali, critici
 * sospendono solo quando necessario"): a differenza di ConfirmModal non ha
 * un'opzione "Annulla" generica, perche' un evento critico richiede sempre
 * una scelta esplicita tra conseguenze reali e diverse (mai un semplice
 * +10% travestito da scelta). Stesso stile visivo di ConfirmModal per
 * coerenza, un pulsante per ciascuna scelta disponibile.
 */
export function EventoCriticoModal({ titolo, descrizione, scelte, onScelta }: EventoCriticoModalProps) {
  const scelteFatteRef = useRef(false);

  const handleScelta = (scelteId: string) => {
    if (scelteFatteRef.current) return;
    scelteFatteRef.current = true;
    onScelta(scelteId);
  };

  return (
    <div className="confirm-modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="evento-critico-title">
        <h2 id="evento-critico-title">{titolo}</h2>
        <p>{descrizione}</p>
        <div className="confirm-modal-actions evento-critico-scelte">
          {scelte.map((scelta) => (
            <button type="button" key={scelta.id} className="btn btn-primary" onClick={() => handleScelta(scelta.id)}>
              {scelta.testo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
