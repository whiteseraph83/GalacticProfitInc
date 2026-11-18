import { useEffect, useRef, useState } from "react";
import { personaggioPer } from "../narrativeAvatars";
import "./NarrativeToast.css";

export interface NarrativeToastProps {
  speaker: string;
  text: string;
  onChiudi: () => void;
}

const VELOCITA_MS_PER_CARATTERE = 18;
const RIDUZIONE_MOVIMENTO =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Overlay non bloccante in basso, sopra la mano carte (docs/TODO.md,
 * "Messaggi narrativi come overlay in basso con avatar"): avatar del
 * personaggio a sinistra, testo a destra con effetto macchina da
 * scrittura lettera per lettera, font digitale/terminale, animazione di
 * comparsa dal basso. Non si chiude mai da sola (richiesta utente: il
 * giocatore deve poter leggere con i suoi tempi, nessun timeout): avanza
 * solo al click SUL riquadro (completa subito la scrittura, poi
 * chiude/avanza al dialogo successivo) — a testo completato compare
 * un'iconcina del mouse lampeggiante per segnalare l'attesa di un click. Un
 * click FUORI dal riquadro non lo chiude (richiesta utente: cliccare fuori
 * non deve interrompere il dialogo) — serve pero' ancora a bloccare il
 * click prima che raggiunga la mappa PixiJS sottostante, tramite un
 * backdrop fisico a schermo intero: l'utente ha notato che altrimenti
 * cliccare vicino al messaggio spostava anche la nave madre (PixiJS
 * gestisce i propri eventi pointer sul canvas, uno `stopPropagation`
 * sull'evento DOM "click" da solo non basta).
 */
export function NarrativeToast({ speaker, text, onChiudi }: NarrativeToastProps) {
  const personaggio = personaggioPer(speaker);
  const [caratteriMostrati, setCaratteriMostrati] = useState(RIDUZIONE_MOVIMENTO ? text.length : 0);
  const caratteriMostratiRef = useRef(caratteriMostrati);
  const onChiudiRef = useRef(onChiudi);
  useEffect(() => {
    onChiudiRef.current = onChiudi;
  }, [onChiudi]);

  useEffect(() => {
    const iniziale = RIDUZIONE_MOVIMENTO ? text.length : 0;
    setCaratteriMostrati(iniziale);
    caratteriMostratiRef.current = iniziale;
    if (RIDUZIONE_MOVIMENTO) return;
    let indice = 0;
    const timer = window.setInterval(() => {
      indice += 1;
      setCaratteriMostrati(indice);
      caratteriMostratiRef.current = indice;
      if (indice >= text.length) window.clearInterval(timer);
    }, VELOCITA_MS_PER_CARATTERE);
    return () => window.clearInterval(timer);
  }, [text]);

  const testoCompleto = caratteriMostrati >= text.length;

  const avanza = () => {
    if (caratteriMostratiRef.current < text.length) {
      caratteriMostratiRef.current = text.length;
      setCaratteriMostrati(text.length);
    } else {
      onChiudiRef.current();
    }
  };

  return (
    <div className="narrative-toast-backdrop">
      <div className="narrative-toast" role="status" onClick={avanza}>
        <img className="narrative-toast__avatar" src={personaggio.avatar} alt="" style={{ borderColor: personaggio.colore }} />
        <div className="narrative-toast__corpo">
          <span className="narrative-toast__nome" style={{ color: personaggio.colore }}>
            {personaggio.nomeVisualizzato}
          </span>
          <p className="narrative-toast__testo">
            {text.slice(0, caratteriMostrati)}
            {!testoCompleto && <span className="narrative-toast__cursore" aria-hidden="true" />}
          </p>
          {testoCompleto && (
            <svg className="narrative-toast__attesa-click" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M12 2.5c-3.3 0-6 2.7-6 6v7c0 3.3 2.7 6 6 6s6-2.7 6-6v-7c0-3.3-2.7-6-6-6Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M12 5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <button
          type="button"
          className="narrative-toast__chiudi"
          onClick={(e) => {
            e.stopPropagation();
            onChiudi();
          }}
          aria-label="Chiudi messaggio"
        >
          ×
        </button>
      </div>
    </div>
  );
}
