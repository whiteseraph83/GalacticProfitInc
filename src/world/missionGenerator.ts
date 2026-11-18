import { SeededRng } from "../domain/rng";
import { CARD_DEFINITIONS } from "../domain/cards";
import type { CardCode, Missione, ObiettivoMissione, RawResourceType, RegioneSpaziale, RicompensaMissione, TipoOpportunita } from "../domain/types";

// Generatore di missioni/opportunita' (B4/B5, Macrostep 6): 20-30 per
// regione, ciascuna completabile una sola volta (B4), con 4 missioni
// introduttive garantite (B6: "4 carte extra garantite nelle missioni
// introduttive") piu' una missione principale attivata automaticamente
// (B5). Nessuna di queste e' obbligatoria in un ordine preciso: sono tutte
// disponibili fin da subito, il giocatore sceglie liberamente (B6:
// "garantire che chi gioca non rimanga costretto a una sequenza rigida").

const CODICI_CARTA = Object.keys(CARD_DEFINITIONS) as CardCode[];
const RISORSE_COMUNI: RawResourceType[] = ["ferro", "cristalliSilicio"];

let contatoreId = 0;
function nextMissionId(): string {
  contatoreId += 1;
  return `missione-${contatoreId}`;
}

function mescola<T>(rng: SeededRng, elementi: readonly T[]): T[] {
  const copia = [...elementi];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function pescaCarteRicompensa(rng: SeededRng): CardCode[] {
  const tiro = rng.next();
  if (tiro < 0.2) return []; // talvolta solo crediti/materiali/info (B5)
  if (tiro < 0.9) return [rng.pick(CODICI_CARTA)]; // generalmente una carta
  return [rng.pick(CODICI_CARTA), rng.pick(CODICI_CARTA)]; // raramente due
}

function creaRicompensa(rng: SeededRng, creditiBase: number, carteForzate?: CardCode[]): RicompensaMissione {
  return {
    crediti: Math.round(creditiBase * rng.nextFloat(0.75, 1.3)),
    carte: carteForzate ?? pescaCarteRicompensa(rng),
  };
}

function forseRicompensaNascosta(rng: SeededRng, creditiBase: number): RicompensaMissione | null {
  if (rng.next() > 0.25) return null;
  return { crediti: Math.round(creditiBase * rng.nextFloat(0.3, 0.6)), carte: rng.next() < 0.3 ? [rng.pick(CODICI_CARTA)] : [] };
}

export function generaMissioni(seed: string, regione: RegioneSpaziale): Missione[] {
  const rng = new SeededRng(`${seed}|missioni`);
  const missioni: Missione[] = [];

  const pianetiAreaSicura = mescola(rng, regione.pianeti.filter((p) => p.scoperto));
  const pianetaA = pianetiAreaSicura[0] ?? regione.pianeti[0];
  const pianetaB = pianetiAreaSicura[1] ?? regione.pianeti[1] ?? pianetaA;

  // --- 4 missioni introduttive garantite: esattamente 1 carta ciascuna. ---
  missioni.push({
    id: nextMissionId(),
    tipo: "investigazione",
    titolo: "Primo contatto planetario",
    descrizione: `Investiga ${pianetaA.nome} per rivelarne le risorse.`,
    principale: false,
    stato: "disponibile",
    obiettivo: { tipo: "investigaPianeta", pianetaId: pianetaA.id },
    ricompensa: creaRicompensa(rng, 80, [rng.pick(CODICI_CARTA)]),
    ricompensaNascosta: null,
  });
  missioni.push({
    id: nextMissionId(),
    tipo: "investigazione",
    titolo: "Secondo rilevamento",
    descrizione: `Investiga ${pianetaB.nome} per rivelarne le risorse.`,
    principale: false,
    stato: "disponibile",
    obiettivo: { tipo: "investigaPianeta", pianetaId: pianetaB.id },
    ricompensa: creaRicompensa(rng, 80, [rng.pick(CODICI_CARTA)]),
    ricompensaNascosta: null,
  });
  missioni.push({
    id: nextMissionId(),
    tipo: "missioneAziendale",
    titolo: "Prima estrazione",
    descrizione: `Avvia un contratto minerario su un pianeta investigato (es. ${pianetaA.nome}).`,
    principale: false,
    stato: "disponibile",
    obiettivo: { tipo: "avviaContratto", pianetaId: pianetaA.id },
    ricompensa: creaRicompensa(rng, 100, [rng.pick(CODICI_CARTA)]),
    ricompensaNascosta: null,
  });
  missioni.push({
    id: nextMissionId(),
    tipo: "richiestaCommerciale",
    titolo: "Primo scambio",
    descrizione: "Vendi 5 unita' di ferro al mercato galattico.",
    principale: false,
    stato: "disponibile",
    obiettivo: { tipo: "vendiRisorsa", risorsa: "ferro", quantita: 5, progresso: 0 },
    ricompensa: creaRicompensa(rng, 60, [rng.pick(CODICI_CARTA)]),
    ricompensaNascosta: null,
  });

  // --- Missione principale: obiettivo piu' ambizioso, attiva da subito. ---
  const pianetaPrincipale = mescola(rng, regione.pianeti).find((p) => p.id !== pianetaA.id && p.id !== pianetaB.id) ?? pianetaA;
  missioni.push({
    id: nextMissionId(),
    tipo: "missioneAziendale",
    titolo: "Direttiva OmniProfit™",
    descrizione: `La direzione richiede un contratto minerario attivo su ${pianetaPrincipale.scoperto ? pianetaPrincipale.nome : "un pianeta ancora da scoprire in zona"}.`,
    principale: true,
    stato: "attiva",
    obiettivo: { tipo: "avviaContratto", pianetaId: pianetaPrincipale.id },
    ricompensa: creaRicompensa(rng, 250, [rng.pick(CODICI_CARTA)]),
    ricompensaNascosta: forseRicompensaNascosta(rng, 250),
  });

  // --- Pool di opportunita' aggiuntive fino a 20-30 totali. ---
  const totaleDesiderato = rng.nextInt(20, 30);
  const pianetiUsatiInvestigazione = new Set([pianetaA.id, pianetaB.id]);
  const pianetiUsatiContratto = new Set([pianetaA.id, pianetaPrincipale.id]);
  const relittiUsati = new Set<string>();
  const pianetiMescolati = mescola(rng, regione.pianeti);
  const relittiMescolati = mescola(rng, regione.campiRelitti);

  let indicePianeta = 0;
  let indiceRelitto = 0;
  const prossimoPianeta = (usati: Set<string>) => {
    while (indicePianeta < pianetiMescolati.length) {
      const candidato = pianetiMescolati[indicePianeta];
      indicePianeta += 1;
      if (!usati.has(candidato.id)) return candidato;
    }
    return null;
  };

  while (missioni.length < totaleDesiderato) {
    const tipo: TipoOpportunita = rng.pick(["investigazione", "missioneAziendale", "recupero", "richiestaCommerciale"] as const);

    if (tipo === "investigazione") {
      const pianeta = prossimoPianeta(pianetiUsatiInvestigazione);
      if (!pianeta) break;
      pianetiUsatiInvestigazione.add(pianeta.id);
      missioni.push({
        id: nextMissionId(),
        tipo,
        titolo: `Rilevamento: ${pianeta.nome}`,
        descrizione: `Investiga ${pianeta.nome}.`,
        principale: false,
        stato: "disponibile",
        obiettivo: { tipo: "investigaPianeta", pianetaId: pianeta.id },
        ricompensa: creaRicompensa(rng, 70),
        ricompensaNascosta: forseRicompensaNascosta(rng, 70),
      });
    } else if (tipo === "missioneAziendale") {
      const pianeta = prossimoPianeta(pianetiUsatiContratto);
      if (!pianeta) continue;
      pianetiUsatiContratto.add(pianeta.id);
      missioni.push({
        id: nextMissionId(),
        tipo,
        titolo: `Richiesta estrattiva: ${pianeta.nome}`,
        descrizione: `Avvia un contratto minerario su ${pianeta.nome}.`,
        principale: false,
        stato: "disponibile",
        obiettivo: { tipo: "avviaContratto", pianetaId: pianeta.id },
        ricompensa: creaRicompensa(rng, 110),
        ricompensaNascosta: forseRicompensaNascosta(rng, 110),
      });
    } else if (tipo === "recupero") {
      if (indiceRelitto >= relittiMescolati.length) continue;
      const relitto = relittiMescolati[indiceRelitto];
      indiceRelitto += 1;
      if (relittiUsati.has(relitto.id)) continue;
      relittiUsati.add(relitto.id);
      missioni.push({
        id: nextMissionId(),
        tipo,
        titolo: "Recupero segnalato",
        descrizione: "Recupera materiale da un relitto individuato in zona.",
        principale: false,
        stato: "disponibile",
        obiettivo: { tipo: "recuperaRelitto", relittoId: relitto.id },
        ricompensa: creaRicompensa(rng, 90),
        ricompensaNascosta: forseRicompensaNascosta(rng, 90),
      });
    } else {
      const risorsa = rng.pick(RISORSE_COMUNI);
      const quantita = rng.nextInt(10, 40);
      missioni.push({
        id: nextMissionId(),
        tipo,
        titolo: "Richiesta commerciale",
        descrizione: `Vendi ${quantita} unita' di ${risorsa} al mercato.`,
        principale: false,
        stato: "disponibile",
        obiettivo: { tipo: "vendiRisorsa", risorsa, quantita, progresso: 0 },
        ricompensa: creaRicompensa(rng, 65),
        ricompensaNascosta: forseRicompensaNascosta(rng, 65),
      });
    }

    // Se sia i pianeti che i relitti sono esauriti come bersagli validi,
    // le richieste commerciali (senza bersaglio spaziale) permettono
    // comunque di raggiungere il totale desiderato.
    if (indicePianeta >= pianetiMescolati.length && indiceRelitto >= relittiMescolati.length) {
      // Evita un ciclo potenzialmente lungo: da qui in poi solo richieste commerciali.
      while (missioni.length < totaleDesiderato) {
        const risorsa = rng.pick(RISORSE_COMUNI);
        const quantita = rng.nextInt(10, 40);
        missioni.push({
          id: nextMissionId(),
          tipo: "richiestaCommerciale",
          titolo: "Richiesta commerciale",
          descrizione: `Vendi ${quantita} unita' di ${risorsa} al mercato.`,
          principale: false,
          stato: "disponibile",
          obiettivo: { tipo: "vendiRisorsa", risorsa, quantita, progresso: 0 },
          ricompensa: creaRicompensa(rng, 65),
          ricompensaNascosta: forseRicompensaNascosta(rng, 65),
        });
      }
      break;
    }
  }

  return missioni;
}

export type { ObiettivoMissione };
