import type { ModuloDefinition } from "./types";

// Moduli craftabili per navi minerarie (B2, Macrostep 7): "moduli craftabili
// solo con fabbrica, uno slot per nave iniziale, massimo due via ricerca".
// Nessun costo/effetto e' specificato nel documento: valori stimati, vedi
// docs/balance.json.

export const MODULO_DEFINITIONS: Record<string, ModuloDefinition> = {
  "MOD-PERFORATORE": {
    id: "MOD-PERFORATORE",
    nome: "Perforatore avanzato",
    descrizione: "Aumenta l'estrazione al minuto della nave mineraria su cui e' installato.",
    costoCrediti: 250,
    costoRisorsaRaffinata: { ferroRaffinato: 20 },
    bonusEstrazioneAlMinuto: 1.5,
  },
  "MOD-STABILIZZATORE": {
    id: "MOD-STABILIZZATORE",
    nome: "Stabilizzatore di giacimento",
    descrizione: "Piccolo bonus di estrazione, piu' economico del perforatore.",
    costoCrediti: 150,
    costoRisorsaRaffinata: { titanioRaffinato: 10 },
    bonusEstrazioneAlMinuto: 0.8,
  },
};

/** Costo della seconda (e successive) nave mineraria: "1.000 Cr + materiali
 * raffinati" (B2); la quantita' di raffinati non e' specificata nel
 * documento (stima: 50 ferroRaffinato). */
export const NAVE_MINERARIA_COSTO = {
  crediti: 1000,
  ferroRaffinato: 50,
} as const;
