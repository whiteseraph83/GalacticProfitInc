import type { RefineRecipe } from "./types";

// Costo di costruzione della prima fabbrica (B1: "200 Cr + minerali grezzi
// comuni, quantita' da bilanciare"). 200 Cr e' confermato; la quantita' di
// ferro e' una stima provvisoria (DA BILANCIARE, vedi docs/balance.json).
export const FABBRICA_COSTO = {
  crediti: 200,
  ferro: 50,
} as const;

// Ricette di raffinazione data-driven (B1/Macrostep 4): una per risorsa
// grezza verso il suo equivalente raffinato (piu' redditizio ma non ancora
// vendibile in assenza del mercato, Macrostep 5), piu' la ricetta speciale
// che produce carburante utilizzabile dal motore. Tutti i valori sono
// DA BILANCIARE: scelti per restare testabili, non bilanciamento definitivo.
export const RICETTE_RAFFINAZIONE: Record<string, RefineRecipe> = {
  "raffina-ferro": {
    id: "raffina-ferro",
    nome: "Raffina ferro",
    inputRisorsa: "ferro",
    inputQuantita: 30,
    outputRisorsa: "ferroRaffinato",
    outputQuantita: 18,
    costoCrediti: 40,
    durataSec: 40,
  },
  "raffina-cristalli": {
    id: "raffina-cristalli",
    nome: "Raffina cristalli di silicio",
    inputRisorsa: "cristalliSilicio",
    inputQuantita: 25,
    outputRisorsa: "cristalliRaffinati",
    outputQuantita: 15,
    costoCrediti: 60,
    durataSec: 50,
  },
  "raffina-titanio": {
    id: "raffina-titanio",
    nome: "Raffina titanio stellare",
    inputRisorsa: "titanioStellare",
    inputQuantita: 20,
    outputRisorsa: "titanioRaffinato",
    outputQuantita: 12,
    costoCrediti: 90,
    durataSec: 60,
  },
  "raffina-iridio": {
    id: "raffina-iridio",
    nome: "Raffina iridio quantico",
    inputRisorsa: "iridioQuantico",
    inputQuantita: 15,
    outputRisorsa: "iridioRaffinato",
    outputQuantita: 9,
    costoCrediti: 150,
    durataSec: 75,
  },
  "raffina-materia-esotica": {
    id: "raffina-materia-esotica",
    nome: "Raffina materia esotica",
    inputRisorsa: "materiaEsotica",
    inputQuantita: 10,
    outputRisorsa: "materiaEsoticaRaffinata",
    outputQuantita: 6,
    costoCrediti: 250,
    durataSec: 90,
  },
  "raffina-carburante": {
    id: "raffina-carburante",
    nome: "Raffina carburante",
    inputRisorsa: "ferro",
    inputQuantita: 20,
    outputRisorsa: "carburante",
    outputQuantita: 25,
    costoCrediti: 30,
    durataSec: 35,
  },
};
