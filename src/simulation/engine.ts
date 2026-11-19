import { BALANCE, creaStatoIniziale } from "../domain/initialState";
import { TECNOLOGIE } from "../domain/research";
import { WORLD } from "../domain/worldConstants";
import { SeededRng } from "../domain/rng";
import type { EntityId, GameState, NotificationEntry, Vector2 } from "../domain/types";
import { calcolaPercorso } from "./pathfinding";
import { applicaAnnullaContrattoMinerario, integraEstrazione, integraNavette, validaAnnullaContrattoMinerario } from "./logistics";
import {
  applicaAvviaEsplorazione,
  applicaGiocaCarta,
  integraCostoOperativoContratti,
  integraEsplorazione,
  integraInvestigazioni,
  validaAvviaEsplorazione,
  validaGiocaCarta,
} from "./cardEffects";
import { applicaAccodaRaffinazione, integraRaffinazione, validaAccodaRaffinazione } from "./factory";
import {
  applicaAcquistaRisorsa,
  applicaPagaQuotaRevisione,
  applicaVendiCartaMano,
  applicaVendiRisorsa,
  integraMercato,
  integraRevisione,
  validaAcquistaRisorsa,
  validaPagaQuotaRevisione,
  validaVendiCartaMano,
  validaVendiRisorsa,
} from "./economy";
import {
  applicaAbbandonaMissione,
  applicaAccettaMissione,
  integraMissioni,
  validaAbbandonaMissione,
  validaAccettaMissione,
} from "./missions";
import {
  applicaAcquistaCartaMercato,
  integraRotazioneMercatoCarte,
  validaAcquistaCartaMercato,
} from "./cardMarket";
import { applicaAcquistaNaveMineraria, validaAcquistaNaveMineraria } from "./fleet";
import {
  applicaCraftModulo,
  applicaEquipaggiaModulo,
  applicaRimuoviModulo,
  validaCraftModulo,
  validaEquipaggiaModulo,
  validaRimuoviModulo,
} from "./modules";
import { applicaAvviaRicerca, bonusRicerca, integraRicerca, validaAvviaRicerca } from "./research";
import {
  applicaCommerciaConCivilta,
  applicaInviaDonoCivilta,
  integraRichiesteCivilta,
  validaCommerciaConCivilta,
  validaInviaDonoCivilta,
} from "./civilizations";
import { integraPericoli, moltiplicatoreVelocitaPericoli } from "./hazards";
import {
  applicaIgnoraEvento,
  applicaSceltaEvento,
  integraGenerazioneEventi,
  validaIgnoraEvento,
  validaSceltaEvento,
} from "./events";
import { applicaSceltaNarrativa, integraCampagna, validaSceltaNarrativa } from "./narrative";
import type { CommandValidationResult, GameCommand } from "./commands";

/** Il contatore riparte dal massimo id gia' presente nelle notifiche dello
 * stato di partenza (nuovo o ripreso da salvataggio): un contatore
 * module-level sempre azzerato a ogni reload avrebbe prodotto id duplicati
 * nel resume di una partita che gia' contava notifiche precedenti (bug
 * osservato in verifica manuale: chiavi React duplicate "notif-1"). */
function massimoIdNotificaEsistente(notifiche: NotificationEntry[]): number {
  let massimo = 0;
  for (const n of notifiche) {
    const numero = Number(n.id.replace("notif-", ""));
    if (Number.isFinite(numero) && numero > massimo) massimo = numero;
  }
  return massimo;
}

function distanza(a: Vector2, b: Vector2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

const EPSILON_ARRIVO = 2;

/**
 * Motore di simulazione: nessuna dipendenza da React o PixiJS, cosi' da
 * poter essere testato senza aprire un browser. La UI comunica con il
 * motore esclusivamente attraverso dispatch(command).
 */
export class SimulationEngine {
  private state: GameState;
  private listeners = new Set<() => void>();
  private appliedCommandIds = new Set<EntityId>();
  private notificationCounter: number;
  /** RNG dedicato alle carte (durata investigazioni, generazione passiva,
   * ricompense), separato dal seed di generazione mondo ma comunque
   * deterministico per partita. */
  private readonly cardRng: SeededRng;

  /** Sub-step fisso per l'integrazione: la produzione non dipende dai frame. */
  private readonly subStepMs = 100;
  /** Limite di recupero per singola chiamata a update(), evita loop patologici
   * se la tab resta in background molto a lungo prima di tornare in primo piano. */
  private readonly maxCatchUpMsPerUpdate = 2000;

  /** Se statoSalvato e' fornito (resume da un salvataggio, Macrostep 5), il
   * motore riparte esattamente da quello stato invece di generarne uno
   * nuovo; il seed resta quello della partita per mantenere deterministico
   * l'RNG delle carte. */
  constructor(seed: string, statoSalvato?: GameState) {
    this.state = statoSalvato ?? creaStatoIniziale(seed);
    this.cardRng = new SeededRng(`${seed}|carte`);
    this.notificationCounter = massimoIdNotificaEsistente(this.state.notifiche);
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  /** Sostituisce lo stato corrente (import di un salvataggio, Macrostep 5).
   * Il chiamante deve aver gia' validato lo stato (`validaStato`). Azzera i
   * comandi applicati: e' l'inizio di una nuova sessione sullo stato
   * importato, nessun comando precedente deve restare "gia' applicato". */
  caricaStato(nuovoStato: GameState): void {
    this.state = nuovoStato;
    this.appliedCommandIds.clear();
    this.notificationCounter = massimoIdNotificaEsistente(this.state.notifiche);
    this.emitChange();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }

  private notify(testo: string, livello: NotificationEntry["livello"] = "info"): void {
    this.notificationCounter += 1;
    const entry: NotificationEntry = {
      id: `notif-${this.notificationCounter}`,
      timestampSimMs: this.state.tempoSimulatoMs,
      testo,
      livello,
    };
    this.state = { ...this.state, notifiche: [...this.state.notifiche, entry] };
  }

  /**
   * Flusso: valida -> applica in modo atomico -> notifica. Il comando viene
   * applicato al massimo una volta: lo stesso id ripetuto (doppio click,
   * callback duplicata) viene rifiutato senza effetti.
   */
  dispatch(command: GameCommand): CommandValidationResult {
    if (this.appliedCommandIds.has(command.id)) {
      return { ok: false, motivo: "comando gia' applicato (protezione doppio click)" };
    }
    const validazione = this.validate(command);
    if (!validazione.ok) return validazione;

    this.apply(command);
    this.appliedCommandIds.add(command.id);
    this.emitChange();
    return { ok: true };
  }

  private validate(command: GameCommand): CommandValidationResult {
    if (this.state.gameOver && command.type !== "ui/togglePause") {
      return { ok: false, motivo: "partita terminata (Game Over)" };
    }
    switch (command.type) {
      case "ui/togglePause":
        return { ok: true };
      case "ui/moveMothership": {
        const { x, y } = command.payload.destinazione;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return { ok: false, motivo: "destinazione non valida" };
        }
        if (this.state.mothership.carburante <= 0) {
          return { ok: false, motivo: "carburante esaurito: movimento non autorizzato" };
        }
        return { ok: true };
      }
      case "ui/selectPlanet": {
        const { planetId } = command.payload;
        if (planetId === null) return { ok: true };
        const pianeta = this.state.pianeti.find((p) => p.id === planetId);
        if (!pianeta || !pianeta.scoperto) {
          return { ok: false, motivo: "pianeta inesistente o non ancora scoperto" };
        }
        return { ok: true };
      }
      case "ui/soccorsoCarburante": {
        if (this.state.review.soccorsoCarburanteUsato) {
          return { ok: false, motivo: "soccorso carburante gia' utilizzato in questa carriera" };
        }
        return { ok: true };
      }
      case "ui/giocaCarta":
        return validaGiocaCarta(this.state, command.payload.cardInstanceId, command.payload.bersaglio);
      case "ui/accodaRaffinazione":
        return validaAccodaRaffinazione(this.state, command.payload.ricettaId);
      case "ui/vendiRisorsa":
        return validaVendiRisorsa(this.state, command.payload.risorsa, command.payload.quantita);
      case "ui/acquistaRisorsa":
        return validaAcquistaRisorsa(this.state, command.payload.risorsa, command.payload.quantita);
      case "ui/pagaQuotaRevisione":
        return validaPagaQuotaRevisione(this.state);
      case "ui/accettaMissione":
        return validaAccettaMissione(this.state, command.payload.missioneId);
      case "ui/abbandonaMissione":
        return validaAbbandonaMissione(this.state, command.payload.missioneId);
      case "ui/acquistaCartaMercato":
        return validaAcquistaCartaMercato(this.state, command.payload.slotId);
      case "ui/acquistaNaveMineraria":
        return validaAcquistaNaveMineraria(this.state);
      case "ui/craftModulo":
        return validaCraftModulo(this.state, command.payload.moduloId);
      case "ui/equipaggiaModulo":
        return validaEquipaggiaModulo(this.state, command.payload.moduloInstanceId, command.payload.naveMinerariaId);
      case "ui/rimuoviModulo":
        return validaRimuoviModulo(this.state, command.payload.moduloInstanceId);
      case "ui/commerciaConCivilta":
        return validaCommerciaConCivilta(this.state, command.payload.civiltaId, command.payload.risorsa, command.payload.quantita);
      case "ui/inviaDonoCivilta":
        return validaInviaDonoCivilta(this.state, command.payload.civiltaId, command.payload.crediti);
      case "ui/sceltaEvento":
        return validaSceltaEvento(this.state, command.payload.eventoId, command.payload.scelteId);
      case "ui/ignoraEvento":
        return validaIgnoraEvento(this.state, command.payload.eventoId);
      case "ui/sceltaNarrativa":
        return validaSceltaNarrativa(this.state, command.payload.sceneId, command.payload.scelteId);
      case "ui/avviaRicerca":
        return validaAvviaRicerca(this.state, command.payload.tecnologiaId);
      case "ui/avviaEsplorazione":
        return validaAvviaEsplorazione(this.state);
      case "ui/annullaContrattoMinerario":
        return validaAnnullaContrattoMinerario(this.state, command.payload.contrattoId);
      case "ui/vendiCartaMano":
        return validaVendiCartaMano(this.state, command.payload.cardInstanceId);
      case "demo/confirmableAction":
        return { ok: true };
      default:
        return { ok: false, motivo: "comando sconosciuto" };
    }
  }

  private apply(command: GameCommand): void {
    switch (command.type) {
      case "ui/togglePause": {
        this.state = { ...this.state, inPausa: !this.state.inPausa };
        this.notify(this.state.inPausa ? "Simulazione in pausa." : "Simulazione ripresa.");
        return;
      }
      case "ui/moveMothership": {
        const nave = this.state.mothership;
        const destinazione = command.payload.destinazione;
        const ostacoli = this.state.pianeti
          .filter((p) => p.scoperto)
          // Un pianeta il cui raggio contiene gia' la destinazione e' il
          // bersaglio stesso del movimento (es. click sul pianeta per
          // raggiungerlo): va escluso dagli ostacoli da aggirare, altrimenti
          // il pathfinding tenta di aggirare proprio il punto di arrivo,
          // producendo un percorso a zig-zag invece di una linea diretta.
          .filter((p) => Math.hypot(p.posizione.x - destinazione.x, p.posizione.y - destinazione.y) > p.raggio)
          .map((p) => ({ posizione: p.posizione, raggio: p.raggio }));
        const percorso = calcolaPercorso(nave.posizione, destinazione, ostacoli, BALANCE.mothershipMargineOstacolo);
        this.state = { ...this.state, mothership: { ...nave, percorso } };
        this.notify("Nave madre diretta verso una nuova posizione.");
        return;
      }
      case "ui/selectPlanet": {
        this.state = { ...this.state, pianetaSelezionatoId: command.payload.planetId };
        return;
      }
      case "ui/soccorsoCarburante": {
        const nave = this.state.mothership;
        const carburante = Math.min(nave.serbatoioCapacita, nave.carburante + BALANCE.soccorsoCarburanteQuantita);
        this.state = {
          ...this.state,
          mothership: { ...nave, carburante },
          review: {
            ...this.state.review,
            fiducia: Math.max(0, this.state.review.fiducia - BALANCE.soccorsoCarburanteCostoFiducia),
            soccorsoCarburanteUsato: true,
          },
        };
        this.notify(
          `Soccorso carburante ricevuto: +${BALANCE.soccorsoCarburanteQuantita} carburante, -${BALANCE.soccorsoCarburanteCostoFiducia} fiducia.`,
          "attenzione",
        );
        return;
      }
      case "ui/giocaCarta": {
        const { stato, notifiche } = applicaGiocaCarta(this.state, command.payload.cardInstanceId, command.payload.bersaglio, this.cardRng);
        this.state = stato;
        for (const testo of notifiche) this.notify(testo);
        return;
      }
      case "ui/accodaRaffinazione": {
        this.state = applicaAccodaRaffinazione(this.state, command.payload.ricettaId);
        this.notify("Ricetta accodata in fabbrica.");
        return;
      }
      case "ui/vendiRisorsa": {
        this.state = applicaVendiRisorsa(this.state, command.payload.risorsa, command.payload.quantita);
        this.notify(`Venduto: ${command.payload.quantita} ${command.payload.risorsa}.`);
        return;
      }
      case "ui/acquistaRisorsa": {
        this.state = applicaAcquistaRisorsa(this.state, command.payload.risorsa, command.payload.quantita);
        this.notify(`Acquistato: ${command.payload.quantita} ${command.payload.risorsa}.`);
        return;
      }
      case "ui/pagaQuotaRevisione": {
        const { stato, notifiche } = applicaPagaQuotaRevisione(this.state);
        this.state = stato;
        for (const testo of notifiche) this.notify(testo, "attenzione");
        return;
      }
      case "ui/accettaMissione": {
        this.state = applicaAccettaMissione(this.state, command.payload.missioneId);
        this.notify("Missione accettata.");
        return;
      }
      case "ui/abbandonaMissione": {
        this.state = applicaAbbandonaMissione(this.state, command.payload.missioneId);
        this.notify("Missione abbandonata.");
        return;
      }
      case "ui/acquistaCartaMercato": {
        this.state = applicaAcquistaCartaMercato(this.state, command.payload.slotId);
        this.notify("Carta acquistata al mercato.");
        return;
      }
      case "ui/acquistaNaveMineraria": {
        this.state = applicaAcquistaNaveMineraria(this.state);
        this.notify("Nuova nave mineraria acquistata.");
        return;
      }
      case "ui/craftModulo": {
        this.state = applicaCraftModulo(this.state, command.payload.moduloId);
        this.notify("Modulo prodotto in fabbrica.");
        return;
      }
      case "ui/equipaggiaModulo": {
        this.state = applicaEquipaggiaModulo(this.state, command.payload.moduloInstanceId, command.payload.naveMinerariaId);
        this.notify("Modulo equipaggiato.");
        return;
      }
      case "ui/rimuoviModulo": {
        this.state = applicaRimuoviModulo(this.state, command.payload.moduloInstanceId);
        this.notify("Modulo rimosso, torna in magazzino.");
        return;
      }
      case "ui/commerciaConCivilta": {
        this.state = applicaCommerciaConCivilta(this.state, command.payload.civiltaId, command.payload.risorsa, command.payload.quantita);
        this.notify("Scambio commerciale completato.");
        return;
      }
      case "ui/inviaDonoCivilta": {
        this.state = applicaInviaDonoCivilta(this.state, command.payload.civiltaId, command.payload.crediti);
        this.notify("Dono inviato: relazione migliorata.");
        return;
      }
      case "ui/sceltaEvento": {
        const { stato, notifiche } = applicaSceltaEvento(this.state, command.payload.eventoId, command.payload.scelteId, this.cardRng);
        this.state = stato;
        for (const testo of notifiche) this.notify(testo);
        return;
      }
      case "ui/ignoraEvento": {
        this.state = applicaIgnoraEvento(this.state, command.payload.eventoId);
        return;
      }
      case "ui/sceltaNarrativa": {
        const { stato, notifiche } = applicaSceltaNarrativa(this.state, command.payload.sceneId, command.payload.scelteId);
        this.state = stato;
        for (const testo of notifiche) this.notify(testo);
        return;
      }
      case "ui/avviaRicerca": {
        this.state = applicaAvviaRicerca(this.state, command.payload.tecnologiaId);
        this.notify(`Progetto di ricerca avviato: ${TECNOLOGIE[command.payload.tecnologiaId]?.nome ?? command.payload.tecnologiaId}.`);
        return;
      }
      case "ui/avviaEsplorazione": {
        this.state = applicaAvviaEsplorazione(this.state, this.cardRng);
        this.notify("Esplorazione avviata.");
        return;
      }
      case "ui/annullaContrattoMinerario": {
        this.state = applicaAnnullaContrattoMinerario(this.state, command.payload.contrattoId);
        this.notify("Contratto minerario annullato.", "attenzione");
        return;
      }
      case "ui/vendiCartaMano": {
        const carta = this.state.manoCarte.find((c) => c.instanceId === command.payload.cardInstanceId);
        this.state = applicaVendiCartaMano(this.state, command.payload.cardInstanceId);
        if (carta) this.notify(`Comando venduto: ${carta.code}.`);
        return;
      }
      case "demo/confirmableAction": {
        this.notify("Azione dimostrativa eseguita (test del flusso di conferma).");
        return;
      }
    }
  }

  /** Avanza la simulazione a partire dal tempo reale trascorso (ms), con
   * sub-step fissi indipendenti dal frame rate della UI. */
  update(realElapsedMs: number): void {
    if (realElapsedMs <= 0) return;
    if (this.state.inPausa) return;
    if (this.state.gameOver) return;

    const elapsedClamped = Math.min(realElapsedMs, this.maxCatchUpMsPerUpdate);
    let remaining = elapsedClamped;
    while (remaining > 0) {
      const step = Math.min(this.subStepMs, remaining);
      this.integrate(step);
      remaining -= step;
    }
    this.emitChange();
  }

  private integrate(dtMs: number): void {
    this.state = { ...this.state, tempoSimulatoMs: this.state.tempoSimulatoMs + dtMs };
    this.integrateMothership(dtMs);
    this.integrateFogDiscovery();
    this.state = integraEstrazione(this.state, dtMs);
    this.state = integraNavette(this.state, dtMs);
    this.applicaRisultato(integraInvestigazioni(this.state));
    this.applicaRisultato(integraCostoOperativoContratti(this.state, dtMs));
    this.applicaRisultato(integraEsplorazione(this.state, this.cardRng));
    this.applicaRisultato(integraRaffinazione(this.state));
    this.applicaRisultato(integraMercato(this.state, this.cardRng));
    this.applicaRisultato(integraRevisione(this.state));
    this.applicaRisultato(integraMissioni(this.state));
    this.applicaRisultato(integraRotazioneMercatoCarte(this.state, this.cardRng));
    this.applicaRisultato(integraRicerca(this.state));
    this.applicaRisultato(integraPericoli(this.state, dtMs));
    this.applicaRisultato(integraRichiesteCivilta(this.state, this.cardRng));
    this.applicaRisultato(integraGenerazioneEventi(this.state, this.cardRng));
    this.applicaRisultato(integraCampagna(this.state));
    this.sincronizzaCapacitaManoCarte();
  }

  /** La capacita' massima della mano dipende dai bonus di ricerca (B2,
   * Macrostep 7): ricalcolata ogni tick dalla lista di tecnologie
   * completate (unica fonte di verita'), mai mantenuta come stato
   * indipendente che potrebbe disallinearsi. */
  private sincronizzaCapacitaManoCarte(): void {
    const capacitaManoCarte = BALANCE.capacitaManoCarteBase + bonusRicerca(this.state).capacitaManoCarteBonus;
    if (capacitaManoCarte !== this.state.capacitaManoCarte) {
      this.state = { ...this.state, capacitaManoCarte };
    }
  }

  private applicaRisultato(risultato: { stato: GameState; notifiche: string[] }): void {
    this.state = risultato.stato;
    for (const testo of risultato.notifiche) this.notify(testo);
  }

  /** Scopre pianeti/relitti quando la nave madre entra nel loro raggio di
   * visibilita'. La scoperta e' permanente (B4/A4: niente softlock casuale,
   * la mappa non "dimentica" cio' che e' gia' stato visitato). */
  private integrateFogDiscovery(): void {
    const posizioneNave = this.state.mothership.posizione;
    const raggioVisibilita = WORLD.visibilitaRaggio + bonusRicerca(this.state).raggioFogBonus;
    let cambiato = false;

    const pianetiAggiornati = this.state.pianeti.map((pianeta) => {
      if (pianeta.scoperto) return pianeta;
      if (distanza(posizioneNave, pianeta.posizione) > raggioVisibilita) return pianeta;
      cambiato = true;
      this.notify(`Nuovo corpo celeste rilevato: ${pianeta.nome}.`);
      return { ...pianeta, scoperto: true };
    });

    const relittiAggiornati = this.state.campiRelitti.map((relitto) => {
      if (relitto.scoperto) return relitto;
      if (distanza(posizioneNave, relitto.posizione) > raggioVisibilita) return relitto;
      cambiato = true;
      return { ...relitto, scoperto: true };
    });

    const civiltaAggiornate = this.state.civilta.map((civilta) => {
      if (civilta.scoperta) return civilta;
      if (distanza(posizioneNave, civilta.posizione) > raggioVisibilita) return civilta;
      cambiato = true;
      this.notify(`Civilta' locale rilevata: ${civilta.nome}.`);
      return { ...civilta, scoperta: true };
    });

    const pericoliAggiornati = this.state.pericoli.map((pericolo) => {
      if (pericolo.scoperto) return pericolo;
      if (distanza(posizioneNave, pericolo.posizione) > raggioVisibilita) return pericolo;
      cambiato = true;
      // Avviso proporzionato all'intensita' (B9: "rischi con avvisi proporzionati").
      const livello = pericolo.intensita >= 0.7 ? "critico" : "attenzione";
      this.notify(`Pericolo rilevato (${pericolo.tipo}, intensita' ${Math.round(pericolo.intensita * 100)}%).`, livello);
      return { ...pericolo, scoperto: true };
    });

    if (cambiato) {
      this.state = {
        ...this.state,
        pianeti: pianetiAggiornati,
        campiRelitti: relittiAggiornati,
        civilta: civiltaAggiornate,
        pericoli: pericoliAggiornati,
      };
    }
  }

  /**
   * Fisica della nave madre: accelerazione/decelerazione verso il primo
   * waypoint del percorso, rotazione limitata da una velocita' angolare
   * massima (A4: "accelerazione, rotazione e inerzia visibili"), consumo
   * di carburante proporzionale alla distanza EFFETTIVAMENTE percorsa. Se
   * il carburante finisce a meta' viaggio la nave si ferma (si crea uno
   * scenario recuperabile solo col soccorso carburante), senza che questo
   * conti come "movimento non autorizzato" (quello e' bloccato a monte,
   * in validate()).
   */
  private integrateMothership(dtMs: number): void {
    const nave = this.state.mothership;
    const dtSec = dtMs / 1000;

    if (nave.percorso.length === 0) {
      if (nave.velocita <= 0) return;
      const velocita = Math.max(0, nave.velocita - nave.accelerazione * dtSec);
      this.state = { ...this.state, mothership: { ...nave, velocita } };
      return;
    }

    const target = nave.percorso[0];
    const distanzaResidua = distanza(nave.posizione, target);
    const direzioneTarget = Math.atan2(target.y - nave.posizione.y, target.x - nave.posizione.x);
    const ultimoWaypoint = nave.percorso.length === 1;

    // Distanza di frenata necessaria per fermarsi esattamente sull'ultimo waypoint.
    const distanzaFrenata = (nave.velocita * nave.velocita) / (2 * nave.accelerazione || 1);
    const deveFrenare = ultimoWaypoint && distanzaResidua <= distanzaFrenata;
    const velocitaTarget = deveFrenare ? 0 : nave.velocitaMax * moltiplicatoreVelocitaPericoli(this.state);
    const deltaVelocita = nave.accelerazione * dtSec;
    let velocita = nave.velocita;
    if (velocita < velocitaTarget) velocita = Math.min(velocitaTarget, velocita + deltaVelocita);
    else if (velocita > velocitaTarget) velocita = Math.max(velocitaTarget, velocita - deltaVelocita);

    // Rotazione limitata: la nave "insegue" gradualmente la direzione del waypoint.
    let differenzaAngolo = direzioneTarget - nave.orientamento;
    differenzaAngolo = Math.atan2(Math.sin(differenzaAngolo), Math.cos(differenzaAngolo));
    const massimaRotazione = nave.velocitaAngolare * dtSec;
    const orientamento =
      nave.orientamento + Math.max(-massimaRotazione, Math.min(massimaRotazione, differenzaAngolo));

    let spostamento = velocita * dtSec;
    if (spostamento > distanzaResidua && ultimoWaypoint === false) {
      // Non frenare sui waypoint intermedi: li attraversiamo senza fermarci.
      spostamento = distanzaResidua;
    }

    // --- Consumo carburante, proporzionale alla distanza EFFETTIVA percorsa. ---
    let spostamentoEffettivo = Math.min(spostamento, distanzaResidua);
    const fuelNecessario = spostamentoEffettivo * BALANCE.mothershipConsumoCarburantePerUnita;
    let carburante = nave.carburante;
    let percorso = nave.percorso;
    let arrestataPerCarburante = false;

    if (fuelNecessario > carburante) {
      spostamentoEffettivo = carburante / BALANCE.mothershipConsumoCarburantePerUnita;
      carburante = 0;
      velocita = 0;
      percorso = [];
      arrestataPerCarburante = true;
    } else {
      carburante -= fuelNecessario;
    }

    const nuovaPosizione: Vector2 = {
      x: nave.posizione.x + Math.cos(orientamento) * spostamentoEffettivo,
      y: nave.posizione.y + Math.sin(orientamento) * spostamentoEffettivo,
    };

    if (!arrestataPerCarburante && spostamentoEffettivo >= distanzaResidua - EPSILON_ARRIVO) {
      percorso = nave.percorso.slice(1);
      if (percorso.length === 0) velocita = 0;
    }

    this.state = {
      ...this.state,
      mothership: { ...nave, posizione: nuovaPosizione, orientamento, velocita, carburante, percorso },
    };

    if (arrestataPerCarburante) {
      this.notify("Carburante esaurito: la nave madre e' immobilizzata.", "critico");
    }
  }

}
