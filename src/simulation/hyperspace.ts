import { HYPERSPACE } from "../domain/hyperspace";
import { generaMissioni } from "../world/missionGenerator";
import { generaRegione } from "../world/regionGenerator";
import { seedProssimaRegione } from "../world/hyperspacePreview";
import type { GameState, ResourceType, ShuttleEntity } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { bonusRicerca } from "./research";

// Salto iperspaziale (B6, CONFERMATO, Macrostep 8): sbloccato da ricerca,
// richiede la carta Iperspazio, costa 60 carburante, irreversibile, nessun
// ritorno. "Carta e carburante consumati soltanto quando il salto avviene
// davvero": validaGiocaCarta/applicaGiocaCarta (cardEffects.ts) seguono lo
// stesso flusso valida -> conferma -> applica di ogni altra carta (A2), per
// cui Annulla sulla modale di conferma non ha alcun effetto per costruzione.

function cargoTotale(carico: Partial<Record<ResourceType, number>>): number {
  return Object.values(carico).reduce((somma: number, q) => somma + (q ?? 0), 0);
}

export function validaSaltoIperspaziale(stato: GameState): CommandValidationResult {
  if (!bonusRicerca(stato).iperspazioSbloccato) {
    return { ok: false, motivo: "tecnologia Iperspazio non ancora sbloccata" };
  }
  if (stato.mothership.carburante < HYPERSPACE.costoCarburante) {
    return { ok: false, motivo: "carburante insufficiente per il salto" };
  }
  return { ok: true };
}

/** Richiama le navette: il carico gia' a bordo (materiale gia' estratto,
 * fisicamente sulla navetta) viene trasferito nella stiva della nave madre
 * per quanto possibile, esattamente come un normale scarico (nessuna
 * perdita ne' duplicazione se la stiva e' piena: l'eccedenza resta sulla
 * navetta, che comunque segue la nave madre nel salto). Il materiale
 * ancora depositato nei contratti minerari (non ancora ritirato da una
 * navetta) va invece perso per abbandono (B6): i contratti stessi
 * riguardano pianeti della vecchia regione, irraggiungibile dopo il salto. */
function richiamaNavette(stato: GameState): { navette: ShuttleEntity[]; stivaCarico: Partial<Record<ResourceType, number>> } {
  let stivaCarico = { ...stato.mothership.stivaCarico };

  const navette = stato.navette.map((navetta): ShuttleEntity => {
    let caricoResiduo = { ...navetta.caricoAttuale };
    for (const chiave of Object.keys(navetta.caricoAttuale) as ResourceType[]) {
      const quantita = navetta.caricoAttuale[chiave] ?? 0;
      if (quantita <= 0) continue;
      const spazioStiva = stato.mothership.stivaCapacita - cargoTotale(stivaCarico);
      const trasferito = Math.min(quantita, Math.max(0, spazioStiva));
      if (trasferito <= 0) continue;
      stivaCarico = { ...stivaCarico, [chiave]: (stivaCarico[chiave] ?? 0) + trasferito };
      caricoResiduo = { ...caricoResiduo, [chiave]: quantita - trasferito };
    }
    return {
      ...navetta,
      stato: "libera",
      posizione: { x: 0, y: 0 },
      destinazione: null,
      contrattoAssegnatoId: null,
      tempoAttesaMs: 0,
      caricoAttuale: caricoResiduo,
    };
  });

  return { navette, stivaCarico };
}

export interface RisultatoSaltoIperspaziale {
  stato: GameState;
  notifiche: string[];
}

/** Esegue il salto: genera la nuova regione (deterministica dal seed di
 * carriera + numero di regione, la stessa che l'anteprima avrebbe gia'
 * mostrato), interrompe i contratti minerari attivi, richiama la flotta e
 * trasferisce tutto cio' che B6 elenca come "globale" (nave madre, navi,
 * moduli, stiva, crediti, carte, fiducia, progressione di ricerca, cargo
 * gia' sulle navette); pianeti/relitti/missioni della vecchia regione non
 * vengono portati nella nuova (B6: "giacimenti, relazioni locali, missioni
 * regionali e scoperte rimangono nella vecchia regione"). */
export function applicaSaltoIperspaziale(stato: GameState): RisultatoSaltoIperspaziale {
  const numeroRegione = stato.numeroRegione + 1;
  const seedRegione = seedProssimaRegione(stato);
  const nuovaRegione = generaRegione(seedRegione);
  const nuoveMissioni = generaMissioni(seedRegione, nuovaRegione);

  const { navette, stivaCarico } = richiamaNavette(stato);
  const naviMinerarie = stato.naviMinerarie.map((n) => ({ ...n, contrattoAttivoId: null }));

  const nuovoStato: GameState = {
    ...stato,
    numeroRegione,
    mothership: {
      ...stato.mothership,
      posizione: { x: 0, y: 0 },
      orientamento: 0,
      velocita: 0,
      percorso: [],
      carburante: stato.mothership.carburante - HYPERSPACE.costoCarburante,
      stivaCarico,
    },
    navette,
    naviMinerarie,
    contrattiMinerari: [],
    pianeti: nuovaRegione.pianeti,
    campiRelitti: nuovaRegione.campiRelitti,
    areaSicuraIniziale: nuovaRegione.areaSicuraIniziale,
    pianetaSelezionatoId: null,
    missioni: nuoveMissioni,
    civilta: nuovaRegione.civilta,
    pericoli: nuovaRegione.pericoli,
    // Eventi attivi erano legati alla vecchia regione (es. relazioneCivilta
    // su una civilta' ora irraggiungibile): abbandonati come le missioni;
    // il ritmo di generazione (contatore/soglia) resta invariato, B9 non lo
    // lega alla regione.
    eventi: { ...stato.eventi, attivi: [] },
  };

  return {
    stato: nuovoStato,
    notifiche: [`Salto iperspaziale completato: regione ${numeroRegione} raggiunta.`],
  };
}
