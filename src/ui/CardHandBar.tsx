import { useState } from "react";
import { CARD_DEFINITIONS } from "../domain/cards";
import type { CardInstance } from "../domain/types";
import { useGameState } from "./useEngine";
import "./CardHandBar.css";

export interface CardHandBarProps {
  cartaArmataId: string | null;
  onCliccaCarta: (carta: CardInstance) => void;
  onInizioTrascinamento: (carta: CardInstance) => void;
  onFineTrascinamento: () => void;
}

/**
 * Mano carte sempre visibile in basso (A4). Le carte con bersaglio sulla
 * mappa (Esplora, Investiga, Contratto minerario, Recupera rottami) si
 * possono trascinare sul bersaglio o selezionare con un click e poi
 * cliccare il bersaglio; le carte a bersaglio "nave"/"nessuno" (Fabbrica,
 * Rifornimento) non hanno un punto da trascinare e il click propone subito
 * la conferma (vedi AppShell). Ricerca (bersaglio "progettoRicerca",
 * Macrostep 7) non ha nemmeno un punto da trascinare: il progetto si
 * sceglie nel pannello Ricerca, che gioca la carta direttamente. In tutti i
 * casi l'effetto si applica solo dopo conferma esplicita.
 */
export function CardHandBar({ cartaArmataId, onCliccaCarta, onInizioTrascinamento, onFineTrascinamento }: CardHandBarProps) {
  const state = useGameState();
  const [cartaConTooltip, setCartaConTooltip] = useState<string | null>(null);

  return (
    <footer className="card-hand-bar">
      <div className="card-hand-bar__cards">
        {state.manoCarte.map((carta) => {
          const def = CARD_DEFINITIONS[carta.code];
          const tooltipAperto = cartaConTooltip === carta.instanceId;
          const armata = cartaArmataId === carta.instanceId;
          const trascinabile =
            def.attivabile &&
            def.bersaglio !== "nave" &&
            def.bersaglio !== "nessuno" &&
            def.bersaglio !== "progettoRicerca" &&
            def.bersaglio !== "civiltaScoperta";
          return (
            <button
              type="button"
              key={carta.instanceId}
              className={`game-card game-card--${def.categoria} ${tooltipAperto || armata ? "game-card--active" : ""} ${
                armata ? "game-card--armata" : ""
              } ${!def.attivabile ? "game-card--non-attivabile" : ""}`}
              draggable={trascinabile}
              onDragStart={(e) => {
                if (!trascinabile) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData("text/plain", carta.instanceId);
                e.dataTransfer.effectAllowed = "move";
                onInizioTrascinamento(carta);
              }}
              onDragEnd={onFineTrascinamento}
              onClick={() => {
                setCartaConTooltip(tooltipAperto ? null : carta.instanceId);
                if (def.attivabile) onCliccaCarta(carta);
              }}
              aria-expanded={tooltipAperto}
              aria-pressed={armata}
            >
              <span className="game-card__code">{def.code}</span>
              <span className="game-card__name">{def.nome}</span>
              <span className="game-card__level">Lv.{carta.livello}</span>
              {tooltipAperto && (
                <span className="game-card__tooltip">
                  {def.descrizione}
                  {!def.attivabile && <strong className="game-card__tooltip-nota"> Non ancora attivabile.</strong>}
                </span>
              )}
            </button>
          );
        })}
        <div className="card-hand-bar__capacity">
          {state.manoCarte.length} / {state.capacitaManoCarte}
        </div>
      </div>
    </footer>
  );
}
