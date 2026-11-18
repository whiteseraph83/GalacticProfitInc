import type { PersistenceAdapter, SaveFile, VoceArchivioDirettore } from "./types";

// Adapter IndexedDB minimale (nessuna libreria esterna, per restare un sito
// statico leggero, A1). Due store: la carriera attiva e l'archivio dei
// direttori di carriere concluse (B11, Macrostep 11). DB_VERSION a 2:
// l'upgrade aggiunge solo il nuovo store, lo store "saves" esistente resta
// intatto (nessuna migrazione necessaria sui dati gia' presenti).
const DB_NAME = "galactic-profit-inc";
const DB_VERSION = 2;
const STORE_NAME = "saves";
const STORE_ARCHIVIO = "direttori";
const CHIAVE_CARRIERA_ATTIVA = "carriera-attiva";

function apriDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const richiesta = indexedDB.open(DB_NAME, DB_VERSION);
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_ARCHIVIO)) {
        db.createObjectStore(STORE_ARCHIVIO, { keyPath: "id" });
      }
    };
    richiesta.onsuccess = () => resolve(richiesta.result);
    richiesta.onerror = () => reject(richiesta.error);
  });
}

export class IndexedDbPersistenceAdapter implements PersistenceAdapter {
  async carica(): Promise<SaveFile | null> {
    if (typeof indexedDB === "undefined") return null;
    const db = await apriDatabase();
    try {
      return await new Promise<SaveFile | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const richiesta = tx.objectStore(STORE_NAME).get(CHIAVE_CARRIERA_ATTIVA);
        richiesta.onsuccess = () => resolve((richiesta.result as SaveFile | undefined) ?? null);
        richiesta.onerror = () => reject(richiesta.error);
      });
    } finally {
      db.close();
    }
  }

  async salva(save: SaveFile): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    const db = await apriDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(save, CHIAVE_CARRIERA_ATTIVA);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async cancella(): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    const db = await apriDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(CHIAVE_CARRIERA_ATTIVA);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async archiviaDirettore(voce: VoceArchivioDirettore): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    const db = await apriDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_ARCHIVIO, "readwrite");
        tx.objectStore(STORE_ARCHIVIO).put(voce);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async elencoArchivioDirettori(): Promise<VoceArchivioDirettore[]> {
    if (typeof indexedDB === "undefined") return [];
    const db = await apriDatabase();
    try {
      return await new Promise<VoceArchivioDirettore[]>((resolve, reject) => {
        const tx = db.transaction(STORE_ARCHIVIO, "readonly");
        const richiesta = tx.objectStore(STORE_ARCHIVIO).getAll();
        richiesta.onsuccess = () => resolve((richiesta.result as VoceArchivioDirettore[]) ?? []);
        richiesta.onerror = () => reject(richiesta.error);
      });
    } finally {
      db.close();
    }
  }
}

/** Istanza condivisa: stesso adapter per il caricamento iniziale,
 * l'autosave periodico e i controlli manuali (esporta/importa/elimina). */
export const persistenceAdapter = new IndexedDbPersistenceAdapter();
