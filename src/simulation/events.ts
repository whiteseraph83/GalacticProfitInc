import { EVENTI_CONFIG, EVENTO_DEFINITIONS } from "../domain/events";
import type { EffettoScelta, EntityId, EventoAttivo, GameState, ResourceType } from "../domain/types";
import type { SeededRng } from "../domain/rng";
import type { CommandValidationResult } from "./commands";
import { registraRicavo, registraSpesa } from "./economy";

// Eventi periodici (B9, Macrostep 9): "circa ogni 8-10 carte, con scelte e
// conseguenze; eventi ordinari non modali, critici sospendono solo quando
// necessario". Funzioni pure, testabili senza browser.

function distanza(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Civilta' "coinvolta" in un evento diplomatico: la piu' vicina gia'
 * scoperta (semplificazione deliberata: il documento non specifica come
 * assegnare il bersaglio di un evento generico). */
function civiltaPiuVicina(stato: GameState) {
  const scoperte = stato.civilta.filter((c) => c.scoperta);
  if (scoperte.length === 0) return null;
  return scoperte.reduce((piuVicina, c) =>
    distanza(c.posizione, stato.mothership.posizione) < distanza(piuVicina.posizione, stato.mothership.posizione) ? c : piuVicina,
  );
}

let autoEventCounter = 0;
function nextEventId(): string {
  autoEventCounter += 1;
  return `evento-${autoEventCounter}`;
}

export interface RisultatoEventi {
  stato: GameState;
  notifiche: string[];
}

/** Incrementa il contatore carte-dall'ultimo-evento (chiamato da
 * cardEffects.ts dopo ogni carta giocata con successo, come il contatore
 * di revisione) e genera un nuovo evento al raggiungimento della soglia
 * casuale (8-10), se c'e' ancora spazio tra gli eventi attivi. */
export function integraGenerazioneEventi(stato: GameState, rng: SeededRng): RisultatoEventi {
  if (stato.eventi.carteGiocateDallUltimo < stato.eventi.sogliaProssimo) return { stato, notifiche: [] };
  if (stato.eventi.attivi.length >= EVENTI_CONFIG.attiviMax) return { stato, notifiche: [] };

  const definizioni = Object.values(EVENTO_DEFINITIONS);
  const definizione = rng.pick(definizioni);
  const nuovoEvento: EventoAttivo = { id: nextEventId(), definizioneId: definizione.id, creatoAlMs: stato.tempoSimulatoMs };
  const sogliaProssimo = rng.nextInt(EVENTI_CONFIG.sogliaCarteMin, EVENTI_CONFIG.sogliaCarteMax);

  return {
    stato: {
      ...stato,
      eventi: { attivi: [...stato.eventi.attivi, nuovoEvento], carteGiocateDallUltimo: 0, sogliaProssimo },
    },
    notifiche: [`Nuovo evento: ${definizione.titolo}${definizione.critico ? " (critico)" : ""}.`],
  };
}

export function validaSceltaEvento(stato: GameState, eventoId: EntityId, scelteId: string): CommandValidationResult {
  const evento = stato.eventi.attivi.find((e) => e.id === eventoId);
  if (!evento) return { ok: false, motivo: "evento non attivo" };
  const definizione = EVENTO_DEFINITIONS[evento.definizioneId];
  if (!definizione) return { ok: false, motivo: "definizione evento sconosciuta" };
  if (!definizione.scelte.some((s) => s.id === scelteId)) return { ok: false, motivo: "scelta non valida per questo evento" };
  return { ok: true };
}

export function validaIgnoraEvento(stato: GameState, eventoId: EntityId): CommandValidationResult {
  const evento = stato.eventi.attivi.find((e) => e.id === eventoId);
  if (!evento) return { ok: false, motivo: "evento non attivo" };
  const definizione = EVENTO_DEFINITIONS[evento.definizioneId];
  if (definizione?.critico) return { ok: false, motivo: "un evento critico richiede una scelta esplicita" };
  return { ok: true };
}

function applicaEffetto(stato: GameState, effetto: EffettoScelta, rng: SeededRng): { stato: GameState; notifiche: string[] } {
  switch (effetto.tipo) {
    case "crediti": {
      const nuovoStato: GameState = { ...stato, crediti: Math.max(0, stato.crediti + effetto.valore) };
      return {
        stato: effetto.valore >= 0 ? registraRicavo(nuovoStato, effetto.valore) : registraSpesa(nuovoStato, -effetto.valore),
        notifiche: [`${effetto.valore >= 0 ? "+" : ""}${effetto.valore} Cr.`],
      };
    }
    case "fiducia": {
      const fiducia = Math.max(0, Math.min(100, stato.review.fiducia + effetto.valore));
      return { stato: { ...stato, review: { ...stato.review, fiducia } }, notifiche: [`Fiducia: ${effetto.valore >= 0 ? "+" : ""}${effetto.valore}.`] };
    }
    case "relazioneCivilta": {
      const civilta = civiltaPiuVicina(stato);
      if (!civilta) return { stato, notifiche: [] };
      const relazione = Math.max(0, Math.min(100, civilta.relazione + effetto.valore));
      return {
        stato: { ...stato, civilta: stato.civilta.map((c) => (c.id === civilta.id ? { ...c, relazione } : c)) },
        notifiche: [`Relazione con ${civilta.nome}: ${effetto.valore >= 0 ? "+" : ""}${effetto.valore}.`],
      };
    }
    case "cargoRubato": {
      const stivaCarico = { ...stato.mothership.stivaCarico };
      let rubatoTotale = 0;
      for (const chiave of Object.keys(stivaCarico) as ResourceType[]) {
        const quantita = stivaCarico[chiave] ?? 0;
        const rubato = Math.floor(quantita * (effetto.percentuale / 100));
        if (rubato > 0) {
          stivaCarico[chiave] = quantita - rubato;
          rubatoTotale += rubato;
        }
      }
      return {
        stato: { ...stato, mothership: { ...stato.mothership, stivaCarico } },
        notifiche: rubatoTotale > 0 ? [`Carico sottratto: ${rubatoTotale} unita' totali.`] : [],
      };
    }
    case "naveSabotata": {
      const contrattoAttivo = stato.contrattiMinerari.find((c) => c.attivo);
      if (!contrattoAttivo) return { stato, notifiche: [] };
      return {
        stato: {
          ...stato,
          contrattiMinerari: stato.contrattiMinerari.map((c) => (c.id === contrattoAttivo.id ? { ...c, attivo: false } : c)),
          naviMinerarie: stato.naviMinerarie.map((n) => (n.id === contrattoAttivo.naveMinerariaId ? { ...n, contrattoAttivoId: null } : n)),
        },
        notifiche: ["Un contratto minerario e' stato sabotato e interrotto."],
      };
    }
    case "naveMinerariaDistrutta": {
      if (stato.naviMinerarie.length === 0) return { stato, notifiche: [] };
      const nave = rng.pick(stato.naviMinerarie);
      return {
        stato: {
          ...stato,
          naviMinerarie: stato.naviMinerarie.filter((n) => n.id !== nave.id),
          contrattiMinerari: stato.contrattiMinerari.filter((c) => c.naveMinerariaId !== nave.id),
          moduli: stato.moduli.map((m) => (m.naveMinerariaId === nave.id ? { ...m, naveMinerariaId: null } : m)),
        },
        notifiche: ["Una nave mineraria e' andata perduta nello scontro."],
      };
    }
    case "nessunEffetto":
      return { stato, notifiche: [] };
  }
}

export interface RisultatoSceltaEvento {
  stato: GameState;
  notifiche: string[];
}

export function applicaSceltaEvento(stato: GameState, eventoId: EntityId, scelteId: string, rng: SeededRng): RisultatoSceltaEvento {
  const evento = stato.eventi.attivi.find((e) => e.id === eventoId);
  if (!evento) return { stato, notifiche: [] };
  const definizione = EVENTO_DEFINITIONS[evento.definizioneId];
  const scelta = definizione?.scelte.find((s) => s.id === scelteId);
  if (!definizione || !scelta) return { stato, notifiche: [] };

  let statoCorrente: GameState = { ...stato, eventi: { ...stato.eventi, attivi: stato.eventi.attivi.filter((e) => e.id !== eventoId) } };
  const notifiche: string[] = [`${definizione.titolo}: ${scelta.testo}.`];

  for (const effetto of scelta.effetti) {
    const risultato = applicaEffetto(statoCorrente, effetto, rng);
    statoCorrente = risultato.stato;
    notifiche.push(...risultato.notifiche);
  }

  return { stato: statoCorrente, notifiche };
}

export function applicaIgnoraEvento(stato: GameState, eventoId: EntityId): GameState {
  return { ...stato, eventi: { ...stato.eventi, attivi: stato.eventi.attivi.filter((e) => e.id !== eventoId) } };
}
