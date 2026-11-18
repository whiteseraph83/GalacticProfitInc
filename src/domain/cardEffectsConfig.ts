// Parametri numerici degli effetti delle carte attivabili in questo
// macrostep. DA BILANCIARE (vedi docs/balance.json): sono default sensati
// per rendere il sistema testabile, non un bilanciamento definitivo (B3).
export const CARD_EFFECTS = {
  investiga: {
    durataMinSec: 10,
    durataMaxSec: 30,
  },
  contrattoMinerario: {
    costoIniziale: 30, // proposto in B3, non approvato
    costoOperativoAlMinuto: 4, // proposto in B3, non approvato
  },
  recuperaRottami: {
    ricompensaCreditiMin: 50,
    ricompensaCreditiMax: 150,
  },
  diplomaziaLampo: {
    // Carta rara (B2, Macrostep 9): azione originale, salto diretto e
    // sensibile di relazione, non un generico bonus percentuale.
    bonusRelazione: 25,
  },
  fugaDEmergenza: {
    durataImmunitaMs: 3 * 60 * 1000,
  },
} as const;
