import { useRef, useState, type ChangeEvent } from "react";
import { useEngine, useGameState } from "../useEngine";
import { validaStato, creaStatoIniziale } from "../../domain/initialState";
import { persistenceAdapter } from "../../persistence/indexedDbAdapter";
import { SAVE_SCHEMA_VERSION, type SaveFile } from "../../persistence/types";
import { ConfirmModal } from "../components/ConfirmModal";
import { DirectorArchivePanel } from "./DirectorArchivePanel";
import type { GameState } from "../../domain/types";

function formattaOra(data: Date): string {
  return data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Controlli di salvataggio (B1/Macrostep 5): indicatore autosave, export e
 * import JSON manuali. L'autosave gira ogni 30s a pagina aperta + su eventi
 * importanti; chiudere la pagina interrompe tutto, nessun tempo viene mai
 * simulato a posteriori al prossimo avvio. */
export interface SavePanelProps {
  onNuovaPartita?: () => void;
  /** Istante dell'ultimo autosave riuscito, calcolato in AppShell (richiesta
   * utente: il salvataggio non funzionava perche' l'hook useAutosave girava
   * solo mentre questo pannello era montato, cioe' solo a overlay
   * Impostazioni aperto — ora gira sempre, qui si riceve solo il valore da
   * mostrare). */
  ultimoSalvataggio: Date | null;
}

export function SavePanel({ onNuovaPartita, ultimoSalvataggio }: SavePanelProps) {
  const engine = useEngine();
  const state = useGameState();
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [importProposto, setImportProposto] = useState<GameState | null>(null);
  const [erroreImport, setErroreImport] = useState<string | null>(null);
  const [nuovaPartitaProposta, setNuovaPartitaProposta] = useState(false);

  const esporta = () => {
    const save: SaveFile = { schemaVersion: SAVE_SCHEMA_VERSION, salvatoIl: new Date().toISOString(), state };
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `galactic-profit-inc-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const apriSelettoreFile = () => inputFileRef.current?.click();

  const gestisciFileSelezionato = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErroreImport(null);
    try {
      const testo = await file.text();
      const parsed = JSON.parse(testo) as Partial<SaveFile>;
      if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION || !parsed.state) {
        setErroreImport("File non valido o di una versione incompatibile.");
        return;
      }
      const problemi = validaStato(parsed.state);
      if (problemi.length > 0) {
        setErroreImport(`Salvataggio non valido: ${problemi[0]}.`);
        return;
      }
      setImportProposto(parsed.state);
    } catch {
      setErroreImport("Impossibile leggere il file (non e' un JSON valido).");
    }
  };

  const confermaImport = () => {
    if (!importProposto) return;
    engine.caricaStato(importProposto);
    void persistenceAdapter.salva({ schemaVersion: SAVE_SCHEMA_VERSION, salvatoIl: new Date().toISOString(), state: importProposto });
    setImportProposto(null);
  };

  const confermaNuovaPartita = () => {
    const nuovoStato = creaStatoIniziale(`carriera-${Date.now()}`);
    engine.caricaStato(nuovoStato);
    void persistenceAdapter.salva({ schemaVersion: SAVE_SCHEMA_VERSION, salvatoIl: new Date().toISOString(), state: nuovoStato });
    setNuovaPartitaProposta(false);
    onNuovaPartita?.();
  };

  return (
    <section aria-label="Salvataggio">
      <h2>Salvataggio</h2>
      <p className="management-panel__note" style={{ borderColor: "var(--border-faint)", color: "var(--text-muted)" }}>
        {ultimoSalvataggio ? `Ultimo autosave: ${formattaOra(ultimoSalvataggio)}` : "Autosave non ancora eseguito."}
      </p>
      <button type="button" className="btn" onClick={esporta}>
        Esporta salvataggio (JSON)
      </button>
      <button type="button" className="btn" onClick={apriSelettoreFile}>
        Importa salvataggio (JSON)
      </button>
      <input ref={inputFileRef} type="file" accept="application/json" className="sr-only" onChange={gestisciFileSelezionato} />
      {erroreImport && <p className="management-panel__note">{erroreImport}</p>}
      <button type="button" className="btn" onClick={() => setNuovaPartitaProposta(true)}>
        Ricomincia partita
      </button>
      <DirectorArchivePanel />

      <ConfirmModal
        aperto={importProposto !== null}
        titolo="Importa salvataggio"
        dettagli={[
          { etichetta: "Effetto", valore: "Sostituisce la partita corrente con quella importata" },
          { etichetta: "Reversibile", valore: "No" },
        ]}
        testoConferma="Importa e sostituisci"
        onConferma={confermaImport}
        onAnnulla={() => setImportProposto(null)}
      />

      <ConfirmModal
        aperto={nuovaPartitaProposta}
        titolo="Ricomincia partita"
        dettagli={[
          { etichetta: "Effetto", valore: "Abbandona la carriera corrente e ne avvia una nuova da zero" },
          { etichetta: "Reversibile", valore: "No" },
        ]}
        testoConferma="Ricomincia da zero"
        onConferma={confermaNuovaPartita}
        onAnnulla={() => setNuovaPartitaProposta(false)}
      />
    </section>
  );
}
