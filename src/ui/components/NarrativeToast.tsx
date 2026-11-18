import { useEffect, useRef, useState } from "react";
import { personaggioPer } from "../narrativeAvatars";
import "./NarrativeToast.css";

export interface NarrativeToastProps {
  speaker: string;
  text: string;
  onChiudi: () => void;
  /** Modalita' "auto-avanza" (richiesta utente: bottone ">" che fa avanzare
   * automaticamente al dialogo successivo 2 secondi dopo che il testo ha
   * finito di scriversi). Lo stato vive nel genitore perche' questo
   * componente viene rimontato a ogni nuova riga (key diversa), quindi deve
   * restare attivo tra una riga e l'altra finche' l'utente non lo disattiva. */
  autoAvanza: boolean;
  onToggleAutoAvanza: () => void;
  /** Bottone ">>>" per debug/test (richiesta utente): salta a raffica tutti
   * i dialoghi in coda, incluse le scene successive che si caricano man
   * mano, finche' non resta piu' nulla da mostrare. */
  onSaltaTutto: () => void;
}

const AUTO_AVANZA_RITARDO_MS = 2000;

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
export function NarrativeToast({ speaker, text, onChiudi, autoAvanza, onToggleAutoAvanza, onSaltaTutto }: NarrativeToastProps) {
  const personaggio = personaggioPer(speaker);
  const [caratteriMostrati, setCaratteriMostrati] = useState(RIDUZIONE_MOVIMENTO ? text.length : 0);
  const caratteriMostratiRef = useRef(caratteriMostrati);
  const onChiudiRef = useRef(onChiudi);
  // Timer della macchina da scrivere: tenuto in un ref cosi' `avanza()` puo'
  // fermarlo esplicitamente quando l'utente clicca a meta' scrittura. Senza
  // questo, il setInterval continuava a girare dopo il click e sovrascriveva
  // il testo appena completato con valori piu' bassi (bug segnalato
  // dall'utente: "sfarfallio strano" avanzando prima che il testo finisse).
  const timerScritturaRef = useRef<number | null>(null);
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
      if (indice >= text.length) {
        window.clearInterval(timer);
        timerScritturaRef.current = null;
      }
    }, VELOCITA_MS_PER_CARATTERE);
    timerScritturaRef.current = timer;
    return () => {
      window.clearInterval(timer);
      timerScritturaRef.current = null;
    };
  }, [text]);

  const testoCompleto = caratteriMostrati >= text.length;

  useEffect(() => {
    if (!autoAvanza || !testoCompleto) return;
    const timer = window.setTimeout(() => onChiudiRef.current(), AUTO_AVANZA_RITARDO_MS);
    return () => window.clearTimeout(timer);
  }, [autoAvanza, testoCompleto]);

  const avanza = () => {
    if (caratteriMostratiRef.current < text.length) {
      if (timerScritturaRef.current !== null) {
        window.clearInterval(timerScritturaRef.current);
        timerScritturaRef.current = null;
      }
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
        <div className="narrative-toast__azioni">
          <button
            type="button"
            className="narrative-toast__auto"
            onClick={(e) => {
              e.stopPropagation();
              onSaltaTutto();
            }}
            aria-label="Salta tutti i dialoghi (debug/test)"
            title="Debug/test: salta a raffica tutti i dialoghi fino alla fine"
          >
            &gt;&gt;&gt;
          </button>
          <button
            type="button"
            className={`narrative-toast__auto${autoAvanza ? " narrative-toast__auto--attivo" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleAutoAvanza();
            }}
            aria-label={autoAvanza ? "Disattiva avanzamento automatico" : "Attiva avanzamento automatico"}
            aria-pressed={autoAvanza}
            title="Avanza automaticamente dopo ogni messaggio"
          >
            &gt;
          </button>
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
    </div>
  );
}
