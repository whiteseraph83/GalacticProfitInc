import { useMemo, useState } from "react";
import { useEngine, useGameState } from "./useEngine";
import { persistenceAdapter } from "../persistence/indexedDbAdapter";
import { SAVE_SCHEMA_VERSION } from "../persistence/types";
import type { VoceArchivioDirettore } from "../persistence/types";
import { creaStatoIniziale } from "../domain/initialState";
import { VANTAGGI_EREDITATI } from "../domain/legacy";
import { SeededRng } from "../domain/rng";

/** Sorteggia 3 vantaggi ereditati distinti (B11: "scelta di 1 tra 3 piccoli
 * vantaggi casuali ereditati"), deterministici per seed cosi' il risultato
 * non cambia a ogni re-render prima della scelta. */
function sorteggiaVantaggi(seed: string): string[] {
  const rng = new SeededRng(`${seed}|vantaggi`);
  const tutti = Object.keys(VANTAGGI_EREDITATI);
  const scelti: string[] = [];
  const disponibili = [...tutti];
  while (scelti.length < 3 && disponibili.length > 0) {
    const indice = rng.nextInt(0, disponibili.length - 1);
    scelti.push(disponibili[indice]);
    disponibili.splice(indice, 1);
  }
  return scelti;
}

/** Schermata di Game Over (B3/G1): la partita puo' terminare per bancarotta
 * da decisioni sbagliate (mancato pagamento della quota entro la
 * tolleranza). Blocca l'interazione col resto dell'interfaccia. Prima di
 * iniziare una nuova carriera (B11): archivia la carriera conclusa
 * nell'archivio direttori e propone 1 scelta tra 3 piccoli vantaggi
 * ereditati casuali. */
export function GameOverOverlay() {
  const engine = useEngine();
  const state = useGameState();
  const [vantaggioScelto, setVantaggioScelto] = useState<string | null>(null);
  const vantaggiProposti = useMemo(() => (state.gameOver ? sorteggiaVantaggi(state.seed) : []), [state.gameOver, state.seed]);

  if (!state.gameOver) return null;

  const confermaNuovaCarriera = async () => {
    const voce: VoceArchivioDirettore = {
      id: `direttore-${state.seed}-${Date.now()}`,
      seed: state.seed,
      concludutaIl: new Date().toISOString(),
      motivoFine: "gameOver",
      finaleNarrativoId: state.campagna.finaleOttenuto,
      vantaggioEreditatoScelto: vantaggioScelto,
      statistiche: {
        creditiFinali: state.crediti,
        numeroRegioniVisitate: state.numeroRegione,
        carteGiocateTotali: state.review.carteGiocateTotali,
        revisioniPagate: state.review.numeroRevisioniPagate,
        tempoSimulatoMs: state.tempoSimulatoMs,
      },
    };
    await persistenceAdapter.archiviaDirettore(voce);

    const nuovoSeed = `carriera-${Date.now()}`;
    const nuovoStato = creaStatoIniziale(nuovoSeed, vantaggioScelto ?? undefined);
    await persistenceAdapter.salva({ schemaVersion: SAVE_SCHEMA_VERSION, salvatoIl: new Date().toISOString(), state: nuovoStato });
    engine.caricaStato(nuovoStato);
  };

  return (
    <div className="game-over-overlay" role="alertdialog" aria-modal="true" aria-label="Game Over">
      <div className="game-over-overlay__box">
        <h1>GAME OVER</h1>
        <p>{state.gameOver.motivo}</p>
        <p className="management-panel__note">
          Carte giocate: {state.review.carteGiocateTotali} · Revisioni pagate: {state.review.numeroRevisioniPagate}
        </p>

        <h2 className="ending-overlay__titolo">Scegli un vantaggio per la prossima carriera</h2>
        <ul className="fleet-list">
          {vantaggiProposti.map((id) => {
            const def = VANTAGGI_EREDITATI[id];
            return (
              <li className="fleet-list__item" key={id}>
                <span className="fleet-list__name">
                  {def.nome}
                  <span className="market-row__detail">{def.descrizione}</span>
                </span>
                <button
                  type="button"
                  className={`btn btn-small ${vantaggioScelto === id ? "btn-primary" : ""}`}
                  onClick={() => setVantaggioScelto(id)}
                >
                  {vantaggioScelto === id ? "Scelto" : "Scegli"}
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" className="btn btn-primary" disabled={!vantaggioScelto} onClick={() => void confermaNuovaCarriera()}>
          Nuova carriera
        </button>
      </div>
    </div>
  );
}
