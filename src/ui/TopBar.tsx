import { useEffect, useRef, useState } from "react";
import { brandingPostCampagna } from "../domain/narrative";
import type { RawResourceType } from "../domain/types";
import { NOMI_RISORSA } from "./resourceNames";
import { useGameState } from "./useEngine";
import { IconCarburante, IconCrediti, IconFiducia, IconMinerale, IconQuota } from "./icons/StatIcons";
import "./TopBar.css";

const MINERALI_BASE: RawResourceType[] = ["ferro", "cristalliSilicio", "titanioStellare", "iridioQuantico", "materiaEsotica"];
// Un colore diverso per minerale, cosi' le icone (condivise) restano
// distinguibili a colpo d'occhio nella top bar.
const COLORE_MINERALE: Record<RawResourceType, string> = {
  ferro: "#c97b4a",
  cristalliSilicio: "#7bd6ff",
  titanioStellare: "#d8dde3",
  iridioQuantico: "#b06bff",
  materiaEsotica: "#ff3df2",
};

export function TopBar({ onTogglePause }: { onTogglePause: () => void }) {
  const state = useGameState();
  const { mothership, review } = state;

  // I contatori dei minerali base compaiono man mano che vengono scoperti
  // (richiesta utente), cioe' alla prima unita' mai portata in stiva: una
  // volta comparsi restano visibili anche se la stiva torna a 0 (venduti o
  // raffinati), come per i pianeti scoperti altrove nel gioco.
  const [mineraliScoperti, setMineraliScoperti] = useState<Set<RawResourceType>>(new Set());
  const mineraliScopertiRef = useRef(mineraliScoperti);
  useEffect(() => {
    const nuovi = MINERALI_BASE.filter((r) => !mineraliScopertiRef.current.has(r) && (mothership.stivaCarico[r] ?? 0) > 0);
    if (nuovi.length === 0) return;
    const aggiornato = new Set(mineraliScopertiRef.current);
    for (const r of nuovi) aggiornato.add(r);
    mineraliScopertiRef.current = aggiornato;
    setMineraliScoperti(aggiornato);
  }, [mothership.stivaCarico]);
  // B11: dopo la campagna, il marchio mostrato si adatta al finale
  // raggiunto (indipendenza/ribellione non hanno piu' senso sotto il
  // marchio OmniProfit invariato) — vedi domain/narrative.ts.
  const branding = brandingPostCampagna(state.campagna.finaleOttenuto) ?? {
    main: "OMNIPROFIT",
    sub: "GALACTIC CORPORATION™",
  };

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <span className="top-bar__brand-main">{branding.main}</span>
        <span className="top-bar__brand-sub">{branding.sub}</span>
      </div>

      <div className="top-bar__stats">
        <div className="top-bar__stat" title="Crediti disponibili">
          <IconCrediti />
          <span className="top-bar__stat-label">Cr</span>
          <span className="top-bar__stat-value">{Math.floor(state.crediti).toLocaleString("it-IT")}</span>
        </div>
        <div className="top-bar__stat" title="Carburante / capacita' serbatoio">
          <IconCarburante />
          <span className="top-bar__stat-label">Carburante</span>
          <span className="top-bar__stat-value">
            {Math.round(mothership.carburante)} / {mothership.serbatoioCapacita}
          </span>
        </div>
        <div className="top-bar__stat" title="Comandi eseguiti dall'ultima revisione / soglia prossima revisione">
          <IconQuota />
          <span className="top-bar__stat-label">Quota</span>
          <span className="top-bar__stat-value">
            {review.carteGiocateDallUltimaRevisione} / {review.sogliaCarteProssimaRevisione}
          </span>
        </div>
        <div className="top-bar__stat" title="Fiducia aziendale (0-100)">
          <IconFiducia />
          <span className="top-bar__stat-label">Fiducia</span>
          <span className="top-bar__stat-value">{review.fiducia}</span>
        </div>
        {MINERALI_BASE.filter((r) => mineraliScoperti.has(r)).map((risorsa) => (
          <div className="top-bar__stat" key={risorsa} title={`${NOMI_RISORSA[risorsa]} in stiva`}>
            <span style={{ color: COLORE_MINERALE[risorsa] }}>
              <IconMinerale />
            </span>
            <span className="top-bar__stat-label">{NOMI_RISORSA[risorsa]}</span>
            <span className="top-bar__stat-value">{Math.floor(mothership.stivaCarico[risorsa] ?? 0)}</span>
          </div>
        ))}
      </div>

      <div className="top-bar__controls">
        <button type="button" className="btn" onClick={onTogglePause}>
          {state.inPausa ? "Riprendi" : "Pausa"}
        </button>
      </div>
    </header>
  );
}
