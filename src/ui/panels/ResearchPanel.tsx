import { useId, useState } from "react";
import { RAMI_RICERCA, SLOT_RICERCA_BASE, TECNOLOGIE, calcolaBonusRicerca } from "../../domain/research";
import type { RamoRicerca } from "../../domain/types";
import { ConfirmModal } from "../components/ConfirmModal";
import { useEngine, useGameState } from "../useEngine";

const NOME_RAMO: Record<RamoRicerca, string> = {
  esplorazione: "Esplorazione",
  industria: "Industria",
  logistica: "Logistica",
  economia: "Economia",
};

function formattaContoAllaRovescia(msResidui: number): string {
  const secondiTotali = Math.max(0, Math.ceil(msResidui / 1000));
  const minuti = Math.floor(secondiTotali / 60);
  const secondi = secondiTotali % 60;
  return `${minuti}:${secondi.toString().padStart(2, "0")}`;
}

/** Pannello Ricerca (B2, Macrostep 7): quattro rami, un progetto
 * contemporaneo iniziale (slot aggiuntivi via ricerca). Richiesta utente:
 * "per avviare una ricerca ora servono punti ricerca che incrementano
 * quando si clicca sull'azione ricerca" — giocare il comando Ricerca
 * (RSH-01) genera +1 punto ricerca (dispacciato da CardHandBar/AppShell
 * come qualunque altra carta a bersaglio "nessuno"); avviare un progetto
 * e' invece un'azione separata di questo pannello (`ui/avviaRicerca`), che
 * spende i punti accumulati oltre ai crediti, senza consumare altre carte. */
export function ResearchPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();
  const [tecnologiaProposta, setTecnologiaProposta] = useState<string | null>(null);

  const tecnologia = tecnologiaProposta ? TECNOLOGIE[tecnologiaProposta] : null;
  const slotMax = SLOT_RICERCA_BASE + calcolaBonusRicerca(state.ricerca.completate).slotRicercaBonus;
  const slotLibero = state.ricerca.progettiAttivi.length < slotMax;

  const confermaRicerca = () => {
    if (!tecnologiaProposta) return;
    engine.dispatch({
      id: `${idBase}-ricerca-${Date.now()}`,
      type: "ui/avviaRicerca",
      payload: { tecnologiaId: tecnologiaProposta },
    });
    setTecnologiaProposta(null);
  };

  return (
    <section aria-label="Ricerca">
      <h2>Ricerca</h2>
      <p className="management-panel__note">
        Punti ricerca: {state.ricerca.puntiRicerca} · Progetti attivi: {state.ricerca.progettiAttivi.length}/{slotMax}
      </p>
      {RAMI_RICERCA.map((ramo) => (
        <div key={ramo} className="research-branch">
          <h3 className="research-branch__titolo">{NOME_RAMO[ramo]}</h3>
          <ul className="fleet-list">
            {Object.values(TECNOLOGIE)
              .filter((t) => t.ramo === ramo)
              .map((t) => {
                const completata = state.ricerca.completate.includes(t.id);
                const progettoAttivo = state.ricerca.progettiAttivi.find((p) => p.tecnologiaId === t.id);
                const prerequisitiMancanti = t.prerequisiti.filter((id) => !state.ricerca.completate.includes(id));

                let stato: string;
                if (completata) stato = "Completata";
                else if (progettoAttivo) stato = `In corso: ${formattaContoAllaRovescia(progettoAttivo.fineMs - state.tempoSimulatoMs)}`;
                else if (prerequisitiMancanti.length > 0) stato = `Richiede: ${prerequisitiMancanti.map((id) => TECNOLOGIE[id]?.nome ?? id).join(", ")}`;
                else stato = `${t.costoCrediti} Cr + ${t.costoPuntiRicerca} punti ricerca · ${Math.round(t.durataMs / 60000)} min`;

                const disponibile = !completata && !progettoAttivo && prerequisitiMancanti.length === 0;

                return (
                  <li className="fleet-list__item research-row" key={t.id}>
                    <span className="fleet-list__name">
                      {t.nome}
                      <span className="market-row__detail">{t.descrizione}</span>
                      <span className="market-row__detail">{stato}</span>
                    </span>
                    {disponibile && (
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => setTecnologiaProposta(t.id)}
                        disabled={state.crediti < t.costoCrediti || state.ricerca.puntiRicerca < t.costoPuntiRicerca || !slotLibero}
                      >
                        Avvia
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      <ConfirmModal
        aperto={tecnologiaProposta !== null}
        titolo={tecnologia ? `Avvia ricerca: ${tecnologia.nome}` : ""}
        dettagli={
          tecnologia
            ? [
                { etichetta: "Ramo", valore: NOME_RAMO[tecnologia.ramo] },
                { etichetta: "Effetto", valore: tecnologia.descrizione },
                { etichetta: "Costo", valore: `${tecnologia.costoCrediti} Cr + ${tecnologia.costoPuntiRicerca} punti ricerca (dedotti subito)` },
                { etichetta: "Durata", valore: `${Math.round(tecnologia.durataMs / 60000)} minuti` },
                { etichetta: "Reversibile", valore: "No" },
              ]
            : []
        }
        testoConferma="Avvia ricerca"
        onConferma={confermaRicerca}
        onAnnulla={() => setTecnologiaProposta(null)}
      />
    </section>
  );
}
