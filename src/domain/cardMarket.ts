import type { CardCode } from "./types";

// Mercato delle carte (B2, Macrostep 6). Prezzi "relativamente costosi" per
// le carte comuni (B2, confermato nel principio, non nei valori: DA
// BILANCIARE). Ricerca non e' esclusa a priori dalla rotazione: compare
// "soltanto quando estratta", cioe' semplicemente quando il sorteggio la
// sceglie come le altre (B2, confermato). Le carte rare (RAR-*, Macrostep
// 9) restano fuori dalla rotazione del mercato generico: "hanno azioni
// particolari", reperibili solo da missioni/eventi, mai acquistabili.
export const PREZZI_CARTE: Partial<Record<CardCode, number>> = {
  "OPS-01": 180,
  "OPS-02": 180,
  "OPS-03": 160,
  "IND-01": 260,
  "IND-02": 320,
  "RSH-01": 300,
  "LOG-01": 150,
  "IPS-01": 400,
};

export const MERCATO_CARTE = {
  intervalloRotazioneMs: 15 * 60 * 1000, // 15 minuti di tempo attivo (B2, confermato)
  numeroSlot: 5,
} as const;
