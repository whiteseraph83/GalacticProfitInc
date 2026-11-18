import { describe, expect, it } from "vitest";
import { IndexedDbPersistenceAdapter } from "../src/persistence/indexedDbAdapter";
import { SAVE_SCHEMA_VERSION } from "../src/persistence/types";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";

// L'ambiente di test (jsdom) non implementa IndexedDB (verificato:
// `typeof indexedDB === "undefined"`): qui si verifica che l'adapter
// degradi correttamente senza eccezioni (A1: "autosave... non deve
// interrompere la partita" se lo storage non e' disponibile). Il
// round-trip reale su IndexedDB e' verificato manualmente nel browser
// (vedi docs/game-rules.md), dove l'API esiste davvero.
describe("IndexedDbPersistenceAdapter (degradazione senza IndexedDB)", () => {
  it("carica() risolve a null senza lanciare eccezioni", async () => {
    const adapter = new IndexedDbPersistenceAdapter();
    await expect(adapter.carica()).resolves.toBeNull();
  });

  it("salva() risolve senza lanciare eccezioni", async () => {
    const adapter = new IndexedDbPersistenceAdapter();
    const stato = creaStatoIniziale("persistenza-test");
    await expect(adapter.salva({ schemaVersion: SAVE_SCHEMA_VERSION, salvatoIl: new Date().toISOString(), state: stato })).resolves.toBeUndefined();
  });

  it("cancella() risolve senza lanciare eccezioni", async () => {
    const adapter = new IndexedDbPersistenceAdapter();
    await expect(adapter.cancella()).resolves.toBeUndefined();
  });

  it("archiviaDirettore() risolve senza lanciare eccezioni (Macrostep 11)", async () => {
    const adapter = new IndexedDbPersistenceAdapter();
    await expect(
      adapter.archiviaDirettore({
        id: "direttore-test",
        seed: "seed-test",
        concludutaIl: new Date().toISOString(),
        motivoFine: "gameOver",
        finaleNarrativoId: null,
        vantaggioEreditatoScelto: null,
        statistiche: { creditiFinali: 0, numeroRegioniVisitate: 1, carteGiocateTotali: 0, revisioniPagate: 0, tempoSimulatoMs: 0 },
      }),
    ).resolves.toBeUndefined();
  });

  it("elencoArchivioDirettori() risolve a un array vuoto senza lanciare eccezioni", async () => {
    const adapter = new IndexedDbPersistenceAdapter();
    await expect(adapter.elencoArchivioDirettori()).resolves.toEqual([]);
  });
});

describe("forma del salvataggio", () => {
  it("lo stato serializzato e' JSON-compatibile (nessuna funzione/Map/Set) e resta valido", () => {
    const stato = creaStatoIniziale("persistenza-json");
    const testo = JSON.stringify(stato);
    const ricostruito = JSON.parse(testo);
    expect(validaStato(ricostruito)).toEqual([]);
    expect(ricostruito).toEqual(stato);
  });

  it("SAVE_SCHEMA_VERSION e' un intero positivo stabile", () => {
    expect(Number.isInteger(SAVE_SCHEMA_VERSION)).toBe(true);
    expect(SAVE_SCHEMA_VERSION).toBeGreaterThan(0);
  });
});
