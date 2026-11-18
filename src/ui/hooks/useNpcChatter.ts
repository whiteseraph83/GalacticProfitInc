import { useEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/types";
import { scegliMessaggioChatter, type ChatterMessage } from "../../domain/npcChatter";
import { prossimaScenaSceneggiatura } from "../../domain/campaignScenes";
import { sceneAttiva } from "../../simulation/narrative";

// Rileva i trigger di stato della libreria dialoghi NPC (docs/TODO.md,
// "Libreria dialoghi NPC completa") osservando lo stato di gioco in sola
// lettura, stessa filosofia di `src/simulation/narrative.ts`: nessuna
// nuova regola nel motore, solo lettura e confronto col frame precedente
// (edge-triggered, cosi' un trigger non si ripete finche' la condizione
// non torna falsa e poi di nuovo vera). La coda/i "visti" vivono solo in
// questo hook (non persistiti nel salvataggio): l'anti-ripetizione si
// azzera a un nuovo caricamento, limite noto e accettato per questa prima
// versione (vedi docs/TODO.md).

interface Segnali {
  pianetiScoperti: number;
  pianetiInvestigati: number;
  contrattiMinerari: number;
  stivaRiempimento: number;
  carburanteRiempimento: number;
  cartePerRevisione: number;
  statoRevisione: string;
  missioniDisponibili: number;
  missioniCompletate: number;
  ricercheCompletate: number;
  fabbricaCostruita: boolean;
  codaFabbrica: number;
  numeroRegione: number;
  crediti: number;
  civiltaScoperte: number;
  fiducia: number;
}

function calcolaSegnali(stato: GameState): Segnali {
  const stivaTotale = Object.values(stato.mothership.stivaCarico).reduce((somma: number, v) => somma + (v ?? 0), 0);
  return {
    pianetiScoperti: stato.pianeti.filter((p) => p.scoperto).length,
    pianetiInvestigati: stato.pianeti.filter((p) => p.investigato).length,
    contrattiMinerari: stato.contrattiMinerari.length,
    stivaRiempimento: stato.mothership.stivaCapacita > 0 ? stivaTotale / stato.mothership.stivaCapacita : 0,
    carburanteRiempimento: stato.mothership.serbatoioCapacita > 0 ? stato.mothership.carburante / stato.mothership.serbatoioCapacita : 1,
    cartePerRevisione: stato.review.sogliaCarteProssimaRevisione - stato.review.carteGiocateDallUltimaRevisione,
    statoRevisione: stato.review.statoRevisione,
    missioniDisponibili: stato.missioni.filter((m) => m.stato === "disponibile").length,
    missioniCompletate: stato.missioni.filter((m) => m.stato === "completata").length,
    ricercheCompletate: stato.ricerca.completate.length,
    fabbricaCostruita: stato.fabbrica.costruita,
    codaFabbrica: stato.fabbrica.coda.length,
    numeroRegione: stato.numeroRegione,
    crediti: stato.crediti,
    civiltaScoperte: stato.civilta.filter((c) => c.scoperta).length,
    fiducia: stato.review.fiducia,
  };
}

interface Rilevatore {
  trigger: string;
  scatta: (prima: Segnali, dopo: Segnali) => boolean;
}

const RILEVATORI: Rilevatore[] = [
  { trigger: "tutorial.scan", scatta: (p, d) => p.pianetiScoperti === 0 && d.pianetiScoperti >= 1 },
  { trigger: "tutorial.mine", scatta: (p, d) => p.contrattiMinerari === 0 && d.contrattiMinerari >= 1 },
  { trigger: "fuel.low", scatta: (p, d) => p.carburanteRiempimento > 0.3 && d.carburanteRiempimento <= 0.3 },
  { trigger: "fuel.critical", scatta: (p, d) => p.carburanteRiempimento > 0.1 && d.carburanteRiempimento <= 0.1 },
  { trigger: "fuel.empty", scatta: (p, d) => p.carburanteRiempimento > 0 && d.carburanteRiempimento <= 0 },
  { trigger: "cargo.near_full", scatta: (p, d) => p.stivaRiempimento < 0.8 && d.stivaRiempimento >= 0.8 },
  { trigger: "cargo.full", scatta: (p, d) => p.stivaRiempimento < 0.95 && d.stivaRiempimento >= 0.95 },
  { trigger: "review.near", scatta: (p, d) => p.cartePerRevisione > 3 && d.cartePerRevisione <= 3 && d.cartePerRevisione >= 0 },
  { trigger: "review.ready", scatta: (p, d) => p.statoRevisione !== "dovuta" && d.statoRevisione === "dovuta" },
  { trigger: "review.paid", scatta: (p, d) => p.statoRevisione !== "nessuna" && d.statoRevisione === "nessuna" },
  { trigger: "mission.offer", scatta: (p, d) => d.missioniDisponibili > p.missioniDisponibili },
  { trigger: "mission.complete", scatta: (p, d) => d.missioniCompletate > p.missioniCompletate },
  { trigger: "research.completed", scatta: (p, d) => d.ricercheCompletate > p.ricercheCompletate },
  { trigger: "factory.first", scatta: (p, d) => !p.fabbricaCostruita && d.fabbricaCostruita },
  { trigger: "factory.done", scatta: (p, d) => p.codaFabbrica > 0 && d.codaFabbrica < p.codaFabbrica },
  { trigger: "planet.discovered", scatta: (p, d) => p.pianetiScoperti >= 1 && d.pianetiScoperti > p.pianetiScoperti },
  { trigger: "planet.investigate", scatta: (p, d) => p.pianetiInvestigati >= 1 && d.pianetiInvestigati > p.pianetiInvestigati },
  { trigger: "jump.first", scatta: (p, d) => p.numeroRegione === 1 && d.numeroRegione === 2 },
  { trigger: "jump.complete", scatta: (p, d) => p.numeroRegione >= 2 && d.numeroRegione > p.numeroRegione },
  { trigger: "credits.low", scatta: (p, d) => p.crediti >= 500 && d.crediti < 500 },
  { trigger: "first.meet", scatta: (p, d) => d.civiltaScoperte > p.civiltaScoperte },
  { trigger: "trust.high", scatta: (p, d) => p.fiducia < 80 && d.fiducia >= 80 },
  { trigger: "trust.low", scatta: (p, d) => p.fiducia >= 30 && d.fiducia < 30 },
];

export interface ChatterAttivo extends ChatterMessage {
  mostratoAlleMs: number;
}

export function useNpcChatter(stato: GameState): { attuale: ChatterAttivo | null; chiudi: () => void } {
  const [coda, setCoda] = useState<ChatterAttivo[]>([]);
  const prevSegnaliRef = useRef<Segnali | null>(null);
  const vistiRef = useRef<Set<string>>(new Set());
  const sceneVisteRef = useRef<Set<string>>(new Set());
  const narrativaSceneVisteRef = useRef<Set<string>>(new Set());
  const primaVoltaRef = useRef(true);
  const seedRef = useRef<string | null>(null);

  useEffect(() => {
    const segnali = calcolaSegnali(stato);
    // "Ricomincia partita" (SavePanel) non rimonta questo componente: lo
    // rileva dal cambio di `seed` per azzerare code/visti e far ripartire
    // il primo dialogo, come al primo avvio (richiesta utente).
    const riavviata = seedRef.current !== null && seedRef.current !== stato.seed;
    seedRef.current = stato.seed;
    if (riavviata) {
      vistiRef.current = new Set();
      sceneVisteRef.current = new Set();
      narrativaSceneVisteRef.current = new Set();
      primaVoltaRef.current = true;
      prevSegnaliRef.current = null;
    }
    const prev = prevSegnaliRef.current;
    prevSegnaliRef.current = segnali;

    const nuoviMessaggi: ChatterAttivo[] = [];
    // Ordine di priorita' quando la coda e' libera: 1) sceneggiatura a
    // capitoli (il testo curato fornito dall'utente, incluso l'intro
    // riveduta di C1_S01 con Direttore Magnus Voss) — deve comparire per
    // prima, non dopo il chiacchiericcio NPC o la campagna storica, altrimenti
    // il giocatore vede prima testo "minore" e la scena d'apertura arriva in
    // ritardo; 2) campagna narrativa principale (`src/domain/narrative.ts`,
    // 12 scene approvate/testate, il cui avanzamento resta gestito da
    // `NarrativePanel`); 3) chiacchiericcio NPC innescato da trigger di stato.
    if (coda.length === 0) {
      const scena = prossimaScenaSceneggiatura(stato.campagna.capitoloCorrente, sceneVisteRef.current);
      if (scena) {
        sceneVisteRef.current.add(scena.id);
        for (const riga of scena.lines) {
          nuoviMessaggi.push({
            id: `${scena.id}-${nuoviMessaggi.length}`,
            speaker: riga.speaker,
            trigger: scena.trigger,
            tone: "story",
            text: riga.text,
            mostratoAlleMs: Date.now(),
          });
        }
      }
    }

    if (nuoviMessaggi.length === 0) {
      const scenaNarrativa = stato.campagna.finaleOttenuto ? null : sceneAttiva(stato);
      if (scenaNarrativa && !narrativaSceneVisteRef.current.has(scenaNarrativa.id)) {
        narrativaSceneVisteRef.current.add(scenaNarrativa.id);
        nuoviMessaggi.push({
          id: `narrativa-${scenaNarrativa.id}`,
          speaker: scenaNarrativa.mittente,
          trigger: "narrativa",
          tone: "story",
          text: scenaNarrativa.testo,
          mostratoAlleMs: Date.now(),
        });
      }
    }

    if (nuoviMessaggi.length === 0) {
      if (primaVoltaRef.current) {
        primaVoltaRef.current = false;
        const benvenuto = scegliMessaggioChatter("game.start", vistiRef.current);
        if (benvenuto) {
          vistiRef.current.add(benvenuto.id);
          nuoviMessaggi.push({ ...benvenuto, mostratoAlleMs: Date.now() });
        }
      } else if (prev) {
        for (const rilevatore of RILEVATORI) {
          if (!rilevatore.scatta(prev, segnali)) continue;
          const messaggio = scegliMessaggioChatter(rilevatore.trigger, vistiRef.current);
          if (!messaggio) continue;
          vistiRef.current.add(messaggio.id);
          nuoviMessaggi.push({ ...messaggio, mostratoAlleMs: Date.now() });
        }
      }
    } else {
      // La sceneggiatura/campagna ha gia' riempito la coda questo giro:
      // il game.start del chiacchiericcio non deve piu' scattare dopo
      // (altrimenti si accoderebbe comunque al primo svuotamento), ma va
      // comunque segnato come "gia' considerato" una volta sola.
      primaVoltaRef.current = false;
    }

    if (nuoviMessaggi.length > 0) {
      if (riavviata) setCoda(nuoviMessaggi);
      else setCoda((attuale) => [...attuale, ...nuoviMessaggi]);
    } else if (riavviata) {
      setCoda([]);
    }
  }, [stato, coda.length]);

  const chiudi = () => setCoda((attuale) => attuale.slice(1));

  return { attuale: coda[0] ?? null, chiudi };
}
