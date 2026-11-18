import { useId } from "react";
import { MERCATO_CARTE } from "../../domain/cardMarket";
import { CARD_DEFINITIONS } from "../../domain/cards";
import { useEngine, useGameState } from "../useEngine";

function formattaContoAllaRovescia(msResidui: number): string {
  const secondiTotali = Math.max(0, Math.ceil(msResidui / 1000));
  const minuti = Math.floor(secondiTotali / 60);
  const secondi = secondiTotali % 60;
  return `${minuti}:${secondi.toString().padStart(2, "0")}`;
}

/** Mercato delle carte (B2, Macrostep 6): rotazione ogni 15 minuti di
 * tempo simulato, con conto alla rovescia al prossimo rinnovo. Acquisto
 * diretto, bloccato se la mano e' piena. */
export function CardMarketPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();

  const prossimaRotazioneMs = state.mercatoCarte.ultimaRotazioneMs + MERCATO_CARTE.intervalloRotazioneMs - state.tempoSimulatoMs;

  const acquista = (slotId: string) =>
    engine.dispatch({ id: `${idBase}-acquista-${slotId}-${Date.now()}`, type: "ui/acquistaCartaMercato", payload: { slotId } });

  return (
    <section aria-label="Catalogo comandi">
      <h2>Catalogo comandi</h2>
      <p className="management-panel__note">Rinnovo tra: {formattaContoAllaRovescia(prossimaRotazioneMs)}</p>
      <ul className="fleet-list">
        {state.mercatoCarte.slots.map((slot) => {
          const def = CARD_DEFINITIONS[slot.code];
          return (
            <li className="fleet-list__item" key={slot.id}>
              <span className="fleet-list__name">
                {def.nome}
                <span className="market-row__detail">{slot.prezzo} Cr</span>
              </span>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => acquista(slot.id)}
                disabled={state.crediti < slot.prezzo || state.manoCarte.length >= state.capacitaManoCarte}
              >
                Compra
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
