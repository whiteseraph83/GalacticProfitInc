import { useId, useRef, useState } from "react";
import { CIVILTA } from "../../domain/civilizations";
import { CARD_EFFECTS } from "../../domain/cardEffectsConfig";
import type { ResourceType } from "../../domain/types";
import { useEngine, useGameState } from "../useEngine";
import { NOMI_RISORSA } from "../resourceNames";
import { ConfirmModal } from "../components/ConfirmModal";

/** Pannello Civilta' (B9, Macrostep 9): relazioni locali alla regione
 * (nessun punteggio di reputazione galattica), richieste di consegna
 * tracciate automaticamente, commercio diretto con bonus di prezzo oltre
 * una soglia di relazione, dono diplomatico diretto. Azioni libere, senza
 * carta (come il mercato generico). */
export function CivilizationsPanel() {
  const engine = useEngine();
  const state = useGameState();
  const idBase = useId();
  const contatoreRef = useRef(0);
  const [quantita, setQuantita] = useState<Record<string, number>>({});
  const [civiltaDiplomaziaProposta, setCiviltaDiplomaziaProposta] = useState<string | null>(null);

  const cartaDiplomazia = state.manoCarte.find((c) => c.code === "RAR-01");
  const civilteScoperte = state.civilta.filter((c) => c.scoperta);

  const confermaDiplomaziaLampo = () => {
    if (!civiltaDiplomaziaProposta || !cartaDiplomazia) return;
    engine.dispatch({
      id: `${idBase}-diplomazia-${Date.now()}`,
      type: "ui/giocaCarta",
      payload: { cardInstanceId: cartaDiplomazia.instanceId, bersaglio: { civiltaId: civiltaDiplomaziaProposta } },
    });
    setCiviltaDiplomaziaProposta(null);
  };
  const civiltaProposta = civiltaDiplomaziaProposta ? state.civilta.find((c) => c.id === civiltaDiplomaziaProposta) : null;

  if (civilteScoperte.length === 0) {
    return (
      <section aria-label="Civilta'">
        <h2>Civilta'</h2>
        <p className="management-panel__note">Nessuna civilta' ancora rilevata in questa regione.</p>
      </section>
    );
  }

  const nextId = (prefisso: string) => {
    contatoreRef.current += 1;
    return `${idBase}-${prefisso}-${contatoreRef.current}`;
  };

  const quantitaDi = (chiave: string) => quantita[chiave] ?? 10;

  const commercia = (civiltaId: string, risorsa: ResourceType) => {
    engine.dispatch({
      id: nextId(`commercia-${civiltaId}-${risorsa}`),
      type: "ui/commerciaConCivilta",
      payload: { civiltaId, risorsa, quantita: quantitaDi(`${civiltaId}-${risorsa}`) },
    });
  };
  const inviaDono = (civiltaId: string) => {
    engine.dispatch({ id: nextId(`dono-${civiltaId}`), type: "ui/inviaDonoCivilta", payload: { civiltaId, crediti: 100 } });
  };

  return (
    <section aria-label="Civilta'">
      <h2>Civilta'</h2>
      {civilteScoperte.map((civilta) => {
        const risorsa = civilta.richiestaAttiva?.risorsa;
        const chiaveQuantita = risorsa ? `${civilta.id}-${risorsa}` : "";
        const posseduto = risorsa ? (state.mothership.stivaCarico[risorsa] ?? 0) : 0;
        return (
          <div key={civilta.id} className="research-branch">
            <h3 className="research-branch__titolo">
              {civilta.nome} - relazione {Math.round(civilta.relazione)}/100
              {civilta.relazione >= CIVILTA.sogliaBonusCommerciale ? " (bonus commerciale attivo)" : ""}
            </h3>
            {civilta.richiestaAttiva ? (
              <p className="management-panel__note">
                Richiesta: {civilta.richiestaAttiva.progresso}/{civilta.richiestaAttiva.quantita} {NOMI_RISORSA[civilta.richiestaAttiva.risorsa]}{" "}
                (ricompensa: {civilta.richiestaAttiva.ricompensaCrediti} Cr + {civilta.richiestaAttiva.ricompensaRelazione} relazione)
              </p>
            ) : (
              <p className="management-panel__note">Nessuna richiesta attiva al momento.</p>
            )}
            {risorsa && (
              <div className="fleet-list__item market-row">
                <span className="market-row__controls">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="market-row__qty"
                    value={quantitaDi(chiaveQuantita)}
                    onChange={(e) =>
                      setQuantita((prev) => ({ ...prev, [chiaveQuantita]: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))
                    }
                    aria-label={`Quantita' da vendere a ${civilta.nome}`}
                  />
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => commercia(civilta.id, risorsa)}
                    disabled={posseduto < quantitaDi(chiaveQuantita)}
                  >
                    Vendi a {civilta.nome}
                  </button>
                </span>
              </div>
            )}
            <button type="button" className="btn btn-small" onClick={() => inviaDono(civilta.id)} disabled={state.crediti < 100}>
              Invia dono diplomatico (100 Cr)
            </button>
            {cartaDiplomazia && (
              <button type="button" className="btn btn-small" onClick={() => setCiviltaDiplomaziaProposta(civilta.id)}>
                Gioca Diplomazia lampo
              </button>
            )}
          </div>
        );
      })}

      <ConfirmModal
        aperto={civiltaDiplomaziaProposta !== null}
        titolo="Gioca: Diplomazia lampo"
        dettagli={
          civiltaProposta
            ? [
                { etichetta: "Bersaglio", valore: civiltaProposta.nome },
                { etichetta: "Effetto", valore: `Relazione +${CARD_EFFECTS.diplomaziaLampo.bonusRelazione}` },
                { etichetta: "Costo", valore: "Nessuno" },
                { etichetta: "Reversibile", valore: "No" },
              ]
            : []
        }
        testoConferma="Gioca carta"
        onConferma={confermaDiplomaziaLampo}
        onAnnulla={() => setCiviltaDiplomaziaProposta(null)}
      />
    </section>
  );
}
