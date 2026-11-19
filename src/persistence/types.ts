import type { GameState } from "../domain/types";

// Layer di persistenza (IndexedDB, Macrostep 5). Un solo save "carriera
// attiva" per volta (B1/A1: "un save carriera attivo"). Nessuna
// simulazione del tempo trascorso a pagina chiusa: il salvataggio
// restituisce esattamente lo stato dell'ultimo autosave, e la ripresa
// riparte da li' senza integrare alcun delta di tempo reale.
//
// Versionamento (B11, Macrostep 11: "salvataggi versionati"): la strategia
// scelta e' una validazione strutturale (`validaStato`) invece di
// migrazioni campo-per-campo — piu' semplice e gia' verificata in pratica
// (un salvataggio di uno schema precedente viene rifiutato in sicurezza, A2
// gia' lo richiede: mai uno stato parzialmente valido). schemaVersion resta
// comunque incrementato quando la forma dello stato cambia in modo
// sostanziale, cosi' un salvataggio esplicitamente incompatibile puo'
// essere scartato prima ancora di validarne i campi.
// Portato a 3 (richiesta utente, bug "Punti ricerca: NaN"): questa sessione
// ha aggiunto piu' campi obbligatori allo stato (RicercaState.puntiRicerca,
// ShuttleEntity.pianetaInvestigazioneId) senza incrementare la versione.
// Un salvataggio catturato prima di questi campi aveva comunque
// schemaVersion 2 (identica), quindi veniva accettato e ricaricato con quei
// campi `undefined` — da cui il NaN (`undefined + 1`). Incrementare qui
// scarta in sicurezza quei salvataggi incompatibili, facendo ripartire una
// nuova carriera invece di uno stato corrotto.
// Portato a 4: questo stesso giro ha aggiunto altri campi obbligatori dopo
// il bump a 3 (Planet.sempreVisibile, GameState.esplorazione al posto di
// ultimaGenerazioneCarteMs) — un salvataggio autosalvato nel frattempo (con
// l'autosave appena riattivato) andava in NaN/undefined allo stesso modo.
// Portato a 5: aggiunto ContabilitaState.venditeTotali (trigger reale della
// scena di tutorial "prima vendita", richiesta utente).
export const SAVE_SCHEMA_VERSION = 5;

export interface SaveFile {
  schemaVersion: number;
  salvatoIl: string; // ISO date
  state: GameState;
}

/** Riepilogo di una carriera conclusa (B11: "archivio direttori,
 * statistiche, traguardi persistenti"), salvato separatamente dalla
 * carriera attiva: la carriera finita non e' piu' giocabile, resta solo
 * come record storico. */
export interface VoceArchivioDirettore {
  id: string;
  seed: string;
  concludutaIl: string; // ISO date
  motivoFine: "gameOver" | "finaleNarrativo";
  finaleNarrativoId: string | null;
  vantaggioEreditatoScelto: string | null;
  statistiche: {
    creditiFinali: number;
    numeroRegioniVisitate: number;
    carteGiocateTotali: number;
    revisioniPagate: number;
    tempoSimulatoMs: number;
  };
}

export interface PersistenceAdapter {
  carica(): Promise<SaveFile | null>;
  salva(save: SaveFile): Promise<void>;
  cancella(): Promise<void>;
  archiviaDirettore(voce: VoceArchivioDirettore): Promise<void>;
  elencoArchivioDirettori(): Promise<VoceArchivioDirettore[]>;
}
