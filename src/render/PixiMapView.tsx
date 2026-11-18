import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type DragEvent } from "react";
import { Application, Assets, Container, FederatedPointerEvent, Graphics, Point, Sprite, Text } from "pixi.js";
import type { Planet, ShuttleEntity, Vector2, WreckField } from "../domain/types";
import { WORLD } from "../domain/worldConstants";
import { BALANCE } from "../domain/initialState";
import { calcolaPercorso } from "../simulation/pathfinding";
import { creaPlanetSprite, type PlanetSpriteHandle } from "./planetSprite";
import { precaricaFotoPianeti } from "./planetTextures";
import naveMadreUrl from "../assets/sprites/ships/nave_madre.png";
import navettaUrl from "../assets/sprites/ships/navetta.png";

/** Lunghezza dell'immagine della nave madre (ritagliata/mascherata, vedi
 * scripts/process_ship.py) espressa in unita' mondo: la foto reale ha un
 * aspect ratio proprio, diverso dal vecchio triangolo procedurale. */
const NAVE_MADRE_LUNGHEZZA_MONDO = 60;
/** Le navette sono un mezzo molto piu' piccolo della nave madre: l'asset
 * esisteva gia' pronto (`src/assets/sprites/ships/navetta.png`) ma non era
 * mai stato collegato al rendering (richiesta utente: "non vedo le
 * navicelle"). */
const NAVETTA_LUNGHEZZA_MONDO = 22;

export interface PixiMapViewHandle {
  ricentra: () => void;
}

export interface PixiMapViewProps {
  pianetiScoperti: Planet[];
  relittiScoperti: WreckField[];
  /** Orologio simulato di gioco, usato per calcolare il tempo residuo delle
   * azioni a tempo (es. investigazione) da mostrare sul pianeta. */
  tempoSimulatoMs: number;
  mothershipPosizione: Vector2;
  mothershipOrientamento: number;
  mothershipPercorso: Vector2[];
  navette: ShuttleEntity[];
  pianetaSelezionatoId: string | null;
  onSelezionaPianeta: (id: string) => void;
  onMuoviNaveMadre: (destinazione: Vector2) => void;
  /** Non null quando una carta e' "armata" (click o drag in corso): disattiva
   * il movimento della nave madre al click (A4) e abilita l'evidenziazione
   * dei bersagli. */
  modalitaBersaglioCarta: {
    bersagliPianetaValidi: Set<string>;
    accettaPuntoMappa: boolean;
  } | null;
  onBersaglioPianetaCarta: (planetId: string) => void;
  onBersaglioMappaCarta: (punto: Vector2) => void;
  onDropCartaSuPianeta: (cardInstanceId: string, planetId: string) => void;
  onDropCartaSuMappa: (cardInstanceId: string, punto: Vector2) => void;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const ZOOM_INIZIALE = 1.8;
const DRAG_THRESHOLD_PX = 6;

export const PixiMapView = forwardRef<PixiMapViewHandle, PixiMapViewProps>(function PixiMapView(
  {
    pianetiScoperti,
    relittiScoperti,
    tempoSimulatoMs,
    mothershipPosizione,
    mothershipOrientamento,
    mothershipPercorso,
    navette,
    pianetaSelezionatoId,
    onSelezionaPianeta,
    onMuoviNaveMadre,
    modalitaBersaglioCarta,
    onBersaglioPianetaCarta,
    onBersaglioMappaCarta,
    onDropCartaSuPianeta,
    onDropCartaSuMappa,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const mothershipGfxRef = useRef<Sprite | null>(null);
  const navetteLayerRef = useRef<Container | null>(null);
  const navetteGfxRef = useRef<Map<string, Sprite>>(new Map());
  const navettaTextureRef = useRef<import("pixi.js").Texture | null>(null);
  const percorsoLineRef = useRef<Graphics | null>(null);
  const rottaPreviewLineRef = useRef<Graphics | null>(null);
  const rottaPreviewLabelRef = useRef<Text | null>(null);
  const sensorRingRef = useRef<Graphics | null>(null);
  const selectionRingRef = useRef<Graphics | null>(null);
  const targetHighlightLayerRef = useRef<Container | null>(null);
  const planetLayerRef = useRef<Container | null>(null);
  const wreckLayerRef = useRef<Container | null>(null);
  const planetSpritesRef = useRef<Map<string, PlanetSpriteHandle>>(new Map());
  // Traccia l'ultimo stato `investigato` noto per cui lo sprite e' stato
  // costruito: serve a rilevare il momento in cui un pianeta viene
  // investigato durante la partita, per ricreare lo sprite con la foto
  // reale (altrimenti, una volta creato, lo sprite non verrebbe mai piu'
  // toccato: vedi l'effect sotto).
  const planetInvestigatoRef = useRef<Map<string, boolean>>(new Map());
  const wreckGfxRef = useRef<Map<string, Graphics>>(new Map());
  const callbacksRef = useRef({
    onSelezionaPianeta,
    onMuoviNaveMadre,
    modalitaBersaglioCarta,
    onBersaglioPianetaCarta,
    onBersaglioMappaCarta,
    mothershipPosizione,
    pianetiScoperti,
  });
  callbacksRef.current = {
    onSelezionaPianeta,
    onMuoviNaveMadre,
    modalitaBersaglioCarta,
    onBersaglioPianetaCarta,
    onBersaglioMappaCarta,
    mothershipPosizione,
    pianetiScoperti,
  };
  // L'inizializzazione di PixiJS e' asincrona (app.init): gli effect che
  // popolano la scena (pianeti, relitti, nave madre) devono poter rieseguire
  // appena l'app e' pronta, non solo quando cambiano le loro props.
  const [pixiReady, setPixiReady] = useState(false);

  useImperativeHandle(ref, () => ({
    ricentra: () => {
      const world = worldRef.current;
      const app = appRef.current;
      if (!world || !app) return;
      world.scale.set(ZOOM_INIZIALE);
      world.position.set(
        app.renderer.width / 2 - mothershipPosizione.x * ZOOM_INIZIALE,
        app.renderer.height / 2 - mothershipPosizione.y * ZOOM_INIZIALE,
      );
    },
  }));

  useEffect(() => {
    let destroyed = false;
    const app = new Application();
    const host = hostRef.current;
    if (!host) return;

    app
      .init({
        resizeTo: host,
        background: "#03050a",
        antialias: true,
      })
      .then(async () => {
        if (destroyed) {
          app.destroy(true);
          return;
        }
        // Caricata esplicitamente (non Texture.from su una stringa, che
        // creerebbe lo sprite prima che le dimensioni reali dell'immagine
        // siano note, sbagliando la scala iniziale).
        const naveMadreTexture = await Assets.load(naveMadreUrl);
        const navettaTexture = await Assets.load(navettaUrl);
        navettaTextureRef.current = navettaTexture;
        await precaricaFotoPianeti();
        if (destroyed) {
          app.destroy(true);
          return;
        }
        appRef.current = app;
        host.appendChild(app.canvas);

        const world = new Container();
        world.position.set(app.renderer.width / 2, app.renderer.height / 2);
        world.scale.set(ZOOM_INIZIALE);
        app.stage.addChild(world);
        worldRef.current = world;
        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;

        // --- Pan & zoom -------------------------------------------------------
        let dragging = false;
        let dragMoved = false;
        let lastPointer = { x: 0, y: 0 };

        // --- Rotta della nave madre: si imposta trascinando DALLA nave madre
        // fino al punto di arrivo (richiesta utente: non piu' un semplice
        // click su un punto qualsiasi della mappa, che risultava troppo
        // facile da attivare per sbaglio durante il pan). Mentre si trascina,
        // una linea di anteprima segue il percorso effettivo (aggiramento
        // ostacoli incluso, stesso calcolo del motore) e al centro mostra il
        // carburante che si consumerebbe rilasciando li'. ---
        let rottaDragAttiva = false;

        const aggiornaAnteprimaRotta = (puntoMondo: Vector2) => {
          const linea = rottaPreviewLineRef.current;
          const label = rottaPreviewLabelRef.current;
          if (!linea || !label) return;
          const partenza = callbacksRef.current.mothershipPosizione;
          const ostacoli = callbacksRef.current.pianetiScoperti
            .filter((p) => p.scoperto)
            .filter((p) => Math.hypot(p.posizione.x - puntoMondo.x, p.posizione.y - puntoMondo.y) > p.raggio)
            .map((p) => ({ posizione: p.posizione, raggio: p.raggio }));
          const percorso = calcolaPercorso(partenza, puntoMondo, ostacoli, BALANCE.mothershipMargineOstacolo);

          linea.clear();
          linea.moveTo(partenza.x, partenza.y);
          let distanzaTotale = 0;
          let precedente = partenza;
          for (const punto of percorso) {
            linea.lineTo(punto.x, punto.y);
            distanzaTotale += Math.hypot(punto.x - precedente.x, punto.y - precedente.y);
            precedente = punto;
          }
          linea.stroke({ color: 0x39f6ff, width: 2, alpha: 0.85 });

          const carburanteStimato = Math.round(distanzaTotale * BALANCE.mothershipConsumoCarburantePerUnita);
          label.text = `${carburanteStimato} carburante`;
          const metaX = (partenza.x + puntoMondo.x) / 2;
          const metaY = (partenza.y + puntoMondo.y) / 2;
          const globale = world.toGlobal(new Point(metaX, metaY));
          label.position.set(globale.x - label.width / 2, globale.y - label.height / 2);
          label.visible = true;
          linea.visible = true;
        };

        const terminaAnteprimaRotta = () => {
          rottaPreviewLineRef.current?.clear();
          if (rottaPreviewLineRef.current) rottaPreviewLineRef.current.visible = false;
          if (rottaPreviewLabelRef.current) rottaPreviewLabelRef.current.visible = false;
        };

        app.stage.on("pointerdown", (e: FederatedPointerEvent) => {
          if (rottaDragAttiva) return;
          dragging = true;
          dragMoved = false;
          lastPointer = { x: e.global.x, y: e.global.y };
        });

        app.stage.on("pointermove", (e: FederatedPointerEvent) => {
          if (rottaDragAttiva) {
            const puntoMondo = world.toLocal(e.global);
            aggiornaAnteprimaRotta({ x: puntoMondo.x, y: puntoMondo.y });
            return;
          }
          if (!dragging) return;
          const dx = e.global.x - lastPointer.x;
          const dy = e.global.y - lastPointer.y;
          if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) dragMoved = true;
          if (dragMoved) {
            world.position.x += dx;
            world.position.y += dy;
          }
          lastPointer = { x: e.global.x, y: e.global.y };
        });

        const endDrag = (e: FederatedPointerEvent) => {
          if (rottaDragAttiva) {
            const puntoMondo = world.toLocal(e.global);
            terminaAnteprimaRotta();
            rottaDragAttiva = false;
            callbacksRef.current.onMuoviNaveMadre({ x: puntoMondo.x, y: puntoMondo.y });
            return;
          }
          if (dragging && !dragMoved) {
            const localPoint = world.toLocal(e.global);
            const modalita = callbacksRef.current.modalitaBersaglioCarta;
            // Il click su spazio libero non muove piu' la nave madre (richiesta
            // utente): la rotta si imposta solo trascinando dalla nave madre
            // (vedi pointerdown sullo sprite, sotto). Un click altrove propone
            // ancora il punto come bersaglio carta, se la carta in selezione lo
            // accetta (A4).
            if (modalita?.accettaPuntoMappa) {
              callbacksRef.current.onBersaglioMappaCarta({ x: localPoint.x, y: localPoint.y });
            }
          }
          dragging = false;
          dragMoved = false;
        };
        app.stage.on("pointerup", endDrag);
        app.stage.on("pointerupoutside", endDrag);

        app.canvas.addEventListener(
          "wheel",
          (e: WheelEvent) => {
            e.preventDefault();
            const rect = app.canvas.getBoundingClientRect();
            const pointer = new Point(e.clientX - rect.left, e.clientY - rect.top);
            const beforeLocal = world.toLocal(pointer);
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, world.scale.x * factor));
            world.scale.set(newScale);
            const afterGlobal = world.toGlobal(beforeLocal);
            world.position.x += pointer.x - afterGlobal.x;
            world.position.y += pointer.y - afterGlobal.y;
          },
          { passive: false },
        );

        // --- Griglia di sfondo (puramente decorativa) ------------------------
        const grid = new Graphics();
        const span = WORLD.estensioneRegioneMeta + 200;
        const step = 150;
        for (let x = -span; x <= span; x += step) {
          grid.moveTo(x, -span).lineTo(x, span);
        }
        for (let y = -span; y <= span; y += step) {
          grid.moveTo(-span, y).lineTo(span, y);
        }
        grid.stroke({ color: 0x12202e, width: 1, alpha: 0.5 });
        world.addChildAt(grid, 0);

        // --- Raggio sensori (nebbia di guerra): indica l'area attualmente rilevata. ---
        const sensorRing = new Graphics();
        world.addChild(sensorRing);
        sensorRingRef.current = sensorRing;

        // --- Livelli per relitti e pianeti --------------------------------------
        const wreckLayer = new Container();
        world.addChild(wreckLayer);
        wreckLayerRef.current = wreckLayer;

        const planetLayer = new Container();
        world.addChild(planetLayer);
        planetLayerRef.current = planetLayer;

        // --- Anello di selezione (sopra i pianeti) ------------------------------
        const selectionRing = new Graphics();
        selectionRing.visible = false;
        world.addChild(selectionRing);
        selectionRingRef.current = selectionRing;

        // --- Evidenziazione bersagli validi per la carta in selezione -----------
        const targetHighlightLayer = new Container();
        world.addChild(targetHighlightLayer);
        targetHighlightLayerRef.current = targetHighlightLayer;

        // --- Percorso pianificato della nave madre (waypoint di aggiramento inclusi) ---
        const percorsoLine = new Graphics();
        world.addChild(percorsoLine);
        percorsoLineRef.current = percorsoLine;

        // --- Anteprima della rotta durante il trascinamento dalla nave madre
        // (vedi "Rotta della nave madre" sopra): la linea vive nel mondo
        // (segue pan/zoom e i waypoint reali), l'etichetta del carburante
        // sullo stage (dimensione leggibile indipendente dallo zoom). ---
        const rottaPreviewLine = new Graphics();
        rottaPreviewLine.visible = false;
        world.addChild(rottaPreviewLine);
        rottaPreviewLineRef.current = rottaPreviewLine;

        const rottaPreviewLabel = new Text({
          text: "",
          style: { fill: 0xe6f3fb, fontSize: 13, fontFamily: "Consolas, 'Courier New', monospace", stroke: { color: 0x05070c, width: 4 } },
        });
        rottaPreviewLabel.visible = false;
        app.stage.addChild(rottaPreviewLabel);
        rottaPreviewLabelRef.current = rottaPreviewLabel;

        // --- Nave madre: fotografia reale (A5), motori a sinistra = la prua
        // punta verso +X (destra) a rotazione zero, coerente con la fisica
        // del motore (orientamento 0 = direzione +X, src/simulation/engine.ts). ---
        const mothership = new Sprite(naveMadreTexture);
        mothership.anchor.set(0.5, 0.5);
        const scalaNaveMadre = NAVE_MADRE_LUNGHEZZA_MONDO / mothership.texture.width;
        mothership.scale.set(scalaNaveMadre);
        mothership.position.set(mothershipPosizione.x, mothershipPosizione.y);
        mothership.rotation = mothershipOrientamento;
        mothership.eventMode = "static";
        mothership.cursor = "grab";
        mothership.on("pointerdown", (e: FederatedPointerEvent) => {
          // Solo la rotta si trascina dalla nave madre (richiesta utente): se
          // e' in corso una selezione bersaglio carta, il click sulla nave
          // madre non deve avviare una rotta (A4, coerente col resto della
          // selezione bersaglio che resta gestita dai pannelli/altri sprite).
          if (callbacksRef.current.modalitaBersaglioCarta) return;
          e.stopPropagation();
          rottaDragAttiva = true;
        });
        world.addChild(mothership);
        mothershipGfxRef.current = mothership;

        // --- Navette: livello dedicato, popolato/aggiornato dall'effect sotto. ---
        const navetteLayer = new Container();
        world.addChild(navetteLayer);
        navetteLayerRef.current = navetteLayer;

        // --- Loop di animazione: rotazione pianeti, pulsazione anomali, sensori ---
        app.ticker.add((ticker) => {
          const dtMs = ticker.deltaMS;
          const zoomScale = world.scale.x;
          for (const sprite of planetSpritesRef.current.values()) sprite.aggiorna(dtMs, zoomScale);
        });

        setPixiReady(true);
      });

    return () => {
      destroyed = true;
      const app = appRef.current;
      if (app) {
        app.destroy(true, { children: true });
        appRef.current = null;
      }
    };
    // Il mondo Pixi viene creato una sola volta al mount; gli aggiornamenti
    // successivi (nuovi pianeti scoperti, selezione, movimento) sono gestiti
    // dagli effect dedicati sotto, senza ricreare la scena.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggiorna posizione/rotazione della nave madre e l'anello sensori a ogni render.
  useEffect(() => {
    const nave = mothershipGfxRef.current;
    if (nave) {
      nave.position.set(mothershipPosizione.x, mothershipPosizione.y);
      nave.rotation = mothershipOrientamento;
    }
    const ring = sensorRingRef.current;
    if (ring) {
      ring.clear();
      ring
        .circle(mothershipPosizione.x, mothershipPosizione.y, WORLD.visibilitaRaggio)
        .stroke({ color: 0x37d6ff, width: 1.5, alpha: 0.22 });
    }
  }, [mothershipPosizione.x, mothershipPosizione.y, mothershipOrientamento, pixiReady]);

  // Crea/aggiorna gli sprite delle navette (richiesta utente: "non vedo le
  // navicelle quando faccio investiga o altro" — l'asset esisteva ma non era
  // mai stato collegato al rendering). Rotazione stimata dalla direzione
  // verso la destinazione corrente (le navette non hanno un campo
  // `orientamento` proprio, a differenza della nave madre). Richiesta utente:
  // le navette devono essere visibili SOLO durante un'azione (in viaggio,
  // in attesa/carico, in ritorno...), non quando sono "libere" ferme alla
  // nave madre — quindi niente sprite per quelle in stato "libera".
  useEffect(() => {
    const layer = navetteLayerRef.current;
    const texture = navettaTextureRef.current;
    if (!layer || !texture) return;

    const idPresenti = new Set<string>();
    for (const navetta of navette) {
      if (navetta.stato === "libera") continue;
      idPresenti.add(navetta.id);
      let sprite = navetteGfxRef.current.get(navetta.id);
      if (!sprite) {
        sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 0.5);
        sprite.scale.set(NAVETTA_LUNGHEZZA_MONDO / texture.width);
        layer.addChild(sprite);
        navetteGfxRef.current.set(navetta.id, sprite);
      }
      sprite.position.set(navetta.posizione.x, navetta.posizione.y);
      if (navetta.destinazione) {
        const dx = navetta.destinazione.x - navetta.posizione.x;
        const dy = navetta.destinazione.y - navetta.posizione.y;
        if (Math.hypot(dx, dy) > 1) sprite.rotation = Math.atan2(dy, dx);
      }
    }

    for (const [id, sprite] of navetteGfxRef.current) {
      if (idPresenti.has(id)) continue;
      layer.removeChild(sprite);
      sprite.destroy();
      navetteGfxRef.current.delete(id);
    }
  }, [navette, pixiReady]);

  // Disegna il percorso pianificato residuo (incluso l'eventuale aggiramento
  // di un ostacolo), cosi' il giocatore vede dove sta andando la nave.
  useEffect(() => {
    const linea = percorsoLineRef.current;
    if (!linea) return;
    linea.clear();
    if (mothershipPercorso.length === 0) return;
    linea.moveTo(mothershipPosizione.x, mothershipPosizione.y);
    for (const punto of mothershipPercorso) linea.lineTo(punto.x, punto.y);
    linea.stroke({ color: 0xffd36e, width: 1.5, alpha: 0.5 });
  }, [mothershipPercorso, mothershipPosizione.x, mothershipPosizione.y, pixiReady]);

  // Crea gli sprite per i pianeti appena scoperti (la scoperta e' permanente:
  // qui si aggiunge soltanto, non si rimuove mai nulla) e ricrea quelli che
  // nel frattempo sono stati investigati, per passare dalla texture
  // procedurale alla foto reale (se disponibile per l'archetipo).
  useEffect(() => {
    const layer = planetLayerRef.current;
    if (!layer) return;
    for (const pianeta of pianetiScoperti) {
      const esistente = planetSpritesRef.current.get(pianeta.id);
      if (esistente && planetInvestigatoRef.current.get(pianeta.id) === pianeta.investigato) continue;
      if (esistente) {
        layer.removeChild(esistente.container);
        esistente.container.destroy({ children: true });
      }
      const sprite = creaPlanetSprite(pianeta);
      sprite.container.on("pointertap", (e) => {
        e.stopPropagation();
        const modalita = callbacksRef.current.modalitaBersaglioCarta;
        if (modalita) {
          if (modalita.bersagliPianetaValidi.has(pianeta.id)) {
            callbacksRef.current.onBersaglioPianetaCarta(pianeta.id);
          }
          // Bersaglio non valido per la carta in selezione: nessun effetto,
          // la selezione carta resta attiva per un nuovo tentativo.
          return;
        }
        callbacksRef.current.onSelezionaPianeta(pianeta.id);
      });
      layer.addChild(sprite.container);
      planetSpritesRef.current.set(pianeta.id, sprite);
      planetInvestigatoRef.current.set(pianeta.id, pianeta.investigato);
    }
  }, [pianetiScoperti, pixiReady]);

  // Aggiorna il timer "ben visibile" sul pianeta per l'investigazione in
  // corso (richiesta utente), col tempo residuo in secondi mm:ss.
  useEffect(() => {
    for (const pianeta of pianetiScoperti) {
      const sprite = planetSpritesRef.current.get(pianeta.id);
      if (!sprite) continue;
      if (pianeta.investigazioneCompletataAlMs === null) {
        sprite.impostaTimer(null);
        continue;
      }
      const residuoMs = Math.max(0, pianeta.investigazioneCompletataAlMs - tempoSimulatoMs);
      const residuoSec = Math.ceil(residuoMs / 1000);
      const minuti = Math.floor(residuoSec / 60);
      const secondi = residuoSec % 60;
      sprite.impostaTimer(`Investigazione: ${minuti}:${secondi.toString().padStart(2, "0")}`);
    }
  }, [pianetiScoperti, tempoSimulatoMs, pixiReady]);

  // Crea le grafiche per i relitti/campi di asteroidi scoperti.
  useEffect(() => {
    const layer = wreckLayerRef.current;
    if (!layer) return;
    for (const relitto of relittiScoperti) {
      if (wreckGfxRef.current.has(relitto.id)) continue;
      const g = new Graphics();
      const numFrammenti = relitto.tipo === "campoAsteroidi" ? 7 : 4;
      const rng = (seedOffset: number) => {
        // Variazione deterministica semplice basata sull'indice, sufficiente
        // per disperdere i frammenti in modo non uniforme.
        const x = Math.sin(seedOffset * 12.9898) * 43758.5453;
        return x - Math.floor(x);
      };
      for (let i = 0; i < numFrammenti; i++) {
        const angolo = rng(i) * Math.PI * 2;
        const dist = rng(i + 0.5) * relitto.raggio;
        const dimensione = 2 + rng(i + 0.25) * 4;
        g.circle(Math.cos(angolo) * dist, Math.sin(angolo) * dist, dimensione).fill({
          color: relitto.tipo === "relitto" ? 0x8a97a6 : 0x6b6155,
          alpha: 0.85,
        });
      }
      g.position.set(relitto.posizione.x, relitto.posizione.y);
      layer.addChild(g);
      wreckGfxRef.current.set(relitto.id, g);
    }
  }, [relittiScoperti, pixiReady]);

  // Evidenzia il pianeta selezionato con un anello dedicato.
  useEffect(() => {
    const ring = selectionRingRef.current;
    if (!ring) return;
    if (!pianetaSelezionatoId) {
      ring.visible = false;
      return;
    }
    const sprite = planetSpritesRef.current.get(pianetaSelezionatoId);
    const pianeta = pianetiScoperti.find((p) => p.id === pianetaSelezionatoId);
    if (!sprite || !pianeta) {
      ring.visible = false;
      return;
    }
    ring.clear();
    ring.circle(0, 0, pianeta.raggio + 6).stroke({ color: 0xffe27a, width: 2 });
    ring.position.set(pianeta.posizione.x, pianeta.posizione.y);
    ring.visible = true;
  }, [pianetaSelezionatoId, pianetiScoperti, pixiReady]);

  // Evidenzia tutti i pianeti scoperti che sono bersagli validi per la
  // carta attualmente in selezione (A4: "evidenziare bersagli validi").
  useEffect(() => {
    const layer = targetHighlightLayerRef.current;
    if (!layer) return;
    layer.removeChildren();
    if (!modalitaBersaglioCarta) return;

    for (const pianeta of pianetiScoperti) {
      if (!modalitaBersaglioCarta.bersagliPianetaValidi.has(pianeta.id)) continue;
      const anello = new Graphics();
      anello.circle(0, 0, pianeta.raggio + 10).stroke({ color: 0x6bffb0, width: 2.5, alpha: 0.85 });
      anello.position.set(pianeta.posizione.x, pianeta.posizione.y);
      layer.addChild(anello);
    }
  }, [modalitaBersaglioCarta, pianetiScoperti, pixiReady]);

  const risolviPuntoMondoDaEvento = (e: { clientX: number; clientY: number }): Vector2 | null => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world) return null;
    const rect = app.canvas.getBoundingClientRect();
    const locale = world.toLocal(new Point(e.clientX - rect.left, e.clientY - rect.top));
    return { x: locale.x, y: locale.y };
  };

  const gestisciDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const cardInstanceId = e.dataTransfer.getData("text/plain");
    if (!cardInstanceId) return;
    const puntoMondo = risolviPuntoMondoDaEvento(e);
    if (!puntoMondo) return;

    const pianetaColpito = pianetiScoperti.find((p) => Math.hypot(p.posizione.x - puntoMondo.x, p.posizione.y - puntoMondo.y) <= p.raggio);
    if (pianetaColpito) {
      onDropCartaSuPianeta(cardInstanceId, pianetaColpito.id);
    } else {
      onDropCartaSuMappa(cardInstanceId, puntoMondo);
    }
  };

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100%" }}
      aria-label="Mappa di gioco"
      role="img"
      onDragOver={(e) => e.preventDefault()}
      onDrop={gestisciDrop}
    />
  );
});
