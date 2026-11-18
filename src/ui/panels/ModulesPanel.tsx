import { useId } from "react";
import { MODULO_DEFINITIONS } from "../../domain/modules";
import { SLOT_MODULO_BASE, calcolaBonusRicerca } from "../../domain/research";
import { useEngine, useGameState } from "../useEngine";

/** Pannello Moduli (B2, Macrostep 7): "moduli craftabili solo con fabbrica,
 * uno slot per nave iniziale, massimo due via ricerca; remote equip/unequip
 * garantendo unicita'". Azione libera, senza carta (come l'acquisto nave e
 * la coda di raffinazione), nessun ConfirmModal: craft/equip/rimuovi sono
 * reversibili e a basso impatto rispetto a un acquisto o una carta. */
export function ModulesPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();

  const slotMax = SLOT_MODULO_BASE + calcolaBonusRicerca(state.ricerca.completate).slotModuloBonus;

  const craft = (moduloId: string) =>
    engine.dispatch({ id: `${idBase}-craft-${moduloId}-${Date.now()}`, type: "ui/craftModulo", payload: { moduloId } });
  const equipaggia = (moduloInstanceId: string, naveMinerariaId: string) =>
    engine.dispatch({
      id: `${idBase}-equip-${moduloInstanceId}-${Date.now()}`,
      type: "ui/equipaggiaModulo",
      payload: { moduloInstanceId, naveMinerariaId },
    });
  const rimuovi = (moduloInstanceId: string) =>
    engine.dispatch({ id: `${idBase}-unequip-${moduloInstanceId}-${Date.now()}`, type: "ui/rimuoviModulo", payload: { moduloInstanceId } });

  if (!state.fabbrica.costruita) {
    return (
      <section aria-label="Moduli">
        <h2>Moduli</h2>
        <p className="management-panel__note">Richiede una fabbrica costruita (comando Fabbrica).</p>
      </section>
    );
  }

  const inMagazzino = state.moduli.filter((m) => m.naveMinerariaId === null);

  return (
    <section aria-label="Moduli">
      <h2>Moduli</h2>
      <ul className="fleet-list">
        {Object.values(MODULO_DEFINITIONS).map((def) => {
          const costoRisorse = Object.entries(def.costoRisorsaRaffinata)
            .map(([risorsa, quantita]) => `${quantita} ${risorsa}`)
            .join(", ");
          return (
            <li className="fleet-list__item" key={def.id}>
              <span className="fleet-list__name">
                {def.nome}
                <span className="market-row__detail">
                  +{def.bonusEstrazioneAlMinuto} estrazione/min · {def.costoCrediti} Cr + {costoRisorse}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => craft(def.id)}
                disabled={state.crediti < def.costoCrediti}
              >
                Produci
              </button>
            </li>
          );
        })}
      </ul>

      {state.naviMinerarie.map((nave, indice) => {
        const equipaggiati = state.moduli.filter((m) => m.naveMinerariaId === nave.id);
        return (
          <div key={nave.id} className="research-branch">
            <h3 className="research-branch__titolo">
              Nave mineraria {indice + 1} ({equipaggiati.length}/{slotMax} slot)
            </h3>
            <ul className="fleet-list">
              {equipaggiati.map((m) => (
                <li className="fleet-list__item" key={m.instanceId}>
                  <span className="fleet-list__name">{MODULO_DEFINITIONS[m.definizioneId]?.nome ?? m.definizioneId}</span>
                  <button type="button" className="btn btn-small" onClick={() => rimuovi(m.instanceId)}>
                    Rimuovi
                  </button>
                </li>
              ))}
              {equipaggiati.length === 0 && <li className="fleet-list__empty">Nessun modulo equipaggiato.</li>}
            </ul>
            {equipaggiati.length < slotMax &&
              inMagazzino.map((m) => (
                <button
                  type="button"
                  key={`${nave.id}-${m.instanceId}`}
                  className="btn btn-small"
                  onClick={() => equipaggia(m.instanceId, nave.id)}
                >
                  Equipaggia {MODULO_DEFINITIONS[m.definizioneId]?.nome ?? m.definizioneId}
                </button>
              ))}
          </div>
        );
      })}
    </section>
  );
}
