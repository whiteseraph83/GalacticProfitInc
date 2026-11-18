import { CIVILTA, RISORSE_GREZZE } from "../domain/civilizations";
import { PREZZI_BASE } from "../domain/market";
import type { SeededRng } from "../domain/rng";
import type { EntityId, GameState, ResourceType } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { registraRicavo, registraSpesa } from "./economy";

// Civilta' locali alla regione (B9, Macrostep 9): richieste, bonus
// commerciali e diplomazia. Funzioni pure, testabili senza browser.

/** Prezzo di vendita a una civilta': quello di mercato, con un bonus se la
 * relazione supera la soglia (B9: "bonus commerciali"), proporzionale alla
 * relazione oltre la soglia. */
function prezzoCommercioCivilta(relazione: number, risorsa: ResourceType): number {
  const base = PREZZI_BASE[risorsa] ?? 0;
  if (relazione < CIVILTA.sogliaBonusCommerciale) return base;
  const eccedenza = (relazione - CIVILTA.sogliaBonusCommerciale) / (CIVILTA.relazioneMax - CIVILTA.sogliaBonusCommerciale);
  return base * (1 + CIVILTA.bonusCommercialeMassimo * eccedenza);
}

export function validaCommerciaConCivilta(stato: GameState, civiltaId: EntityId, risorsa: ResourceType, quantita: number): CommandValidationResult {
  if (!Number.isInteger(quantita) || quantita <= 0) return { ok: false, motivo: "quantita' non valida" };
  const civilta = stato.civilta.find((c) => c.id === civiltaId);
  if (!civilta || !civilta.scoperta) return { ok: false, motivo: "civilta' non disponibile" };
  const disponibile = stato.mothership.stivaCarico[risorsa] ?? 0;
  if (disponibile < quantita) return { ok: false, motivo: "quantita' non disponibile in stiva" };
  return { ok: true };
}

export function applicaCommerciaConCivilta(stato: GameState, civiltaId: EntityId, risorsa: ResourceType, quantita: number): GameState {
  const civilta = stato.civilta.find((c) => c.id === civiltaId);
  if (!civilta) return stato;
  const prezzo = prezzoCommercioCivilta(civilta.relazione, risorsa);
  const incasso = Math.round(prezzo * quantita);
  const disponibile = stato.mothership.stivaCarico[risorsa] ?? 0;

  const richiestaAggiornata =
    civilta.richiestaAttiva && civilta.richiestaAttiva.risorsa === risorsa
      ? { ...civilta.richiestaAttiva, progresso: Math.min(civilta.richiestaAttiva.quantita, civilta.richiestaAttiva.progresso + quantita) }
      : civilta.richiestaAttiva;

  const nuovoStato: GameState = {
    ...stato,
    crediti: stato.crediti + incasso,
    mothership: { ...stato.mothership, stivaCarico: { ...stato.mothership.stivaCarico, [risorsa]: disponibile - quantita } },
    civilta: stato.civilta.map((c) => (c.id === civiltaId ? { ...c, richiestaAttiva: richiestaAggiornata } : c)),
  };
  return registraRicavo(nuovoStato, incasso);
}

export function validaInviaDonoCivilta(stato: GameState, civiltaId: EntityId, crediti: number): CommandValidationResult {
  if (!Number.isInteger(crediti) || crediti < CIVILTA.donoCostoMinimo) {
    return { ok: false, motivo: `il dono minimo e' ${CIVILTA.donoCostoMinimo} Cr` };
  }
  const civilta = stato.civilta.find((c) => c.id === civiltaId);
  if (!civilta || !civilta.scoperta) return { ok: false, motivo: "civilta' non disponibile" };
  if (stato.crediti < crediti) return { ok: false, motivo: "crediti insufficienti" };
  return { ok: true };
}

export function applicaInviaDonoCivilta(stato: GameState, civiltaId: EntityId, crediti: number): GameState {
  const civilta = stato.civilta.find((c) => c.id === civiltaId);
  if (!civilta) return stato;
  const relazione = Math.min(CIVILTA.relazioneMax, civilta.relazione + Math.floor(crediti * CIVILTA.donoRelazionePerCrediti));
  const nuovoStato: GameState = {
    ...stato,
    crediti: stato.crediti - crediti,
    civilta: stato.civilta.map((c) => (c.id === civiltaId ? { ...c, relazione } : c)),
  };
  return registraSpesa(nuovoStato, crediti);
}

export interface RisultatoCivilta {
  stato: GameState;
  notifiche: string[];
}

/** Completa automaticamente le richieste di consegna soddisfatte (B9:
 * "richieste" tracciate come le missioni, B5): ricompensa in crediti e
 * relazione, poi una possibilita' di generarne una nuova dopo un po'
 * (B9: relazioni "vive" nella regione, non statiche). */
export function integraRichiesteCivilta(stato: GameState, rng: SeededRng): RisultatoCivilta {
  if (stato.civilta.length === 0) return { stato, notifiche: [] };
  const notifiche: string[] = [];
  let crediti = stato.crediti;
  let cambiato = false;

  const civilta = stato.civilta.map((c) => {
    if (c.richiestaAttiva && c.richiestaAttiva.progresso >= c.richiestaAttiva.quantita) {
      crediti += c.richiestaAttiva.ricompensaCrediti;
      cambiato = true;
      notifiche.push(`${c.nome}: richiesta soddisfatta, +${c.richiestaAttiva.ricompensaCrediti} Cr, relazione migliorata.`);
      return {
        ...c,
        relazione: Math.min(CIVILTA.relazioneMax, c.relazione + c.richiestaAttiva.ricompensaRelazione),
        richiestaAttiva: null,
      };
    }
    if (!c.richiestaAttiva && c.scoperta && rng.next() < 0.002) {
      cambiato = true;
      const risorsa = rng.pick(RISORSE_GREZZE);
      const quantita = rng.nextInt(CIVILTA.richiestaQuantitaMin, CIVILTA.richiestaQuantitaMax);
      notifiche.push(`${c.nome} ha una nuova richiesta: ${quantita} ${risorsa}.`);
      return {
        ...c,
        richiestaAttiva: {
          risorsa,
          quantita,
          progresso: 0,
          ricompensaRelazione: CIVILTA.richiestaRicompensaRelazione,
          ricompensaCrediti: Math.round(quantita * CIVILTA.richiestaRicompensaCreditiPerUnita),
        },
      };
    }
    return c;
  });

  if (!cambiato) return { stato, notifiche: [] };
  return { stato: { ...stato, crediti, civilta }, notifiche };
}
