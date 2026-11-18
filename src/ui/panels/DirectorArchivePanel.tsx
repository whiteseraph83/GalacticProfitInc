import { useState } from "react";
import { persistenceAdapter } from "../../persistence/indexedDbAdapter";
import type { VoceArchivioDirettore } from "../../persistence/types";
import { FINALI } from "../../domain/narrative";

function formattaData(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { year: "numeric", month: "short", day: "numeric" });
}

function formattaDurata(ms: number): string {
  const minuti = Math.floor(ms / 60000);
  const ore = Math.floor(minuti / 60);
  return ore > 0 ? `${ore}h ${minuti % 60}min` : `${minuti}min`;
}

/** Archivio direttori (B11: "archivio direttori, statistiche, traguardi
 * persistenti"): elenco di sola lettura delle carriere concluse, caricato
 * su richiesta (non serve tenerlo sempre in memoria). */
export function DirectorArchivePanel() {
  const [aperto, setAperto] = useState(false);
  const [voci, setVoci] = useState<VoceArchivioDirettore[] | null>(null);

  const apri = async () => {
    setAperto(true);
    const elenco = await persistenceAdapter.elencoArchivioDirettori();
    setVoci(elenco.slice().sort((a, b) => b.concludutaIl.localeCompare(a.concludutaIl)));
  };

  if (!aperto) {
    return (
      <button type="button" className="btn" onClick={() => void apri()}>
        Archivio direttori
      </button>
    );
  }

  return (
    <section aria-label="Archivio direttori">
      <h2>Archivio direttori</h2>
      <button type="button" className="btn btn-small" onClick={() => setAperto(false)}>
        Chiudi archivio
      </button>
      {voci === null && <p className="management-panel__note">Caricamento...</p>}
      {voci !== null && voci.length === 0 && <p className="fleet-list__empty">Nessuna carriera conclusa ancora.</p>}
      <ul className="fleet-list">
        {voci?.map((voce, indice) => (
          <li className="fleet-list__item mission-row" key={voce.id}>
            <span className="fleet-list__name">
              Direttore #{voci.length - indice} — {formattaData(voce.concludutaIl)}
              <span className="market-row__detail">
                {voce.finaleNarrativoId ? (FINALI[voce.finaleNarrativoId]?.titolo ?? voce.finaleNarrativoId) : "Game Over"}
              </span>
              <span className="market-row__detail">
                {voce.statistiche.creditiFinali} Cr · regione {voce.statistiche.numeroRegioniVisitate} · {voce.statistiche.carteGiocateTotali} comandi
                eseguiti · {voce.statistiche.revisioniPagate} revisioni pagate · {formattaDurata(voce.statistiche.tempoSimulatoMs)} di servizio
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
