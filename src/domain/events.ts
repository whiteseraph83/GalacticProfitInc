import type { EventoDefinition } from "./types";

// Eventi periodici (B9, CONFERMATO: "eventi aziendali, economici,
// diplomatici e misteriosi circa ogni 8-10 carte, con scelte e
// conseguenze; eventi ordinari non modali, critici sospendono solo quando
// necessario"). Pirateria aggiunta come quinta categoria (B9 la descrive
// separatamente: "pirati senza combattimento... navi distrutte solo in
// eventi estremi e annunciati"). Ogni scelta ha una conseguenza concreta e
// deterministica (mai un generico bonus percentuale nascosto).

export const EVENTI_CONFIG = {
  sogliaCarteMin: 8,
  sogliaCarteMax: 10,
  attiviMax: 3,
} as const;

export const EVENTO_DEFINITIONS: Record<string, EventoDefinition> = {
  "EVT-AZ-01": {
    id: "EVT-AZ-01",
    categoria: "aziendale",
    titolo: "Controllo qualita' a sorpresa",
    descrizione: "Un ispettore OmniProfit chiede di esaminare i registri di produzione.",
    critico: false,
    scelte: [
      { id: "coopera", testo: "Coopera pienamente", effetti: [{ tipo: "fiducia", valore: 5 }] },
      { id: "nascondi", testo: "Nascondi le irregolarita'", effetti: [{ tipo: "crediti", valore: 100 }, { tipo: "fiducia", valore: -10 }] },
    ],
  },
  "EVT-AZ-02": {
    id: "EVT-AZ-02",
    categoria: "aziendale",
    titolo: "Bonus produttivita' trimestrale",
    descrizione: "La sede centrale riconosce i buoni risultati del periodo.",
    critico: false,
    scelte: [
      { id: "festeggia", testo: "Festeggia con l'equipaggio", effetti: [{ tipo: "fiducia", valore: 8 }] },
      { id: "reinvesti", testo: "Reinvesti il bonus in azienda", effetti: [{ tipo: "crediti", valore: 150 }] },
    ],
  },
  "EVT-EC-01": {
    id: "EVT-EC-01",
    categoria: "economico",
    titolo: "Fluttuazione di mercato favorevole",
    descrizione: "Un picco di domanda temporaneo apre un'opportunita' di vendita.",
    critico: false,
    scelte: [
      { id: "approfitta", testo: "Approfitta subito del rialzo", effetti: [{ tipo: "crediti", valore: 200 }] },
      { id: "aspetta", testo: "Aspetta un rialzo migliore", effetti: [{ tipo: "nessunEffetto" }] },
    ],
  },
  "EVT-EC-02": {
    id: "EVT-EC-02",
    categoria: "economico",
    titolo: "Richiesta di sponsorizzazione",
    descrizione: "Un'agenzia pubblicitaria propone di sponsorizzare la nave madre.",
    critico: false,
    scelte: [
      { id: "accetta", testo: "Accetta la sponsorizzazione", effetti: [{ tipo: "crediti", valore: 120 }, { tipo: "fiducia", valore: -3 }] },
      { id: "rifiuta", testo: "Rifiuta, troppo invasiva", effetti: [{ tipo: "nessunEffetto" }] },
    ],
  },
  "EVT-DI-01": {
    id: "EVT-DI-01",
    categoria: "diplomatico",
    titolo: "Delegazione in visita",
    descrizione: "Una delegazione di una civilta' locale chiede un incontro.",
    critico: false,
    scelte: [
      { id: "ricevimento", testo: "Offri un ricevimento formale", effetti: [{ tipo: "relazioneCivilta", valore: 10 }, { tipo: "crediti", valore: -80 }] },
      { id: "informale", testo: "Incontro informale, senza spese", effetti: [{ tipo: "relazioneCivilta", valore: 4 }] },
    ],
  },
  "EVT-DI-02": {
    id: "EVT-DI-02",
    categoria: "diplomatico",
    titolo: "Disputa territoriale locale",
    descrizione: "Due fazioni della civilta' locale chiedono di fare da mediatore.",
    critico: false,
    scelte: [
      { id: "media", testo: "Media il conflitto", effetti: [{ tipo: "relazioneCivilta", valore: 6 }, { tipo: "fiducia", valore: 2 }] },
      { id: "nonIntervenire", testo: "Non intervenire", effetti: [{ tipo: "nessunEffetto" }] },
    ],
  },
  "EVT-MI-01": {
    id: "EVT-MI-01",
    categoria: "misterioso",
    titolo: "Segnale anomalo captato",
    descrizione: "I sensori captano un segnale di origine sconosciuta nella regione.",
    critico: false,
    scelte: [
      { id: "investiga", testo: "Investiga a fondo il segnale", effetti: [{ tipo: "crediti", valore: 180 }] },
      { id: "ignora", testo: "Ignora il segnale", effetti: [{ tipo: "nessunEffetto" }] },
    ],
  },
  "EVT-MI-02": {
    id: "EVT-MI-02",
    categoria: "misterioso",
    titolo: "Voci di un relitto leggendario",
    descrizione: "L'equipaggio riporta voci su un relitto di grande valore nei paraggi.",
    critico: false,
    scelte: [
      { id: "segui", testo: "Segui la pista", effetti: [{ tipo: "crediti", valore: 250 }] },
      { id: "lasciaPerdere", testo: "Lascia perdere, troppo rischioso", effetti: [{ tipo: "nessunEffetto" }] },
    ],
  },
  "EVT-PIR-01": {
    id: "EVT-PIR-01",
    categoria: "pirateria",
    titolo: "Nave pirata in avvicinamento",
    descrizione: "Una nave pirata segnala di voler riscuotere un pedaggio di passaggio.",
    critico: false,
    scelte: [
      { id: "paga", testo: "Paga il pedaggio", effetti: [{ tipo: "crediti", valore: -100 }] },
      { id: "rifiuta", testo: "Rifiuta: i pirati sottraggono parte del carico", effetti: [{ tipo: "cargoRubato", percentuale: 15 }] },
    ],
  },
  "EVT-PIR-02": {
    id: "EVT-PIR-02",
    categoria: "pirateria",
    titolo: "Blocco pirata aggressivo",
    descrizione:
      "Un gruppo pirata armato blocca la rotta e minaccia azioni estreme. Evento critico, annunciato: scegli con attenzione.",
    critico: true,
    scelte: [
      { id: "pagaPesante", testo: "Paga un pedaggio salato", effetti: [{ tipo: "crediti", valore: -300 }] },
      { id: "sacrificaCarico", testo: "Sacrifica meta' del carico in stiva", effetti: [{ tipo: "cargoRubato", percentuale: 50 }] },
      { id: "tentaFuga", testo: "Tenta la fuga: rischi una nave mineraria", effetti: [{ tipo: "naveMinerariaDistrutta" }] },
    ],
  },
};
