import { BALANCE } from "../domain/initialState";
import type { EntityId, GameState, MiningContract, ResourceType, ShuttleEntity, Vector2 } from "../domain/types";
import { bonusRicerca } from "./research";

// Logistica mineraria (B1): estrazione nei contratti e automazione delle
// navette. Funzioni pure (stato -> nuovo stato), nessuna dipendenza da
// React/PixiJS: testabili passando direttamente un GameState costruito ad
// hoc, senza dover aprire un browser ne' passare dalla UI (che in questo
// macrostep non puo' ancora avviare un contratto: la carta IND-01 arriva al
// Macrostep 3). Chiamate dal motore a ogni sub-step della simulazione.

function distanza(a: Vector2, b: Vector2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function cargoTotale(carico: Partial<Record<ResourceType, number>>): number {
  return Object.values(carico).reduce((somma: number, q) => somma + (q ?? 0), 0);
}

/** Estrae materiale per ogni contratto minerario attivo, accumulandolo in
 * un buffer limitato alla capacita' di una navetta: quando il buffer e'
 * pieno l'estrazione si sospende automaticamente (B1: "estrazione deve
 * sospendersi se non c'e' capacita' utilizzabile"), finche' una navetta
 * non lo svuota. */
export function integraEstrazione(stato: GameState, dtMs: number): GameState {
  if (stato.contrattiMinerari.length === 0) return stato;
  const dtMin = dtMs / 60000;
  let cambiato = false;

  const contrattiAggiornati = stato.contrattiMinerari.map((contratto): MiningContract => {
    if (!contratto.attivo || contratto.giacimentoResiduo <= 0) return contratto;
    const bufferMax = BALANCE.capacitaNavetta;
    const spazioBuffer = bufferMax - contratto.depositoAccumulato;
    if (spazioBuffer <= 0) return contratto;

    const estratto = Math.min(contratto.estrazioneAlMinuto * dtMin, contratto.giacimentoResiduo, spazioBuffer);
    if (estratto <= 0) return contratto;
    cambiato = true;
    return {
      ...contratto,
      giacimentoResiduo: contratto.giacimentoResiduo - estratto,
      depositoAccumulato: contratto.depositoAccumulato + estratto,
    };
  });

  return cambiato ? { ...stato, contrattiMinerari: contrattiAggiornati } : stato;
}

/** Muove una navetta in linea retta verso una destinazione a velocita'
 * costante. Ritorna [navettaAggiornata, arrivata]. */
function muoviVersoDestinazione(
  navetta: ShuttleEntity,
  destinazione: Vector2,
  dtMs: number,
  moltiplicatoreVelocita: number,
): [ShuttleEntity, boolean] {
  const dtSec = dtMs / 1000;
  const distanzaResidua = distanza(navetta.posizione, destinazione);
  const spostamentoMax = BALANCE.navettaVelocita * moltiplicatoreVelocita * dtSec;

  if (spostamentoMax >= distanzaResidua) {
    return [{ ...navetta, posizione: destinazione, destinazione }, true];
  }

  const dx = destinazione.x - navetta.posizione.x;
  const dy = destinazione.y - navetta.posizione.y;
  const fattore = spostamentoMax / distanzaResidua;
  const nuovaPosizione = { x: navetta.posizione.x + dx * fattore, y: navetta.posizione.y + dy * fattore };
  return [{ ...navetta, posizione: nuovaPosizione, destinazione }, false];
}

/** Assegna le navette libere ai contratti con materiale in attesa,
 * privilegiando priorita' piu' alta e, a parita', il contratto servito
 * meno di recente (anti-starvation: B1). */
function assegnaNavetteAiContratti(stato: GameState): GameState {
  const navetteLibere = stato.navette.filter((n) => n.stato === "libera");
  if (navetteLibere.length === 0) return stato;

  const contrattiConCarico = stato.contrattiMinerari
    .filter((c) => c.attivo && c.depositoAccumulato > 0)
    .sort((a, b) => {
      if (b.priorita !== a.priorita) return b.priorita - a.priorita;
      return a.ultimaAssegnazioneMs - b.ultimaAssegnazioneMs;
    });
  if (contrattiConCarico.length === 0) return stato;

  const idGiaAssegnati = new Set(
    stato.navette.filter((n) => n.contrattoAssegnatoId).map((n) => n.contrattoAssegnatoId as EntityId),
  );

  let navette = stato.navette;
  let contratti = stato.contrattiMinerari;
  let cambiato = false;

  for (const navettaLibera of navetteLibere) {
    const contratto = contrattiConCarico.find((c) => !idGiaAssegnati.has(c.id));
    if (!contratto) break;
    const pianeta = stato.pianeti.find((p) => p.id === contratto.pianetaId);
    if (!pianeta) continue;

    idGiaAssegnati.add(contratto.id);
    cambiato = true;
    navette = navette.map((n) =>
      n.id === navettaLibera.id
        ? {
            ...n,
            stato: "inViaggio" as const,
            // Richiesta utente: le navette devono sempre partire
            // visibilmente dalla nave madre, non dalla posizione (magari
            // ormai vecchia, risalente all'ultimo rientro) lasciata libera.
            posizione: stato.mothership.posizione,
            contrattoAssegnatoId: contratto.id,
            destinazione: pianeta.posizione,
            tempoAttesaMs: 0,
          }
        : n,
    );
    contratti = contratti.map((c) => (c.id === contratto.id ? { ...c, ultimaAssegnazioneMs: stato.tempoSimulatoMs } : c));
  }

  return cambiato ? { ...stato, navette, contrattiMinerari: contratti } : stato;
}

/** Automazione navette: assegnazione ai contratti con materiale in attesa,
 * viaggio verso il sito, carico (fino a pieno o al timeout di partenza),
 * ritorno verso la nave madre (che insegue anche se questa si sposta),
 * scarico atomico e parziale se la stiva e' piena (B1). */
export function integraNavette(statoIniziale: GameState, dtMs: number): GameState {
  const stato = assegnaNavetteAiContratti(statoIniziale);
  const moltiplicatoreVelocita = bonusRicerca(stato).moltiplicatoreTrasporti;

  let navette = stato.navette;
  let contratti = stato.contrattiMinerari;
  let mothership = stato.mothership;
  let cambiato = false;

  const nuoveNavette: ShuttleEntity[] = navette.map((navetta) => {
    switch (navetta.stato) {
      case "libera":
        return navetta;
      case "inViaggio":
      case "ritorno": {
        // In ritorno la destinazione insegue la nave madre anche se questa
        // si sposta (B1); in viaggio verso il contratto il bersaglio e'
        // fisso (il pianeta non si muove).
        const bersaglio = navetta.stato === "ritorno" ? mothership.posizione : navetta.destinazione;
        if (!bersaglio) return navetta;
        const [nuova, arrivata] = muoviVersoDestinazione(navetta, bersaglio, dtMs, moltiplicatoreVelocita);
        cambiato = true;
        if (!arrivata) return nuova;
        if (navetta.stato === "inViaggio") {
          return { ...nuova, stato: "inAttesa", destinazione: null, tempoAttesaMs: 0 };
        }
        return { ...nuova, stato: "scarico", destinazione: null };
      }
      case "inAttesa":
      case "caricamento": {
        // Navetta mandata a investigare un pianeta (nessun contratto
        // minerario associato): resta parcheggiata li' finche'
        // `integraInvestigazioni` non la richiama a bordo al termine del
        // timer, invece di essere liberata subito come farebbe una navetta
        // senza contratto (vedi sotto).
        if (navetta.pianetaInvestigazioneId) return navetta;

        const contratto = contratti.find((c) => c.id === navetta.contrattoAssegnatoId);
        if (!contratto) return { ...navetta, stato: "libera", contrattoAssegnatoId: null, tempoAttesaMs: 0 };

        const caricoAttuale = cargoTotale(navetta.caricoAttuale);
        const spazioResiduo = navetta.capacitaCargo - caricoAttuale;
        const daCaricare = Math.min(spazioResiduo, contratto.depositoAccumulato);

        let nuovoCarico = navetta.caricoAttuale;
        if (daCaricare > 0) {
          cambiato = true;
          const quantitaAttuale = navetta.caricoAttuale[contratto.risorsa] ?? 0;
          nuovoCarico = { ...navetta.caricoAttuale, [contratto.risorsa]: quantitaAttuale + daCaricare };
          contratti = contratti.map((c) =>
            c.id === contratto.id ? { ...c, depositoAccumulato: c.depositoAccumulato - daCaricare } : c,
          );
        }

        const caricoTotaleAggiornato = caricoAttuale + daCaricare;
        const tempoAttesaMs = navetta.tempoAttesaMs + dtMs;
        const piena = caricoTotaleAggiornato >= navetta.capacitaCargo;
        const timeoutScaduto = tempoAttesaMs >= BALANCE.navettaTimeoutPartenzaMs && caricoTotaleAggiornato > 0;

        if (piena || timeoutScaduto) {
          cambiato = true;
          return {
            ...navetta,
            caricoAttuale: nuovoCarico,
            stato: "ritorno",
            destinazione: mothership.posizione,
            tempoAttesaMs: 0,
          };
        }

        const nuovoStato = caricoTotaleAggiornato > 0 ? "caricamento" : "inAttesa";
        if (nuovoStato !== navetta.stato || daCaricare > 0) cambiato = true;
        return { ...navetta, caricoAttuale: nuovoCarico, stato: nuovoStato, tempoAttesaMs };
      }
      case "scarico":
      case "indisponibile": {
        const caricoAttuale = cargoTotale(navetta.caricoAttuale);
        if (caricoAttuale === 0) {
          cambiato = true;
          return { ...navetta, stato: "libera", contrattoAssegnatoId: null, pianetaInvestigazioneId: null };
        }
        const stivaOccupata = cargoTotale(mothership.stivaCarico);
        const spazioStiva = mothership.stivaCapacita - stivaOccupata;
        if (spazioStiva <= 0) {
          cambiato = true;
          return { ...navetta, stato: "indisponibile" };
        }

        cambiato = true;
        const nuovoCaricoNavetta: Partial<Record<ResourceType, number>> = { ...navetta.caricoAttuale };
        let daTrasferireResiduo = spazioStiva;
        const nuovaStivaMothership: Partial<Record<ResourceType, number>> = { ...mothership.stivaCarico };

        for (const chiave of Object.keys(nuovoCaricoNavetta) as ResourceType[]) {
          if (daTrasferireResiduo <= 0) break;
          const quantita = nuovoCaricoNavetta[chiave] ?? 0;
          if (quantita <= 0) continue;
          const trasferito = Math.min(quantita, daTrasferireResiduo);
          nuovoCaricoNavetta[chiave] = quantita - trasferito;
          nuovaStivaMothership[chiave] = (nuovaStivaMothership[chiave] ?? 0) + trasferito;
          daTrasferireResiduo -= trasferito;
        }

        mothership = { ...mothership, stivaCarico: nuovaStivaMothership };
        const caricoResiduoNavetta = cargoTotale(nuovoCaricoNavetta);
        return {
          ...navetta,
          caricoAttuale: nuovoCaricoNavetta,
          stato: caricoResiduoNavetta === 0 ? "libera" : "scarico",
          contrattoAssegnatoId: caricoResiduoNavetta === 0 ? null : navetta.contrattoAssegnatoId,
        };
      }
      default:
        return navetta;
    }
  });

  navette = nuoveNavette;
  return cambiato ? { ...stato, navette, contrattiMinerari: contratti, mothership } : stato;
}
