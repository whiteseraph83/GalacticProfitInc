import type { ResourceType } from "./types";

// Prezzi base galattici (B3). I grezzi sono i valori PROPOSTI nel documento
// di design, non ancora approvati come bilanciamento definitivo. I prezzi
// dei raffinati e del carburante non sono specificati nel documento: sono
// stimati a un multiplo dei grezzi corrispondenti, coerente con "i raffinati
// sono piu' redditizi al netto di spese/tempo" (B4) — DA BILANCIARE.
export const PREZZI_BASE: Record<ResourceType, number> = {
  ferro: 5,
  cristalliSilicio: 12,
  titanioStellare: 25,
  iridioQuantico: 55,
  materiaEsotica: 120,
  ferroRaffinato: 11,
  cristalliRaffinati: 26,
  titanioRaffinato: 55,
  iridioRaffinato: 120,
  materiaEsoticaRaffinata: 260,
  carburante: 8,
};

export const MERCATO = {
  intervalloAggiornamentoMs: 5 * 60 * 1000, // 5 minuti di tempo attivo (B3, confermato)
  fluttuazioneMassima: 0.2, // ±20% (B3, confermato)
} as const;
