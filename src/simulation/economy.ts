import { PREZZI_CARTE } from "../domain/cardMarket";
import { BALANCE } from "../domain/initialState";
import { MERCATO, PREZZI_BASE } from "../domain/market";
import type { SeededRng } from "../domain/rng";
import type { EntityId, GameState, ResourceType } from "../domain/types";
import type { CommandValidationResult } from "./commands";

// Mercato, contabilita' e revisioni aziendali (B3, Macrostep 5). Funzioni
// pure, testabili senza browser, nello stile degli altri moduli di
// simulazione. I prestiti (B3) restano esplicitamente fuori scope: il
// campo GameState.contabilita.debito esiste per compatibilita' futura ma
// non viene mai popolato in questo macrostep (vedi docs/game-rules.md).

function cargoTotale(carico: Partial<Record<ResourceType, number>>): number {
  return Object.values(carico).reduce((somma: number, q) => somma + (q ?? 0), 0);
}

/** Registra una spesa in crediti, mantenendo coerenti i totali e il
 * periodo corrente (usato dalla formula adattiva della prossima quota). */
export function registraSpesa(stato: GameState, importo: number): GameState {
  if (importo <= 0) return stato;
  return {
    ...stato,
    contabilita: {
      ...stato.contabilita,
      speseTotali: stato.contabilita.speseTotali + importo,
      spesePeriodoCorrente: stato.contabilita.spesePeriodoCorrente + importo,
    },
  };
}

export function registraRicavo(stato: GameState, importo: number): GameState {
  if (importo <= 0) return stato;
  return {
    ...stato,
    contabilita: {
      ...stato.contabilita,
      ricaviTotali: stato.contabilita.ricaviTotali + importo,
      ricaviPeriodoCorrente: stato.contabilita.ricaviPeriodoCorrente + importo,
    },
  };
}

export interface RisultatoEconomia {
  stato: GameState;
  notifiche: string[];
}

/** Fa fluttuare i prezzi ogni 5 minuti di tempo attivo (B3, confermato):
 * un nuovo bersaglio casuale entro ±20% dal prezzo base, avvicinato
 * gradualmente (non un salto secco) per restare "preferibilmente
 * graduale". */
export function integraMercato(stato: GameState, rng: SeededRng): RisultatoEconomia {
  if (stato.tempoSimulatoMs - stato.mercato.ultimoAggiornamentoMs < MERCATO.intervalloAggiornamentoMs) {
    return { stato, notifiche: [] };
  }

  const nuoviPrezzi: Partial<Record<ResourceType, number>> = {};
  for (const chiave of Object.keys(PREZZI_BASE) as ResourceType[]) {
    const base = PREZZI_BASE[chiave];
    const attuale = stato.mercato.prezzi[chiave] ?? base;
    const bersaglio = base * (1 + rng.nextFloat(-MERCATO.fluttuazioneMassima, MERCATO.fluttuazioneMassima));
    const nuovo = attuale + (bersaglio - attuale) * 0.6;
    const min = base * (1 - MERCATO.fluttuazioneMassima);
    const max = base * (1 + MERCATO.fluttuazioneMassima);
    nuoviPrezzi[chiave] = Math.max(min, Math.min(max, nuovo));
  }

  return {
    stato: { ...stato, mercato: { prezzi: nuoviPrezzi, ultimoAggiornamentoMs: stato.tempoSimulatoMs } },
    notifiche: [],
  };
}

export function validaVendiRisorsa(stato: GameState, risorsa: ResourceType, quantita: number): CommandValidationResult {
  if (!Number.isInteger(quantita) || quantita <= 0) return { ok: false, motivo: "quantita' non valida" };
  const disponibile = stato.mothership.stivaCarico[risorsa] ?? 0;
  if (disponibile < quantita) return { ok: false, motivo: "quantita' non disponibile in stiva" };
  return { ok: true };
}

export function applicaVendiRisorsa(stato: GameState, risorsa: ResourceType, quantita: number): GameState {
  const prezzo = stato.mercato.prezzi[risorsa] ?? PREZZI_BASE[risorsa];
  const incasso = Math.round(prezzo * quantita);
  const disponibile = stato.mothership.stivaCarico[risorsa] ?? 0;
  const statoConVendita: GameState = {
    ...stato,
    crediti: stato.crediti + incasso,
    mothership: { ...stato.mothership, stivaCarico: { ...stato.mothership.stivaCarico, [risorsa]: disponibile - quantita } },
    // Avanza il progresso delle missioni attive "vendi X risorsa Y" (B5:
    // tracking automatico). Il completamento vero e proprio, con assegnazione
    // della ricompensa, avviene in integraMissioni al tick successivo.
    missioni: stato.missioni.map((m) =>
      m.stato === "attiva" && m.obiettivo.tipo === "vendiRisorsa" && m.obiettivo.risorsa === risorsa
        ? { ...m, obiettivo: { ...m.obiettivo, progresso: Math.min(m.obiettivo.quantita, m.obiettivo.progresso + quantita) } }
        : m,
    ),
  };
  return registraRicavo(
    { ...statoConVendita, contabilita: { ...statoConVendita.contabilita, venditeTotali: statoConVendita.contabilita.venditeTotali + 1 } },
    incasso,
  );
}

/** Frazione del prezzo di mercato rimborsata vendendo un comando dalla mano
 * (richiesta utente: "permetti la vendita di comandi... un cestino in basso
 * a destra"): meno del prezzo pieno, altrimenti comprare e rivendere subito
 * una carta al mercato sarebbe un'operazione a somma zero o in attivo. */
const FRAZIONE_RIMBORSO_CARTA = 0.5;

export function validaVendiCartaMano(stato: GameState, cardInstanceId: EntityId): CommandValidationResult {
  const carta = stato.manoCarte.find((c) => c.instanceId === cardInstanceId);
  if (!carta) return { ok: false, motivo: "comando non presente in mano" };
  return { ok: true };
}

export function applicaVendiCartaMano(stato: GameState, cardInstanceId: EntityId): GameState {
  const carta = stato.manoCarte.find((c) => c.instanceId === cardInstanceId);
  if (!carta) return stato;
  const prezzoBase = PREZZI_CARTE[carta.code] ?? 0;
  const incasso = Math.round(prezzoBase * FRAZIONE_RIMBORSO_CARTA);
  const statoSenzaCarta: GameState = {
    ...stato,
    manoCarte: stato.manoCarte.filter((c) => c.instanceId !== cardInstanceId),
    crediti: stato.crediti + incasso,
  };
  return registraRicavo(statoSenzaCarta, incasso);
}

export function validaAcquistaRisorsa(stato: GameState, risorsa: ResourceType, quantita: number): CommandValidationResult {
  if (!Number.isInteger(quantita) || quantita <= 0) return { ok: false, motivo: "quantita' non valida" };
  const prezzo = stato.mercato.prezzi[risorsa] ?? PREZZI_BASE[risorsa];
  const costo = Math.round(prezzo * quantita);
  if (stato.crediti < costo) return { ok: false, motivo: "crediti insufficienti" };
  const spazioResiduo = stato.mothership.stivaCapacita - cargoTotale(stato.mothership.stivaCarico);
  if (spazioResiduo < quantita) return { ok: false, motivo: "spazio insufficiente in stiva" };
  return { ok: true };
}

export function applicaAcquistaRisorsa(stato: GameState, risorsa: ResourceType, quantita: number): GameState {
  const prezzo = stato.mercato.prezzi[risorsa] ?? PREZZI_BASE[risorsa];
  const costo = Math.round(prezzo * quantita);
  const attuale = stato.mothership.stivaCarico[risorsa] ?? 0;
  const statoConAcquisto: GameState = {
    ...stato,
    crediti: stato.crediti - costo,
    mothership: { ...stato.mothership, stivaCarico: { ...stato.mothership.stivaCarico, [risorsa]: attuale + quantita } },
  };
  return registraSpesa(statoConAcquisto, costo);
}

/** La revisione diventa dovuta esattamente alla carta numero
 * sogliaCarteProssimaRevisione (B3, confermato: "non sostituire il trigger
 * delle 40 carte con un timer"). Non fa nulla se gia' dovuta/in tolleranza
 * o se la partita e' finita. */
export function integraRevisione(stato: GameState): RisultatoEconomia {
  if (stato.gameOver) return { stato, notifiche: [] };
  if (stato.review.statoRevisione !== "nessuna") return { stato, notifiche: [] };
  if (stato.review.carteGiocateDallUltimaRevisione < stato.review.sogliaCarteProssimaRevisione) {
    return { stato, notifiche: [] };
  }

  return {
    stato: {
      ...stato,
      review: { ...stato.review, statoRevisione: "dovuta", carteTolleranzaResidue: BALANCE.carteTolleranzaMancataQuota },
    },
    notifiche: [`Revisione aziendale dovuta: ${stato.review.quotaDaPagare} Cr.`],
  };
}

export function validaPagaQuotaRevisione(stato: GameState): CommandValidationResult {
  if (stato.review.statoRevisione === "nessuna") return { ok: false, motivo: "nessuna quota dovuta" };
  if (stato.crediti < stato.review.quotaDaPagare) return { ok: false, motivo: "crediti insufficienti per pagare la quota" };
  return { ok: true };
}

/** Quota adattiva per la prossima revisione (B3: "in base alle prestazioni
 * degli ultimi tre periodi e al livello aziendale, con limiti di crescita
 * DA BILANCIARE"). Qui: cresce/scende in base all'utile medio recente,
 * con una crescita massima del 25% e un calo massimo del 15% a revisione,
 * mai sotto la prima quota confermata. Euristica semplice, provvisoria. */
function calcolaProssimaQuota(quotaAttuale: number, storicoUtile: number[]): number {
  if (storicoUtile.length === 0) return quotaAttuale;
  const utileMedio = storicoUtile.reduce((a, b) => a + b, 0) / storicoUtile.length;
  const variazione = Math.max(-0.15, Math.min(0.25, utileMedio / Math.max(1, quotaAttuale) / 4));
  const nuova = quotaAttuale * (1 + variazione);
  return Math.max(BALANCE.primaQuotaRevisione, Math.round(nuova));
}

export function applicaPagaQuotaRevisione(stato: GameState): RisultatoEconomia {
  const utilePeriodo = stato.contabilita.ricaviPeriodoCorrente - stato.contabilita.spesePeriodoCorrente;
  const storico = [...stato.review.storicoUtilePeriodi, utilePeriodo].slice(-3);
  const prossimaQuota = calcolaProssimaQuota(stato.review.quotaDaPagare, storico);

  const nuovoStato: GameState = {
    ...stato,
    crediti: stato.crediti - stato.review.quotaDaPagare,
    review: {
      ...stato.review,
      carteGiocateDallUltimaRevisione: 0,
      statoRevisione: "nessuna",
      carteTolleranzaResidue: BALANCE.carteTolleranzaMancataQuota,
      numeroRevisioniPagate: stato.review.numeroRevisioniPagate + 1,
      storicoUtilePeriodi: storico,
      quotaDaPagare: prossimaQuota,
    },
    contabilita: { ...stato.contabilita, ricaviPeriodoCorrente: 0, spesePeriodoCorrente: 0 },
  };

  return { stato: nuovoStato, notifiche: [`Quota aziendale pagata: ${stato.review.quotaDaPagare} Cr.`] };
}

/** Consuma una carta di tolleranza quando viene giocata una carta mentre la
 * revisione e' dovuta/in tolleranza e non ancora pagata; a tolleranza
 * esaurita la partita termina (B3). Va chiamata dopo ogni carta giocata con
 * successo (A2: solo su azione effettivamente applicata). */
export function consumaTolleranzaRevisione(stato: GameState): RisultatoEconomia {
  if (stato.review.statoRevisione === "nessuna") return { stato, notifiche: [] };

  const residue = stato.review.carteTolleranzaResidue - 1;
  if (residue > 0) {
    return {
      stato: { ...stato, review: { ...stato.review, statoRevisione: "inTolleranza", carteTolleranzaResidue: residue } },
      notifiche: [`Tolleranza per la quota non pagata: ${residue} carte rimanenti.`],
    };
  }

  return {
    stato: {
      ...stato,
      review: { ...stato.review, statoRevisione: "inTolleranza", carteTolleranzaResidue: 0 },
      gameOver: { motivo: "Quota aziendale non pagata entro il periodo di tolleranza." },
    },
    notifiche: ["Game Over: quota aziendale non pagata entro il periodo di tolleranza."],
  };
}
