import { useId, useRef, useState } from "react";
import { PREZZI_BASE } from "../../domain/market";
import type { ResourceType } from "../../domain/types";
import { useEngine, useGameState } from "../useEngine";
import { NOMI_RISORSA } from "../resourceNames";

export interface MarketPanelProps {
  /** Materiali mai posseduti in stiva (richiesta utente): le relative righe
   * di mercato restano nascoste finche' non vengono incontrati per la
   * prima volta, per non ingombrare la lista con risorse non ancora
   * rilevanti per la partita in corso. */
  risorseMaiPossedute: Set<ResourceType>;
}

/** Mercato (B3, confermato): transazioni sempre manuali, prezzi che
 * fluttuano gradualmente ogni 5 minuti di tempo attivo. Acquisti e vendite
 * sono azioni dirette (non richiedono carte, come le rotte cargo o la coda
 * di raffinazione: B2) con quantita' intere e saldo mai negativo. */
export function MarketPanel({ risorseMaiPossedute }: MarketPanelProps) {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();
  const contatoreRef = useRef(0);
  const [quantita, setQuantita] = useState<Partial<Record<ResourceType, number>>>({});

  const quantitaDi = (risorsa: ResourceType) => quantita[risorsa] ?? 10;
  const nextId = (prefisso: string) => {
    contatoreRef.current += 1;
    return `${idBase}-${prefisso}-${contatoreRef.current}`;
  };

  const vendi = (risorsa: ResourceType) => {
    engine.dispatch({ id: nextId(`vendi-${risorsa}`), type: "ui/vendiRisorsa", payload: { risorsa, quantita: quantitaDi(risorsa) } });
  };
  const acquista = (risorsa: ResourceType) => {
    engine.dispatch({ id: nextId(`acquista-${risorsa}`), type: "ui/acquistaRisorsa", payload: { risorsa, quantita: quantitaDi(risorsa) } });
  };

  return (
    <section aria-label="Mercato">
      <h2>Mercato</h2>
      {risorseMaiPossedute.size === 0 && <p className="fleet-list__empty">Nessun materiale ancora incontrato in partita.</p>}
      <ul className="fleet-list">
        {(Object.keys(PREZZI_BASE) as ResourceType[])
          .filter((risorsa) => risorseMaiPossedute.has(risorsa))
          .map((risorsa) => {
          const prezzo = state.mercato.prezzi[risorsa] ?? PREZZI_BASE[risorsa];
          const posseduto = state.mothership.stivaCarico[risorsa] ?? 0;
          return (
            <li className="fleet-list__item market-row" key={risorsa}>
              <span className="fleet-list__name">
                {NOMI_RISORSA[risorsa]}
                <span className="market-row__detail">
                  {Math.round(prezzo)} Cr/u · {posseduto} in stiva
                </span>
              </span>
              <span className="market-row__controls">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="market-row__qty"
                  value={quantitaDi(risorsa)}
                  onChange={(e) => setQuantita((prev) => ({ ...prev, [risorsa]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))}
                  aria-label={`Quantita' per ${NOMI_RISORSA[risorsa]}`}
                />
                <button type="button" className="btn btn-small" onClick={() => vendi(risorsa)} disabled={posseduto < quantitaDi(risorsa)}>
                  Vendi
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => acquista(risorsa)}
                  disabled={state.crediti < prezzo * quantitaDi(risorsa)}
                >
                  Compra
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
