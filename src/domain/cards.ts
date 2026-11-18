import type { CardCode, CardDefinition } from "./types";

// Definizioni carte data-driven. Le 6 carte di base (OPS-01/02/03, IND-01/02,
// RSH-01) sono CONFERMATE in B2; Rifornimento (LOG-01) e' una delle "altre
// carte future" gia' citate in B2, introdotta operativamente al Macrostep 4.
// Ricerca (RSH-01) e' attivabile dal Macrostep 7: bersaglio "progettoRicerca"
// (id di una tecnologia disponibile, vedi src/domain/research.ts).
export const CARD_DEFINITIONS: Record<CardCode, CardDefinition> = {
  "OPS-01": {
    code: "OPS-01",
    nome: "Esplora",
    categoria: "operazioni",
    descrizione: "Esplora una zona di mappa e rivela la nebbia di guerra inviando esploratori/sonde.",
    bersaglio: "zonaMappa",
    inManoIniziale: true,
    attivabile: true,
  },
  "OPS-02": {
    code: "OPS-02",
    nome: "Investiga",
    categoria: "operazioni",
    descrizione: "Invia una sonda su un pianeta gia' scoperto per rivelarne le risorse (10-30 secondi).",
    bersaglio: "pianetaScoperto",
    inManoIniziale: true,
    attivabile: true,
  },
  "OPS-03": {
    code: "OPS-03",
    nome: "Recupera rottami",
    categoria: "operazioni",
    descrizione: "Recupera materiali da relitti e campi di asteroidi.",
    bersaglio: "relitto",
    inManoIniziale: false,
    attivabile: true,
  },
  "IND-01": {
    code: "IND-01",
    nome: "Contratto minerario",
    categoria: "industria",
    descrizione: "Avvia l'estrazione mineraria su un pianeta gia' investigato.",
    bersaglio: "pianetaInvestigato",
    inManoIniziale: true,
    attivabile: true,
  },
  "IND-02": {
    code: "IND-02",
    nome: "Fabbrica",
    categoria: "industria",
    descrizione: "Costruisce la prima fabbrica a bordo della nave madre.",
    bersaglio: "nave",
    inManoIniziale: true,
    attivabile: true,
  },
  "RSH-01": {
    code: "RSH-01",
    nome: "Ricerca",
    categoria: "ricerca",
    descrizione: "Avvia un progetto tecnologico disponibile tra i quattro rami di ricerca.",
    bersaglio: "progettoRicerca",
    inManoIniziale: true,
    attivabile: true,
  },
  "LOG-01": {
    code: "LOG-01",
    nome: "Rifornimento",
    categoria: "logistica",
    descrizione: "Trasferisce carburante raffinato dalla stiva al serbatoio della nave madre.",
    bersaglio: "nave",
    inManoIniziale: false,
    attivabile: true,
  },
  "IPS-01": {
    code: "IPS-01",
    nome: "Iperspazio",
    categoria: "operazioni",
    descrizione:
      "Salto iperspaziale verso una nuova regione, irreversibile. Richiede la tecnologia Iperspazio e 60 carburante.",
    bersaglio: "nessuno",
    inManoIniziale: false,
    attivabile: true,
  },
  "RAR-01": {
    code: "RAR-01",
    nome: "Diplomazia lampo",
    categoria: "operazioni",
    descrizione:
      "Azione diplomatica originale: migliora immediatamente e sensibilmente la relazione con una civilta' scoperta (non un generico bonus percentuale).",
    bersaglio: "civiltaScoperta",
    inManoIniziale: false,
    attivabile: true,
  },
  "RAR-02": {
    code: "RAR-02",
    nome: "Fuga d'emergenza",
    categoria: "operazioni",
    descrizione:
      "Azione originale legata alla situazione: libera immediatamente la nave madre da ogni pericolo regionale attivo (tempesta, campo gravitazionale, radiazioni) per un periodo limitato.",
    bersaglio: "nessuno",
    inManoIniziale: false,
    attivabile: true,
  },
};

export const MANO_INIZIALE: CardCode[] = ["OPS-01", "OPS-02", "IND-01", "IND-02", "RSH-01"];
