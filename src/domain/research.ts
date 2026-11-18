import type { BonusRicerca, EffettoTecnologia, RamoRicerca, TecnologiaDefinition } from "./types";

// Albero di ricerca (B2: "quattro rami ricerca: Esplorazione, Industria,
// Logistica, Economia", Macrostep 7). Nessun valore numerico e' specificato
// dal documento oltre al principio generale ("costi e durata da 1-15
// minuti", "bonus globali per estrazione, raffinazione, dimensione mano,
// generazione carte (min 2 min), fog, trasporti, moduli e costi"): i valori
// concreti qui sotto sono stime ragionevoli, vedi docs/balance.json.

export const RAMI_RICERCA: RamoRicerca[] = ["esplorazione", "industria", "logistica", "economia"];

export const TECNOLOGIE: Record<string, TecnologiaDefinition> = {
  "ESP-01": {
    id: "ESP-01",
    ramo: "esplorazione",
    nome: "Sensori potenziati",
    descrizione: "Aumenta il raggio di scoperta (fog of war) attorno alla nave madre.",
    costoCrediti: 300,
    durataMs: 3 * 60 * 1000,
    prerequisiti: [],
    effetto: { tipo: "raggioFogBonus", valore: 150 },
  },
  "ESP-02": {
    id: "ESP-02",
    ramo: "esplorazione",
    nome: "Rete di sonde",
    descrizione: "Riduce l'intervallo di generazione passiva di nuove carte.",
    costoCrediti: 450,
    durataMs: 6 * 60 * 1000,
    prerequisiti: ["ESP-01"],
    effetto: { tipo: "riduzioneIntervalloGenerazioneCarteMs", valore: -60_000 },
  },
  "ESP-03": {
    id: "ESP-03",
    ramo: "esplorazione",
    nome: "Catalogazione avanzata",
    descrizione: "Aumenta la capacita' massima della mano di carte.",
    costoCrediti: 600,
    durataMs: 10 * 60 * 1000,
    prerequisiti: ["ESP-02"],
    effetto: { tipo: "capacitaManoCarteBonus", valore: 1 },
  },
  "ESP-04": {
    id: "ESP-04",
    ramo: "esplorazione",
    nome: "Salto iperspaziale",
    descrizione: "Sblocca la tecnologia Iperspazio: la carta Iperspazio diventa utilizzabile (B6).",
    costoCrediti: 900,
    durataMs: 15 * 60 * 1000,
    prerequisiti: ["ESP-03"],
    effetto: { tipo: "sbloccaIperspazio" },
  },
  "IND-R1": {
    id: "IND-R1",
    ramo: "industria",
    nome: "Trivelle rinforzate",
    descrizione: "Aumenta la velocita' di estrazione di tutti i contratti minerari.",
    costoCrediti: 350,
    durataMs: 4 * 60 * 1000,
    prerequisiti: [],
    effetto: { tipo: "moltiplicatoreEstrazione", valore: 0.25 },
  },
  "IND-R2": {
    id: "IND-R2",
    ramo: "industria",
    nome: "Catalisi di raffinazione",
    descrizione: "Riduce la durata delle ricette di raffinazione.",
    costoCrediti: 500,
    durataMs: 7 * 60 * 1000,
    prerequisiti: ["IND-R1"],
    effetto: { tipo: "moltiplicatoreVelocitaRaffinazione", valore: 0.3 },
  },
  "IND-R3": {
    id: "IND-R3",
    ramo: "industria",
    nome: "Seconda linea di produzione",
    descrizione: "Aggiunge una linea di raffinazione concorrente in fabbrica.",
    costoCrediti: 800,
    durataMs: 12 * 60 * 1000,
    prerequisiti: ["IND-R2"],
    effetto: { tipo: "lineeFabbricaBonus", valore: 1 },
  },
  "LOG-R1": {
    id: "LOG-R1",
    ramo: "logistica",
    nome: "Motori navetta potenziati",
    descrizione: "Aumenta la velocita' di spostamento delle navette.",
    costoCrediti: 300,
    durataMs: 4 * 60 * 1000,
    prerequisiti: [],
    effetto: { tipo: "moltiplicatoreTrasporti", valore: 0.3 },
  },
  "LOG-R2": {
    id: "LOG-R2",
    ramo: "logistica",
    nome: "Pianificazione progetti",
    descrizione: "Sblocca uno slot aggiuntivo per progetti di ricerca contemporanei.",
    costoCrediti: 500,
    durataMs: 8 * 60 * 1000,
    prerequisiti: ["LOG-R1"],
    effetto: { tipo: "slotRicercaBonus", valore: 1 },
  },
  "LOG-R3": {
    id: "LOG-R3",
    ramo: "logistica",
    nome: "Hangar modulare",
    descrizione: "Sblocca uno slot modulo aggiuntivo su ogni nave mineraria.",
    costoCrediti: 700,
    durataMs: 10 * 60 * 1000,
    prerequisiti: ["LOG-R2"],
    effetto: { tipo: "slotModuloBonus", valore: 1 },
  },
  "ECO-R1": {
    id: "ECO-R1",
    ramo: "economia",
    nome: "Contabilita' efficiente",
    descrizione: "Riduce i costi operativi dei contratti minerari.",
    costoCrediti: 350,
    durataMs: 5 * 60 * 1000,
    prerequisiti: [],
    effetto: { tipo: "moltiplicatoreCosti", valore: -0.15 },
  },
  "ECO-R2": {
    id: "ECO-R2",
    ramo: "economia",
    nome: "Ottimizzazione appalti",
    descrizione: "Riduce ulteriormente i costi operativi dei contratti minerari.",
    costoCrediti: 550,
    durataMs: 8 * 60 * 1000,
    prerequisiti: ["ECO-R1"],
    effetto: { tipo: "moltiplicatoreCosti", valore: -0.1 },
  },
  "ECO-R3": {
    id: "ECO-R3",
    ramo: "economia",
    nome: "Hangar modulare avanzato",
    descrizione: "Sblocca un secondo slot modulo aggiuntivo su ogni nave mineraria.",
    costoCrediti: 900,
    durataMs: 14 * 60 * 1000,
    prerequisiti: ["ECO-R2"],
    effetto: { tipo: "slotModuloBonus", valore: 1 },
  },
};

export const SLOT_RICERCA_BASE = 1;
export const SLOT_MODULO_BASE = 1;
/** "massimo due via ricerca" (B2): solo LOG-R3 e ECO-R3 concedono questo
 * bonus, un cap esplicito resta comunque come difesa in profondita'. */
export const SLOT_MODULO_BONUS_MAX = 2;

const BONUS_IDENTITA: BonusRicerca = {
  moltiplicatoreEstrazione: 1,
  moltiplicatoreVelocitaRaffinazione: 1,
  capacitaManoCarteBonus: 0,
  riduzioneIntervalloGenerazioneCarteMs: 0,
  raggioFogBonus: 0,
  moltiplicatoreTrasporti: 1,
  slotRicercaBonus: 0,
  slotModuloBonus: 0,
  moltiplicatoreCosti: 1,
  lineeFabbricaBonus: 0,
  iperspazioSbloccato: false,
};

function applicaEffetto(bonus: BonusRicerca, effetto: EffettoTecnologia): BonusRicerca {
  switch (effetto.tipo) {
    case "moltiplicatoreEstrazione":
      return { ...bonus, moltiplicatoreEstrazione: bonus.moltiplicatoreEstrazione + effetto.valore };
    case "moltiplicatoreVelocitaRaffinazione":
      return { ...bonus, moltiplicatoreVelocitaRaffinazione: bonus.moltiplicatoreVelocitaRaffinazione + effetto.valore };
    case "capacitaManoCarteBonus":
      return { ...bonus, capacitaManoCarteBonus: bonus.capacitaManoCarteBonus + effetto.valore };
    case "riduzioneIntervalloGenerazioneCarteMs":
      return { ...bonus, riduzioneIntervalloGenerazioneCarteMs: bonus.riduzioneIntervalloGenerazioneCarteMs + effetto.valore };
    case "raggioFogBonus":
      return { ...bonus, raggioFogBonus: bonus.raggioFogBonus + effetto.valore };
    case "moltiplicatoreTrasporti":
      return { ...bonus, moltiplicatoreTrasporti: bonus.moltiplicatoreTrasporti + effetto.valore };
    case "slotRicercaBonus":
      return { ...bonus, slotRicercaBonus: bonus.slotRicercaBonus + effetto.valore };
    case "slotModuloBonus":
      return { ...bonus, slotModuloBonus: Math.min(SLOT_MODULO_BONUS_MAX, bonus.slotModuloBonus + effetto.valore) };
    case "moltiplicatoreCosti":
      return { ...bonus, moltiplicatoreCosti: bonus.moltiplicatoreCosti + effetto.valore };
    case "lineeFabbricaBonus":
      return { ...bonus, lineeFabbricaBonus: bonus.lineeFabbricaBonus + effetto.valore };
    case "sbloccaIperspazio":
      return { ...bonus, iperspazioSbloccato: true };
  }
}

/** Calcola i bonus globali attivi a partire dalla lista di tecnologie
 * completate: nessuno stato derivato viene mai mantenuto separatamente
 * (la fonte di verita' resta GameState.ricerca.completate), cosi' non puo'
 * mai desincronizzarsi. */
export function calcolaBonusRicerca(completate: string[]): BonusRicerca {
  let bonus = BONUS_IDENTITA;
  for (const id of completate) {
    const tecnologia = TECNOLOGIE[id];
    if (!tecnologia) continue;
    bonus = applicaEffetto(bonus, tecnologia.effetto);
  }
  return bonus;
}
