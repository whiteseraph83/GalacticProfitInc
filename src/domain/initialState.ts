import { CARD_DEFINITIONS, MANO_INIZIALE } from "./cards";
import { WORLD } from "./worldConstants";
import { PREZZI_BASE } from "./market";
import { MERCATO_CARTE, PREZZI_CARTE } from "./cardMarket";
import { EVENTI_CONFIG } from "./events";
import { applicaVantaggioEreditato } from "./legacy";
import { SeededRng } from "./rng";
import { generaRegione } from "../world/regionGenerator";
import { generaMissioni } from "../world/missionGenerator";
import type { CardCode, CardInstance, GameState, SlotMercatoCarte } from "./types";

// Valori CONFERMATI in B1/B2. Vedi docs/balance.json per i parametri
// ancora DA BILANCIARE (contrassegnati come provvisori).
export const BALANCE = {
  creditiIniziali: 2000,
  stivaMothershipCapacita: 500,
  serbatoioMothershipCapacita: 150,
  carburanteIniziale: 120, // proposto, non ancora approvato come definitivo
  capacitaNavetta: 20, // ridotto da 40 su richiesta dell'utente dopo playtest
  numeroNavetteIniziali: 2,
  estrazioneBaseAlMinuto: 4,
  capacitaManoCarteBase: 5,
  sogliaCarteProssimaRevisione: 40,
  primaQuotaRevisione: 600,
  fiduciaIniziale: 100,
  // Movimento nave madre (Macrostep 2, DA BILANCIARE: vedi docs/balance.json).
  mothershipVelocitaMax: 60, // unita'/s
  mothershipAccelerazione: 40, // unita'/s^2
  mothershipVelocitaAngolare: 3, // radianti/s
  mothershipConsumoCarburantePerUnita: 0.04, // carburante per unita' di distanza percorsa
  mothershipMargineOstacolo: 14,
  // Navette (Macrostep 2, DA BILANCIARE).
  navettaVelocita: 70, // unita'/s
  navettaTimeoutPartenzaMs: 3 * 60 * 1000,
  soccorsoCarburanteQuantita: 30,
  soccorsoCarburanteCostoFiducia: 10,
  // Carte (B2, Macrostep 3).
  intervalloGenerazioneCarteMs: 5 * 60 * 1000,
  /** B2: "migliorabile via ricerca fino a minimo 2 minuti" (Macrostep 7). */
  intervalloGenerazioneCarteMinimoMs: 2 * 60 * 1000,
  // Revisioni aziendali e tolleranza (B3, Macrostep 5).
  carteTolleranzaMancataQuota: 5,
} as const;

let instanceCounter = 0;
function nextId(prefix: string): string {
  instanceCounter += 1;
  return `${prefix}-${instanceCounter}`;
}

export function creaManoIniziale(): CardInstance[] {
  return MANO_INIZIALE.map((code) => ({
    instanceId: nextId("card"),
    code,
    livello: 1,
  }));
}

function creaSlotMercatoCarte(rng: SeededRng): SlotMercatoCarte[] {
  const codici = Object.keys(PREZZI_CARTE) as CardCode[];
  return Array.from({ length: MERCATO_CARTE.numeroSlot }, () => {
    const code = rng.pick(codici);
    return { id: nextId("slot-carta"), code, prezzo: PREZZI_CARTE[code] as number };
  });
}

/** `vantaggioEreditatoId` (B11, Macrostep 11): piccolo vantaggio scelto
 * dal giocatore all'avvio di una nuova carriera dopo Game Over, applicato
 * una sola volta in coda alla costruzione dello stato, prima della
 * validazione finale. */
export function creaStatoIniziale(seed: string, vantaggioEreditatoId?: string): GameState {
  const mano = creaManoIniziale();
  const regione = generaRegione(seed);
  const missioni = generaMissioni(seed, regione);
  const rngMercatoCarte = new SeededRng(`${seed}|mercatoCarte`);

  let state: GameState = {
    seed,
    creato: true,
    crediti: BALANCE.creditiIniziali,
    tempoSimulatoMs: 0,
    inPausa: false,
    mothership: {
      posizione: { x: 0, y: 0 },
      orientamento: 0,
      velocita: 0,
      velocitaMax: BALANCE.mothershipVelocitaMax,
      accelerazione: BALANCE.mothershipAccelerazione,
      velocitaAngolare: BALANCE.mothershipVelocitaAngolare,
      percorso: [],
      stivaCapacita: BALANCE.stivaMothershipCapacita,
      stivaCarico: {},
      serbatoioCapacita: BALANCE.serbatoioMothershipCapacita,
      carburante: BALANCE.carburanteIniziale,
      immunitaPericoliFinoMs: 0,
    },
    naviMinerarie: [
      { id: nextId("miningship"), contrattoAttivoId: null, estrazioneBaseAlMinuto: BALANCE.estrazioneBaseAlMinuto },
    ],
    navette: Array.from({ length: BALANCE.numeroNavetteIniziali }, () => ({
      id: nextId("shuttle"),
      stato: "libera" as const,
      capacitaCargo: BALANCE.capacitaNavetta,
      caricoAttuale: {},
      posizione: { x: 0, y: 0 },
      destinazione: null,
      contrattoAssegnatoId: null,
      tempoAttesaMs: 0,
      pianetaInvestigazioneId: null,
    })),
    manoCarte: mano,
    capacitaManoCarte: BALANCE.capacitaManoCarteBase,
    review: {
      carteGiocateTotali: 0,
      carteGiocateDallUltimaRevisione: 0,
      sogliaCarteProssimaRevisione: BALANCE.sogliaCarteProssimaRevisione,
      quotaDaPagare: BALANCE.primaQuotaRevisione,
      fiducia: BALANCE.fiduciaIniziale,
      soccorsoCarburanteUsato: false,
      statoRevisione: "nessuna",
      carteTolleranzaResidue: BALANCE.carteTolleranzaMancataQuota,
      numeroRevisioniPagate: 0,
      storicoUtilePeriodi: [],
    },
    notifiche: [],
    pianetaSelezionatoId: null,
    pianeti: regione.pianeti,
    campiRelitti: regione.campiRelitti,
    areaSicuraIniziale: regione.areaSicuraIniziale,
    contrattiMinerari: [],
    ultimaGenerazioneCarteMs: 0,
    fabbrica: { id: nextId("factory"), costruita: false, linee: 1, coda: [] },
    mercato: { prezzi: { ...PREZZI_BASE }, ultimoAggiornamentoMs: 0 },
    contabilita: { ricaviTotali: 0, speseTotali: 0, ricaviPeriodoCorrente: 0, spesePeriodoCorrente: 0, debito: null },
    gameOver: null,
    missioni,
    mercatoCarte: { slots: creaSlotMercatoCarte(rngMercatoCarte), ultimaRotazioneMs: 0 },
    ricerca: { progettiAttivi: [], completate: [], puntiRicerca: 0 },
    moduli: [],
    numeroRegione: 1,
    civilta: regione.civilta,
    pericoli: regione.pericoli,
    eventi: { attivi: [], carteGiocateDallUltimo: 0, sogliaProssimo: new SeededRng(`${seed}|eventi`).nextInt(EVENTI_CONFIG.sogliaCarteMin, EVENTI_CONFIG.sogliaCarteMax) },
    campagna: { capitoloCorrente: null, sceneCompletate: [], allineamento: { lealta: 0, indipendenza: 0, ribellione: 0 }, finaleOttenuto: null },
  };

  if (vantaggioEreditatoId) state = applicaVantaggioEreditato(state, vantaggioEreditatoId);

  const problemi = validaStato(state);
  if (problemi.length > 0) {
    throw new Error(`Stato iniziale non valido: ${problemi.join("; ")}`);
  }
  return state;
}

/** Verifica gli invarianti fondamentali (G1). Ritorna la lista dei problemi trovati. */
export function validaStato(state: GameState): string[] {
  const problemi: string[] = [];

  if (state.crediti < 0) problemi.push("crediti negativi");
  if (state.mothership.carburante < 0 || state.mothership.carburante > state.mothership.serbatoioCapacita) {
    problemi.push("carburante fuori dai limiti del serbatoio");
  }
  if (state.mothership.velocita < 0 || state.mothership.velocita > state.mothership.velocitaMax + 1e-6) {
    problemi.push("velocita' nave madre fuori dai limiti");
  }
  const cargoTotale = Object.values(state.mothership.stivaCarico).reduce((a, b) => a + (b ?? 0), 0);
  if (cargoTotale > state.mothership.stivaCapacita) problemi.push("stiva nave madre oltre capacita'");

  for (const navetta of state.navette) {
    const carico = Object.values(navetta.caricoAttuale).reduce((a, b) => a + (b ?? 0), 0);
    if (carico > navetta.capacitaCargo) problemi.push(`navetta ${navetta.id} oltre capacita'`);
  }

  if (state.manoCarte.length > state.capacitaManoCarte) {
    // Overflow temporaneo consentito solo da ricompense (non verificabile qui), quindi
    // allo stato iniziale non deve mai accadere.
    problemi.push("mano carte iniziale eccede la capacita' base");
  }
  for (const carta of state.manoCarte) {
    if (!(carta.code in CARD_DEFINITIONS)) problemi.push(`codice carta sconosciuto: ${carta.code}`);
  }

  if (state.review.fiducia < 0 || state.review.fiducia > 100) problemi.push("fiducia fuori range 0-100");
  if (state.review.quotaDaPagare !== BALANCE.primaQuotaRevisione && state.review.carteGiocateTotali === 0) {
    problemi.push("prima quota deve essere 600 Cr");
  }

  if (state.pianeti.length < WORLD.pianetiMin || state.pianeti.length > WORLD.pianetiMax) {
    problemi.push(`numero di pianeti fuori range (${state.pianeti.length})`);
  }
  const idUnici = new Set(state.pianeti.map((p) => p.id));
  if (idUnici.size !== state.pianeti.length) problemi.push("id pianeta duplicato");
  for (const pianeta of state.pianeti) {
    if (pianeta.giacimentoTotale <= 0) problemi.push(`pianeta ${pianeta.id} senza giacimento`);
  }

  const pianetiScopertiIniziali = state.pianeti.filter((p) => p.scoperto).length;
  if (pianetiScopertiIniziali < WORLD.areaSicuraPianetiMin) {
    problemi.push("l'area sicura iniziale non contiene abbastanza pianeti scoperti");
  }
  const archetipiComuniScoperti = state.pianeti.filter((p) => p.scoperto && p.archetipo !== "anomalo" && p.archetipo !== "cristallino" && p.archetipo !== "gassoso");
  if (archetipiComuniScoperti.length === 0) {
    problemi.push("nessuna risorsa comune raggiungibile nell'area sicura iniziale");
  }

  if (state.missioni.length < 20) problemi.push(`numero di missioni insufficiente (${state.missioni.length}, minimo 20)`);
  const principali = state.missioni.filter((m) => m.principale);
  if (principali.length !== 1) problemi.push(`deve esserci esattamente una missione principale (trovate ${principali.length})`);
  if (principali[0] && principali[0].stato !== "attiva") problemi.push("la missione principale deve essere attiva fin da subito");
  const idMissioniUnici = new Set(state.missioni.map((m) => m.id));
  if (idMissioniUnici.size !== state.missioni.length) problemi.push("id missione duplicato");

  if (state.mercatoCarte.slots.length !== MERCATO_CARTE.numeroSlot) {
    problemi.push("numero di slot del mercato carte non corretto");
  }

  const tecnologieDuplicate = state.ricerca.progettiAttivi.filter(
    (p) => state.ricerca.completate.includes(p.tecnologiaId) || state.ricerca.progettiAttivi.filter((q) => q.tecnologiaId === p.tecnologiaId).length > 1,
  );
  if (tecnologieDuplicate.length > 0) problemi.push("progetto di ricerca duplicato o gia' completato");
  if (new Set(state.ricerca.completate).size !== state.ricerca.completate.length) {
    problemi.push("tecnologia completata duplicata");
  }

  const idModuliUnici = new Set(state.moduli.map((m) => m.instanceId));
  if (idModuliUnici.size !== state.moduli.length) problemi.push("id modulo duplicato");
  for (const modulo of state.moduli) {
    if (modulo.naveMinerariaId !== null && !state.naviMinerarie.some((n) => n.id === modulo.naveMinerariaId)) {
      problemi.push(`modulo ${modulo.instanceId} assegnato a una nave inesistente`);
    }
  }

  if (!Number.isInteger(state.numeroRegione) || state.numeroRegione < 1) {
    problemi.push("numeroRegione non valido");
  }

  for (const civilta of state.civilta) {
    if (civilta.relazione < 0 || civilta.relazione > 100) problemi.push(`civilta' ${civilta.id} con relazione fuori range`);
  }
  const idCivilta = new Set(state.civilta.map((c) => c.id));
  if (idCivilta.size !== state.civilta.length) problemi.push("id civilta' duplicato");

  for (const pericolo of state.pericoli) {
    if (pericolo.intensita < 0 || pericolo.intensita > 1) problemi.push(`pericolo ${pericolo.id} con intensita' fuori range`);
  }
  const idPericoli = new Set(state.pericoli.map((p) => p.id));
  if (idPericoli.size !== state.pericoli.length) problemi.push("id pericolo duplicato");

  if (state.eventi.attivi.length > EVENTI_CONFIG.attiviMax) problemi.push("troppi eventi attivi contemporaneamente");
  const idEventi = new Set(state.eventi.attivi.map((e) => e.id));
  if (idEventi.size !== state.eventi.attivi.length) problemi.push("id evento duplicato");

  const idSceneUniche = new Set(state.campagna.sceneCompletate);
  if (idSceneUniche.size !== state.campagna.sceneCompletate.length) problemi.push("scena narrativa completata duplicata");
  for (const valore of Object.values(state.campagna.allineamento)) {
    if (valore < 0) problemi.push("allineamento narrativo negativo");
  }

  return problemi;
}
