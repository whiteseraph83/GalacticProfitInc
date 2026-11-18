import type { GameState } from "./types";

// Vantaggi ereditati tra una carriera e la successiva (B11, CONFERMATO:
// "scelta di 1 tra 3 piccoli vantaggi casuali ereditati"). Deliberatamente
// piccoli: un margine di partenza, mai un salto di potenza che renderebbe
// irrilevante lo stato iniziale validato (B1).

export type EffettoVantaggioEreditato =
  | { tipo: "creditiIniziali"; valore: number }
  | { tipo: "carburanteIniziale"; valore: number }
  | { tipo: "capacitaManoCarte"; valore: number }
  | { tipo: "fiduciaIniziale"; valore: number };

export interface VantaggioEreditatoDefinition {
  id: string;
  nome: string;
  descrizione: string;
  effetto: EffettoVantaggioEreditato;
}

export const VANTAGGI_EREDITATI: Record<string, VantaggioEreditatoDefinition> = {
  "VNT-CREDITI": {
    id: "VNT-CREDITI",
    nome: "Fondo di riserva ereditato",
    descrizione: "+500 Cr nel capitale iniziale.",
    effetto: { tipo: "creditiIniziali", valore: 500 },
  },
  "VNT-CARBURANTE": {
    id: "VNT-CARBURANTE",
    nome: "Scorte di carburante ereditate",
    descrizione: "+30 carburante nel serbatoio iniziale.",
    effetto: { tipo: "carburanteIniziale", valore: 30 },
  },
  "VNT-MANO": {
    id: "VNT-MANO",
    nome: "Archivio contatti ereditato",
    descrizione: "+1 capacita' massima della mano di carte fin dall'inizio.",
    effetto: { tipo: "capacitaManoCarte", valore: 1 },
  },
  "VNT-FIDUCIA": {
    id: "VNT-FIDUCIA",
    nome: "Reputazione ereditata",
    descrizione: "+15 fiducia iniziale presso OmniProfit.",
    effetto: { tipo: "fiduciaIniziale", valore: 15 },
  },
};

/** Applicato una sola volta, alla creazione dello stato iniziale di una
 * nuova carriera (`creaStatoIniziale`): un piccolo margine di partenza,
 * mai un effetto che si ripete o accumula nel tempo. */
export function applicaVantaggioEreditato(stato: GameState, vantaggioId: string): GameState {
  const definizione = VANTAGGI_EREDITATI[vantaggioId];
  if (!definizione) return stato;

  switch (definizione.effetto.tipo) {
    case "creditiIniziali":
      return { ...stato, crediti: stato.crediti + definizione.effetto.valore };
    case "carburanteIniziale":
      return {
        ...stato,
        mothership: {
          ...stato.mothership,
          carburante: Math.min(stato.mothership.serbatoioCapacita, stato.mothership.carburante + definizione.effetto.valore),
        },
      };
    case "capacitaManoCarte":
      return { ...stato, capacitaManoCarte: stato.capacitaManoCarte + definizione.effetto.valore };
    case "fiduciaIniziale":
      return { ...stato, review: { ...stato.review, fiducia: Math.min(100, stato.review.fiducia + definizione.effetto.valore) } };
  }
}
