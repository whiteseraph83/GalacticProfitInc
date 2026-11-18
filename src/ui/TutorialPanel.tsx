import { useState } from "react";
import { useGameState } from "./useEngine";

function cargoTotale(carico: Partial<Record<string, number>>): number {
  return Object.values(carico).reduce((somma: number, q) => somma + (q ?? 0), 0);
}

/** Tutorial non invasivo (B6: "poche istruzioni... garantire che chi gioca
 * non rimanga costretto a una sequenza rigida"): un checklist informativo,
 * sempre ignorabile/richiudibile, senza bloccare nessuna azione. Le 4
 * carte extra garantite (B6) arrivano dalle missioni introduttive generate
 * con la regione (vedi src/world/missionGenerator.ts), non da qui: questo
 * pannello si limita a mostrare il progresso dei passi suggeriti. */
export function TutorialPanel() {
  const state = useGameState();
  // Chiusa di default (richiesta utente: "a inizio gioco... chiudi in
  // automatico il menu e fai partire il primo dialogo"): l'onboarding
  // principale e' ora l'overlay narrativo a comparsa (vedi
  // `src/ui/hooks/useNpcChatter.ts`), questo checklist resta disponibile
  // solo per chi lo riapre volontariamente.
  const [chiuso, setChiuso] = useState(true);

  const passi = [
    { fatto: true, testo: "Scopri un pianeta (gia' fatto: l'area sicura iniziale ne rivela alcuni)" },
    { fatto: state.pianeti.some((p) => p.investigato), testo: "Investiga un pianeta scoperto (comando Investiga)" },
    { fatto: state.contrattiMinerari.length > 0, testo: "Avvia un contratto minerario (comando Contratto minerario)" },
    { fatto: cargoTotale(state.mothership.stivaCarico) > 0, testo: "Ricevi la prima consegna in stiva (automatico, via navetta)" },
    { fatto: state.contabilita.ricaviTotali > 0, testo: "Vendi qualcosa al mercato" },
  ];

  if (chiuso) return null;
  const completati = passi.filter((p) => p.fatto).length;

  return (
    <div className="tutorial-panel" role="complementary" aria-label="Guida introduttiva">
      <div className="tutorial-panel__header">
        <strong>Guida introduttiva ({completati}/{passi.length})</strong>
        <button type="button" className="btn btn-small" onClick={() => setChiuso(true)}>
          Chiudi
        </button>
      </div>
      <ul className="tutorial-panel__list">
        {passi.map((p, i) => (
          <li key={i} className={p.fatto ? "tutorial-panel__step tutorial-panel__step--fatto" : "tutorial-panel__step"}>
            {p.fatto ? "✓" : "○"} {p.testo}
          </li>
        ))}
      </ul>
      <p className="tutorial-panel__nota">
        Solo un suggerimento: puoi ignorarlo e procedere come preferisci, anche nelle missioni secondarie disponibili.
      </p>
    </div>
  );
}
