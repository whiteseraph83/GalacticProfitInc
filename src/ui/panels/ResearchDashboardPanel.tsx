import { RAMI_RICERCA, SLOT_RICERCA_BASE, TECNOLOGIE, calcolaBonusRicerca } from "../../domain/research";
import type { RamoRicerca } from "../../domain/types";
import { useGameState } from "../useEngine";

const NOME_RAMO: Record<RamoRicerca, string> = {
  esplorazione: "Esplorazione",
  industria: "Industria",
  logistica: "Logistica",
  economia: "Economia",
};

/** Dashboard Ricerca compatta per la barra laterale: solo le tecnologie
 * gia' completate (raggruppate per ramo) e lo stato degli slot progetto,
 * in sola lettura. Avviare nuove ricerche richiede il pannello completo
 * (bottone dedicato "Ricerca", vedi AppShell), spostato li' su richiesta
 * per lasciare la barra laterale piu' snella. */
export function ResearchDashboardPanel() {
  const state = useGameState();
  const slotMax = SLOT_RICERCA_BASE + calcolaBonusRicerca(state.ricerca.completate).slotRicercaBonus;

  return (
    <section aria-label="Ricerche scoperte">
      <h2>Ricerca</h2>
      <p className="management-panel__note">
        Progetti attivi: {state.ricerca.progettiAttivi.length}/{slotMax} · Completate: {state.ricerca.completate.length}/
        {Object.keys(TECNOLOGIE).length}
      </p>
      {RAMI_RICERCA.map((ramo) => {
        const completateRamo = Object.values(TECNOLOGIE).filter((t) => t.ramo === ramo && state.ricerca.completate.includes(t.id));
        if (completateRamo.length === 0) return null;
        return (
          <div key={ramo} className="research-branch">
            <h3 className="research-branch__titolo">{NOME_RAMO[ramo]}</h3>
            <ul className="fleet-list">
              {completateRamo.map((t) => (
                <li className="fleet-list__item" key={t.id}>
                  <span className="fleet-list__name">{t.nome}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {state.ricerca.completate.length === 0 && <p className="fleet-list__empty">Nessuna ricerca completata.</p>}
    </section>
  );
}
