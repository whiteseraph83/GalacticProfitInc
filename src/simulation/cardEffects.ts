import { CARD_DEFINITIONS } from "../domain/cards";
import { CARD_EFFECTS } from "../domain/cardEffectsConfig";
import { FABBRICA_COSTO } from "../domain/refineRecipes";
import { TECNOLOGIE } from "../domain/research";
import { BALANCE } from "../domain/initialState";
import type { SeededRng } from "../domain/rng";
import type { CardCode, CardInstance, EntityId, GameState, MiningContract, Vector2 } from "../domain/types";
import type { BersaglioCarta, CommandValidationResult } from "./commands";
import { consumaTolleranzaRevisione, registraRicavo, registraSpesa } from "./economy";
import { bonusEstrazioneModuli } from "./modules";
import { applicaAvviaRicerca, bonusRicerca, validaAvviaRicerca } from "./research";
import { applicaSaltoIperspaziale, validaSaltoIperspaziale } from "./hyperspace";

// Logica delle carte attivabili (Esplora, Investiga, Contratto minerario,
// Recupera rottami, Fabbrica, Rifornimento). Ricerca resta "non attivabile"
// (vedi CardDefinition.attivabile): la sua azione reale e' Macrostep 7.
// Funzioni pure, testabili senza aprire un browser, nello stesso stile di
// src/simulation/logistics.ts.

function distanza(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function validaGiocaCarta(stato: GameState, cardInstanceId: EntityId, bersaglio: BersaglioCarta): CommandValidationResult {
  if (stato.gameOver) return { ok: false, motivo: "partita terminata" };
  const carta = stato.manoCarte.find((c) => c.instanceId === cardInstanceId);
  if (!carta) return { ok: false, motivo: "carta non presente in mano" };

  const def = CARD_DEFINITIONS[carta.code];
  if (!def.attivabile) {
    return { ok: false, motivo: `${def.nome} non e' ancora attivabile in questo macrostep` };
  }

  switch (carta.code) {
    case "OPS-01": {
      const punto = bersaglio.punto;
      if (!punto || !Number.isFinite(punto.x) || !Number.isFinite(punto.y)) {
        return { ok: false, motivo: "bersaglio non valido per Esplora" };
      }
      return { ok: true };
    }
    case "OPS-02": {
      const pianeta = bersaglio.planetId ? stato.pianeti.find((p) => p.id === bersaglio.planetId) : undefined;
      if (!pianeta || !pianeta.scoperto) return { ok: false, motivo: "il pianeta non e' stato scoperto" };
      if (pianeta.investigato) return { ok: false, motivo: "il pianeta e' gia' stato investigato" };
      if (pianeta.investigazioneCompletataAlMs !== null) {
        return { ok: false, motivo: "investigazione gia' in corso su questo pianeta" };
      }
      return { ok: true };
    }
    case "IND-01": {
      const pianeta = bersaglio.planetId ? stato.pianeti.find((p) => p.id === bersaglio.planetId) : undefined;
      if (!pianeta || !pianeta.investigato) return { ok: false, motivo: "il pianeta non e' stato investigato" };
      const contrattoAttivo = stato.contrattiMinerari.find((c) => c.pianetaId === pianeta.id && c.attivo);
      if (contrattoAttivo) return { ok: false, motivo: "esiste gia' un contratto attivo su questo pianeta" };
      const naveDisponibile = stato.naviMinerarie.find((n) => n.contrattoAttivoId === null);
      if (!naveDisponibile) return { ok: false, motivo: "nessuna nave mineraria disponibile" };
      if (stato.crediti < CARD_EFFECTS.contrattoMinerario.costoIniziale) {
        return { ok: false, motivo: "crediti insufficienti per avviare il contratto" };
      }
      return { ok: true };
    }
    case "OPS-03": {
      const relitto = bersaglio.relittoId ? stato.campiRelitti.find((r) => r.id === bersaglio.relittoId) : undefined;
      if (!relitto || !relitto.scoperto || relitto.recuperato) {
        return { ok: false, motivo: "relitto non disponibile per il recupero" };
      }
      return { ok: true };
    }
    case "IND-02": {
      if (stato.fabbrica.costruita) return { ok: false, motivo: "la fabbrica e' gia' stata costruita" };
      if (stato.crediti < FABBRICA_COSTO.crediti) return { ok: false, motivo: "crediti insufficienti" };
      if ((stato.mothership.stivaCarico.ferro ?? 0) < FABBRICA_COSTO.ferro) {
        return { ok: false, motivo: "ferro grezzo insufficiente in stiva" };
      }
      return { ok: true };
    }
    case "LOG-01": {
      if ((stato.mothership.stivaCarico.carburante ?? 0) <= 0) {
        return { ok: false, motivo: "nessun carburante raffinato in stiva" };
      }
      if (stato.mothership.carburante >= stato.mothership.serbatoioCapacita) {
        return { ok: false, motivo: "il serbatoio e' gia' pieno" };
      }
      return { ok: true };
    }
    case "RSH-01": {
      if (!bersaglio.tecnologiaId) return { ok: false, motivo: "nessun progetto di ricerca selezionato" };
      return validaAvviaRicerca(stato, bersaglio.tecnologiaId);
    }
    case "IPS-01":
      return validaSaltoIperspaziale(stato);
    case "RAR-01": {
      const civilta = bersaglio.civiltaId ? stato.civilta.find((c) => c.id === bersaglio.civiltaId) : undefined;
      if (!civilta || !civilta.scoperta) return { ok: false, motivo: "civilta' non disponibile" };
      return { ok: true };
    }
    case "RAR-02":
      return { ok: true };
    default:
      return { ok: false, motivo: "carta non gestita in questo macrostep" };
  }
}

export interface RisultatoGiocaCarta {
  stato: GameState;
  notifiche: string[];
}

/** Applica l'effetto di una carta gia' validata (dispatch() la rivalida
 * comunque, difesa in profondita' - A2). Consuma la carta e incrementa il
 * contatore di revisione atomicamente insieme all'effetto. */
export function applicaGiocaCarta(stato: GameState, cardInstanceId: EntityId, bersaglio: BersaglioCarta, rng: SeededRng): RisultatoGiocaCarta {
  const carta = stato.manoCarte.find((c) => c.instanceId === cardInstanceId);
  if (!carta) return { stato, notifiche: [] };

  let nuovoStato: GameState = {
    ...stato,
    manoCarte: stato.manoCarte.filter((c) => c.instanceId !== cardInstanceId),
    review: {
      ...stato.review,
      carteGiocateTotali: stato.review.carteGiocateTotali + 1,
      carteGiocateDallUltimaRevisione: stato.review.carteGiocateDallUltimaRevisione + 1,
    },
    eventi: { ...stato.eventi, carteGiocateDallUltimo: stato.eventi.carteGiocateDallUltimo + 1 },
  };
  const notifiche: string[] = [];

  switch (carta.code) {
    case "OPS-01": {
      const centro = bersaglio.punto as Vector2;
      const raggio = CARD_EFFECTS.esplora.raggioRivelazione;
      let scoperti = 0;
      const pianeti = nuovoStato.pianeti.map((p) => {
        if (p.scoperto || distanza(p.posizione, centro) > raggio) return p;
        scoperti += 1;
        return { ...p, scoperto: true };
      });
      const campiRelitti = nuovoStato.campiRelitti.map((r) => {
        if (r.scoperto || distanza(r.posizione, centro) > raggio) return r;
        return { ...r, scoperto: true };
      });
      nuovoStato = { ...nuovoStato, pianeti, campiRelitti };
      notifiche.push(
        scoperti > 0 ? `Esplorazione completata: ${scoperti} nuovo/i corpo/i rilevato/i.` : "Esplorazione completata: nessun nuovo corpo nella zona.",
      );
      break;
    }
    case "OPS-02": {
      const pianeta = nuovoStato.pianeti.find((p) => p.id === bersaglio.planetId);
      if (!pianeta) break;
      const durataSec = rng.nextFloat(CARD_EFFECTS.investiga.durataMinSec, CARD_EFFECTS.investiga.durataMaxSec);
      const completataAlMs = nuovoStato.tempoSimulatoMs + durataSec * 1000;
      // Richiesta utente: anche l'Investiga deve mandare visibilmente una
      // navetta verso il pianeta (prima solo il Contratto minerario lo
      // faceva); se nessuna navetta e' libera l'investigazione procede
      // comunque, solo senza animazione.
      const navettaLibera = nuovoStato.navette.find((n) => n.stato === "libera");
      nuovoStato = {
        ...nuovoStato,
        pianeti: nuovoStato.pianeti.map((p) => (p.id === pianeta.id ? { ...p, investigazioneCompletataAlMs: completataAlMs } : p)),
        navette: navettaLibera
          ? nuovoStato.navette.map((n) =>
              n.id === navettaLibera.id
                ? { ...n, stato: "inViaggio" as const, destinazione: pianeta.posizione, pianetaInvestigazioneId: pianeta.id, tempoAttesaMs: 0 }
                : n,
            )
          : nuovoStato.navette,
      };
      notifiche.push(`Investigazione avviata su ${pianeta.nome}.`);
      break;
    }
    case "IND-01": {
      const pianeta = nuovoStato.pianeti.find((p) => p.id === bersaglio.planetId);
      const nave = nuovoStato.naviMinerarie.find((n) => n.contrattoAttivoId === null);
      if (!pianeta || !nave) break;
      const costo = CARD_EFFECTS.contrattoMinerario.costoIniziale;
      const estrazioneAlMinuto =
        nave.estrazioneBaseAlMinuto * bonusRicerca(nuovoStato).moltiplicatoreEstrazione + bonusEstrazioneModuli(nuovoStato, nave.id);
      const contratto: MiningContract = {
        id: `contratto-${pianeta.id}-${nuovoStato.tempoSimulatoMs}`,
        pianetaId: pianeta.id,
        naveMinerariaId: nave.id,
        risorsa: pianeta.risorsaDominante,
        giacimentoResiduo: pianeta.giacimentoTotale,
        estrazioneAlMinuto,
        depositoAccumulato: 0,
        priorita: 1,
        ultimaAssegnazioneMs: nuovoStato.tempoSimulatoMs,
        attivo: true,
      };
      nuovoStato = {
        ...nuovoStato,
        crediti: nuovoStato.crediti - costo,
        contrattiMinerari: [...nuovoStato.contrattiMinerari, contratto],
        naviMinerarie: nuovoStato.naviMinerarie.map((n) => (n.id === nave.id ? { ...n, contrattoAttivoId: contratto.id } : n)),
      };
      nuovoStato = registraSpesa(nuovoStato, costo);
      notifiche.push(`Contratto minerario avviato su ${pianeta.nome}.`);
      break;
    }
    case "OPS-03": {
      const relitto = nuovoStato.campiRelitti.find((r) => r.id === bersaglio.relittoId);
      if (!relitto) break;
      const ricompensa = rng.nextInt(CARD_EFFECTS.recuperaRottami.ricompensaCreditiMin, CARD_EFFECTS.recuperaRottami.ricompensaCreditiMax);
      nuovoStato = {
        ...nuovoStato,
        crediti: nuovoStato.crediti + ricompensa,
        campiRelitti: nuovoStato.campiRelitti.map((r) => (r.id === relitto.id ? { ...r, recuperato: true } : r)),
      };
      nuovoStato = registraRicavo(nuovoStato, ricompensa);
      notifiche.push(`Recupero rottami completato: +${ricompensa} Cr.`);
      break;
    }
    case "IND-02": {
      const ferroAttuale = nuovoStato.mothership.stivaCarico.ferro ?? 0;
      nuovoStato = {
        ...nuovoStato,
        crediti: nuovoStato.crediti - FABBRICA_COSTO.crediti,
        mothership: {
          ...nuovoStato.mothership,
          stivaCarico: { ...nuovoStato.mothership.stivaCarico, ferro: ferroAttuale - FABBRICA_COSTO.ferro },
        },
        fabbrica: { ...nuovoStato.fabbrica, costruita: true },
      };
      nuovoStato = registraSpesa(nuovoStato, FABBRICA_COSTO.crediti);
      notifiche.push("Fabbrica costruita a bordo della nave madre.");
      break;
    }
    case "LOG-01": {
      const nave = nuovoStato.mothership;
      const disponibileStiva = nave.stivaCarico.carburante ?? 0;
      const spazioSerbatoio = nave.serbatoioCapacita - nave.carburante;
      const trasferito = Math.min(disponibileStiva, spazioSerbatoio);
      nuovoStato = {
        ...nuovoStato,
        mothership: {
          ...nave,
          carburante: nave.carburante + trasferito,
          stivaCarico: { ...nave.stivaCarico, carburante: disponibileStiva - trasferito },
        },
      };
      notifiche.push(`Rifornimento completato: +${trasferito} carburante nel serbatoio.`);
      break;
    }
    case "RSH-01": {
      const tecnologiaId = bersaglio.tecnologiaId as string;
      nuovoStato = applicaAvviaRicerca(nuovoStato, tecnologiaId);
      notifiche.push(`Progetto di ricerca avviato: ${TECNOLOGIE[tecnologiaId]?.nome ?? tecnologiaId}.`);
      break;
    }
    case "IPS-01": {
      const risultato = applicaSaltoIperspaziale(nuovoStato);
      nuovoStato = risultato.stato;
      notifiche.push(...risultato.notifiche);
      break;
    }
    case "RAR-01": {
      const civilta = nuovoStato.civilta.find((c) => c.id === bersaglio.civiltaId);
      if (!civilta) break;
      const relazione = Math.min(100, civilta.relazione + CARD_EFFECTS.diplomaziaLampo.bonusRelazione);
      nuovoStato = { ...nuovoStato, civilta: nuovoStato.civilta.map((c) => (c.id === civilta.id ? { ...c, relazione } : c)) };
      notifiche.push(`Relazione con ${civilta.nome} migliorata di ${CARD_EFFECTS.diplomaziaLampo.bonusRelazione}.`);
      break;
    }
    case "RAR-02": {
      nuovoStato = {
        ...nuovoStato,
        mothership: { ...nuovoStato.mothership, immunitaPericoliFinoMs: nuovoStato.tempoSimulatoMs + CARD_EFFECTS.fugaDEmergenza.durataImmunitaMs },
      };
      notifiche.push("Fuga d'emergenza: nave madre immune ai pericoli regionali per un periodo limitato.");
      break;
    }
  }

  // Una carta giocata con successo, se la quota e' dovuta/in tolleranza,
  // consuma una carta di tolleranza (B3); puo' terminare la partita.
  const risultatoTolleranza = consumaTolleranzaRevisione(nuovoStato);
  nuovoStato = risultatoTolleranza.stato;
  notifiche.push(...risultatoTolleranza.notifiche);

  return { stato: nuovoStato, notifiche };
}

/** Completa le investigazioni il cui timer e' scaduto (B1/B2: Investiga
 * richiede 10-30s, non e' istantanea). */
export function integraInvestigazioni(stato: GameState): RisultatoGiocaCarta {
  let cambiato = false;
  const notifiche: string[] = [];
  const idPianetiCompletati = new Set<EntityId>();
  const pianeti = stato.pianeti.map((p) => {
    if (p.investigazioneCompletataAlMs === null || stato.tempoSimulatoMs < p.investigazioneCompletataAlMs) return p;
    cambiato = true;
    idPianetiCompletati.add(p.id);
    notifiche.push(`Investigazione completata: ${p.nome}.`);
    return { ...p, investigato: true, investigazioneCompletataAlMs: null };
  });
  if (!cambiato) return { stato, notifiche };
  // Richiama a bordo la navetta mandata a investigare il pianeta, cosi'
  // riparte visibilmente verso la nave madre invece di restare ferma li'.
  const navette = stato.navette.map((n) =>
    n.pianetaInvestigazioneId && idPianetiCompletati.has(n.pianetaInvestigazioneId)
      ? { ...n, stato: "ritorno" as const, destinazione: stato.mothership.posizione, tempoAttesaMs: 0 }
      : n,
  );
  return { stato: { ...stato, pianeti, navette }, notifiche };
}

/** Deduce il costo operativo dei contratti minerari attivi (B1); se i
 * crediti non bastano il contratto si sospende invece di andare in
 * negativo (G1: "il denaro non scende sotto zero per costi automatici"). */
export function integraCostoOperativoContratti(stato: GameState, dtMs: number): RisultatoGiocaCarta {
  if (stato.contrattiMinerari.length === 0) return { stato, notifiche: [] };
  const dtMin = dtMs / 60000;
  const moltiplicatoreCosti = Math.max(0, bonusRicerca(stato).moltiplicatoreCosti);
  const costoPerContratto = CARD_EFFECTS.contrattoMinerario.costoOperativoAlMinuto * dtMin * moltiplicatoreCosti;
  if (costoPerContratto <= 0) return { stato, notifiche: [] };

  let crediti = stato.crediti;
  let cambiato = false;
  let spesaTotale = 0;
  const notifiche: string[] = [];

  const contratti = stato.contrattiMinerari.map((contratto) => {
    if (!contratto.attivo) return contratto;
    if (crediti >= costoPerContratto) {
      crediti -= costoPerContratto;
      spesaTotale += costoPerContratto;
      cambiato = true;
      return contratto;
    }
    spesaTotale += crediti;
    crediti = 0;
    cambiato = true;
    notifiche.push("Contratto minerario sospeso: crediti insufficienti per i costi operativi.");
    return { ...contratto, attivo: false };
  });

  if (!cambiato) return { stato, notifiche };
  const nuovoStato = registraSpesa({ ...stato, crediti, contrattiMinerari: contratti }, spesaTotale);
  return { stato: nuovoStato, notifiche };
}

let autoCardCounter = 0;
function nextAutoCardId(): string {
  autoCardCounter += 1;
  return `card-auto-${autoCardCounter}`;
}

/** Genera una carta casuale ogni intervalloGenerazioneCarteMs di tempo
 * attivo; sospesa (non accumulata) se la mano e' piena (B2, CONFERMATO). */
export function integraGenerazioneCarte(stato: GameState, rng: SeededRng): RisultatoGiocaCarta {
  const intervalloEffettivo = Math.max(
    BALANCE.intervalloGenerazioneCarteMinimoMs,
    BALANCE.intervalloGenerazioneCarteMs + bonusRicerca(stato).riduzioneIntervalloGenerazioneCarteMs,
  );
  if (stato.tempoSimulatoMs - stato.ultimaGenerazioneCarteMs < intervalloEffettivo) {
    return { stato, notifiche: [] };
  }
  if (stato.manoCarte.length >= stato.capacitaManoCarte) {
    return { stato: { ...stato, ultimaGenerazioneCarteMs: stato.tempoSimulatoMs }, notifiche: [] };
  }

  const codici = Object.keys(CARD_DEFINITIONS) as CardCode[];
  const code = rng.pick(codici);
  const nuovaCarta: CardInstance = { instanceId: nextAutoCardId(), code, livello: 1 };

  return {
    stato: {
      ...stato,
      manoCarte: [...stato.manoCarte, nuovaCarta],
      ultimaGenerazioneCarteMs: stato.tempoSimulatoMs,
    },
    notifiche: [`Nuova carta ricevuta: ${CARD_DEFINITIONS[code].nome}.`],
  };
}
