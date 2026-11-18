import { useEffect } from "react";
import type { CardDefinition } from "../../domain/types";
import "./CardActionFlash.css";

export interface CardActionFlashProps {
  categoria: CardDefinition["categoria"];
  onFine: () => void;
}

/**
 * Lampo a schermo intero al momento dell'applicazione di una carta (B11,
 * richiesta utente: "crea animazione grafica per ogni azione che viene
 * fatta con le carte"). Un colore laser diverso per categoria, puramente
 * decorativo (nessun dato di gioco): si autodistrugge dopo l'animazione.
 * `prefers-reduced-motion` la salta del tutto via CSS (durata ~0).
 */
export function CardActionFlash({ categoria, onFine }: CardActionFlashProps) {
  useEffect(() => {
    const timer = window.setTimeout(onFine, 450);
    return () => window.clearTimeout(timer);
  }, [onFine]);

  return <div className={`card-action-flash card-action-flash--${categoria}`} aria-hidden="true" />;
}
