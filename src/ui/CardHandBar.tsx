import { useState } from "react";
import { CARD_DEFINITIONS } from "../domain/cards";
import type { CardCode, CardInstance } from "../domain/types";
import { useEngine, useGameState } from "./useEngine";
import "./CardHandBar.css";

function formattaContoAllaRovescia(msResidui: number): string {
  const secondiTotali = Math.max(0, Math.ceil(msResidui / 1000));
  const minuti = Math.floor(secondiTotali / 60);
  const secondi = secondiTotali % 60;
  return `${minuti}:${secondi.toString().padStart(2, "0")}`;
}

export interface CardHandBarProps {
  cartaArmataId: string | null;
  onCliccaCarta: (carta: CardInstance) => void;
  onInizioTrascinamento: (carta: CardInstance) => void;
  onFineTrascinamento: () => void;
  /** Richiesta utente: durante un passo guidato del tutorial (Radar,
   * Investiga, Contratto minerario) solo questo codice resta utilizzabile
   * e va evidenziato; tutti gli altri comandi, l'Esplora e il cestino
   * restano visibili ma non interagibili finche' il passo non si completa. */
  cartaSbloccataCode: CardCode | null;
}

/**
 * Mano carte sempre visibile in basso (A4). Le carte con bersaglio sulla
 * mappa (Investiga, Contratto minerario, Recupera rottami) si
 * possono trascinare sul bersaglio o selezionare con un click e poi
 * cliccare il bersaglio; le carte a bersaglio "nave"/"nessuno" (Fabbrica,
 * Rifornimento) non hanno un punto da trascinare e il click propone subito
 * la conferma (vedi AppShell): Ricerca (bersaglio "nessuno", Macrostep 7) ora
 * genera cosi' +1 punto ricerca a ogni comando giocato; i progetti si
 * avviano a parte, nel pannello Ricerca, spendendo i punti accumulati. In
 * tutti i casi l'effetto si applica solo dopo conferma esplicita.
 */
export function CardHandBar({
  cartaArmataId,
  onCliccaCarta,
  onInizioTrascinamento,
  onFineTrascinamento,
  cartaSbloccataCode = null,
}: CardHandBarProps) {
  const engine = useEngine();
  const state = useGameState();
  const [cartaConTooltip, setCartaConTooltip] = useState<string | null>(null);

  const esplorazioneInCorso = state.esplorazione.completataAlMs !== null;
  const slotLibero = state.manoCarte.length < state.capacitaManoCarte;
  const avviaEsplorazione = () => {
    engine.dispatch({ id: `esplora-${Date.now()}`, type: "ui/avviaEsplorazione" });
  };

  return (
    <footer className="card-hand-bar">
      <div className="card-hand-bar__cards">
        {state.manoCarte.map((carta) => {
          const def = CARD_DEFINITIONS[carta.code];
          const tooltipAperto = cartaConTooltip === carta.instanceId;
          const armata = cartaArmataId === carta.instanceId;
          // Richiesta utente: durante un passo guidato del tutorial, solo il
          // comando indicato resta usabile; gli altri restano visibili ma
          // bloccati, cosi' il giocatore capisce subito cosa deve fare.
          const bloccataDalTutorial = cartaSbloccataCode !== null && carta.code !== cartaSbloccataCode;
          const evidenziataDalTutorial = cartaSbloccataCode !== null && carta.code === cartaSbloccataCode;
          const trascinabile =
            def.attivabile &&
            !bloccataDalTutorial &&
            def.bersaglio !== "nave" &&
            def.bersaglio !== "nessuno" &&
            def.bersaglio !== "civiltaScoperta";
          return (
            <button
              type="button"
              key={carta.instanceId}
              className={`game-card game-card--${def.categoria} ${tooltipAperto || armata ? "game-card--active" : ""} ${
                armata ? "game-card--armata" : ""
              } ${!def.attivabile ? "game-card--non-attivabile" : ""} ${bloccataDalTutorial ? "game-card--bloccata-tutorial" : ""} ${
                evidenziataDalTutorial ? "game-card--evidenziata-tutorial" : ""
              }`}
              draggable={trascinabile}
              disabled={bloccataDalTutorial}
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
                if (bloccataDalTutorial) return;
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
        {/* Carta speciale "Esplora" (richiesta utente, sostituisce la
         * generazione passiva di carte): appare con un'icona "+" quando c'e'
         * uno slot libero in mano; cliccandola avvia un conto alla rovescia
         * casuale (1-3 minuti) al termine del quale si riceve una carta
         * casuale (comuni piu' probabili delle rare). Una sola esplorazione
         * alla volta: mentre e' in corso la carta mostra il tempo residuo
         * invece della "+", e non e' cliccabile di nuovo. */}
        {(slotLibero || esplorazioneInCorso) && (
          <button
            type="button"
            className={`game-card game-card--esplora ${esplorazioneInCorso ? "game-card--esplora-attiva" : ""} ${
              cartaSbloccataCode !== null ? "game-card--bloccata-tutorial" : ""
            }`}
            onClick={avviaEsplorazione}
            disabled={esplorazioneInCorso || cartaSbloccataCode !== null}
          >
            {esplorazioneInCorso ? (
              <span className="game-card__esplora-countdown">
                {formattaContoAllaRovescia(state.esplorazione.completataAlMs! - state.tempoSimulatoMs)}
              </span>
            ) : (
              <span className="game-card__esplora-icona" aria-hidden="true">
                +
              </span>
            )}
            <span className="game-card__name">Esplora</span>
          </button>
        )}
        <div className="card-hand-bar__capacity">
          {state.manoCarte.length} / {state.capacitaManoCarte}
        </div>
      </div>
      {/* Cestino per vendere un comando dalla mano (richiesta utente: "un
       * cestino in basso a destra dove se cliccato un comando si illumina e
       * se cliccato il cestino questo comando viene cancellato"): il click
       * su una carta la seleziona gia' (stato `cartaConTooltip`, stesso
       * evidenziatore del tooltip), qui si limita a venderla. */}
      <button
        type="button"
        className="card-hand-bar__cestino"
        disabled={!cartaConTooltip || cartaSbloccataCode !== null}
        title={cartaSbloccataCode !== null ? "Non disponibile durante il tutorial guidato" : cartaConTooltip ? "Vendi il comando selezionato" : "Seleziona un comando per venderlo"}
        aria-label="Vendi il comando selezionato"
        onClick={() => {
          if (!cartaConTooltip) return;
          engine.dispatch({ id: `vendi-carta-${cartaConTooltip}-${Date.now()}`, type: "ui/vendiCartaMano", payload: { cardInstanceId: cartaConTooltip } });
          setCartaConTooltip(null);
        }}
      >
        🗑
      </button>
    </footer>
  );
}
