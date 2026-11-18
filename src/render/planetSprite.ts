import { Container, Graphics, TilingSprite } from "pixi.js";
import type { Planet } from "../domain/types";
import { getPlanetTexture, hasPlanetPhoto } from "./planetTextures";

/** Schiarisce un colore verso il bianco di `quantita` (0=invariato,
 * 1=bianco puro): usato per attenuare il tint sulle fotografie reali, che
 * hanno gia' colore naturale proprio (a differenza delle texture
 * procedurali in scala di grigi, pensate apposta per un tint pieno). */
function schiarisci(colore: number, quantita: number): number {
  const r = (colore >> 16) & 0xff;
  const g = (colore >> 8) & 0xff;
  const b = colore & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * quantita);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

export interface PlanetSpriteHandle {
  container: Container;
  pianetaId: string;
  /** Aggiorna rotazione apparente e, per gli anomali, la pulsazione
   * dell'alone. `zoomScale` abilita un LOD leggero (B11, Macrostep 11:
   * "ottimizzazione... LOD"): sotto `SOGLIA_DETTAGLIO_LOD` alone e
   * atmosfera si nascondono e il loro aggiornamento per-frame si salta del
   * tutto, inutile quando i dettagli non sarebbero comunque percepibili a
   * quello zoom. La superficie resta sempre visibile e aggiornata. */
  aggiorna: (dtMs: number, zoomScale: number) => void;
}

/** Sotto questa scala della camera, i dettagli secondari (alone, atmosfera)
 * si nascondono e smettono di aggiornarsi. */
export const SOGLIA_DETTAGLIO_LOD = 0.6;

/**
 * Costruisce la rappresentazione visiva di un pianeta combinando a runtime:
 * fotografia reale (quando fornita dall'utente, ritagliata/mascherata a
 * cerchio, e solo dopo che il pianeta e' stato investigato: prima
 * dell'investigazione la composizione non e' nota al giocatore) o texture
 * procedurale per archetipo altrimenti, tint/colore indipendente,
 * alone/ombra cromatica, atmosfera opzionale e rotazione apparente via
 * scorrimento della texture (solo texture procedurali, pensate per il
 * tiling). Nessun elemento e' "cotto" in un'unica immagine: restano tutti
 * configurabili (A5). Chi chiama (`PixiMapView.tsx`) ricrea lo sprite
 * quando `investigato` cambia da false a true.
 */
export function creaPlanetSprite(pianeta: Planet): PlanetSpriteHandle {
  const container = new Container();
  container.position.set(pianeta.posizione.x, pianeta.posizione.y);
  container.eventMode = "static";
  container.cursor = "pointer";

  const raggio = pianeta.raggio;
  const vp = pianeta.visualProfile;

  // --- Alone/ombra cromatica (dietro al pianeta) ---------------------------
  const halo = new Graphics();
  const haloLivelli = 4;
  for (let i = haloLivelli; i >= 1; i--) {
    const r = raggio * (1 + i * 0.22);
    const alpha = (vp.haloIntensity * 0.22) / i;
    halo.circle(0, 0, r).fill({ color: vp.haloColor, alpha });
  }
  container.addChild(halo);

  // --- Atmosfera opzionale ---------------------------------------------------
  let atmosfera: Graphics | null = null;
  if (vp.atmosfera) {
    atmosfera = new Graphics();
    atmosfera.circle(0, 0, raggio * 1.14).fill({ color: vp.tintColor, alpha: 0.08 + vp.nuvolosita * 0.14 });
    container.addChild(atmosfera);
  }

  // --- Superficie: fotografia reale se disponibile e il pianeta e' stato
  // investigato, altrimenti texture procedurale, mascherata a cerchio in
  // entrambi i casi. Prima dell'investigazione la composizione del pianeta
  // non e' nota al giocatore (vedi `investigato`, A3/Macrostep 3): mostrare
  // subito la foto reale rivelerebbe l'archetipo in anticipo, quindi resta
  // procedurale finche' non viene investigato con la carta Investiga. ------
  const foto = hasPlanetPhoto(pianeta.archetipo) && pianeta.investigato;
  const texture = getPlanetTexture(pianeta.archetipo, vp.variantiTexture, foto);
  const superficie = new TilingSprite({ texture, width: raggio * 2, height: raggio * 2 });
  superficie.position.set(-raggio, -raggio);
  if (foto) {
    // Una fotografia non e' pensata per il tiling: un singolo "tile" va
    // scalato esattamente sulla dimensione del pianeta, altrimenti
    // TilingSprite la disegna alla risoluzione nativa (ritagliando solo
    // l'angolo in alto a sinistra invece di mostrare l'immagine intera).
    superficie.tileScale.set((raggio * 2) / texture.width, (raggio * 2) / texture.height);
  }
  // Le texture procedurali sono in scala di grigi, pensate per un tint
  // pieno; una fotografia ha gia' colore naturale, quindi riceve solo un
  // tint leggero (variazione cromatica sottile, non una ricolorazione).
  superficie.tint = foto ? schiarisci(vp.tintColor, 0.8) : vp.tintColor;

  const maskSuperficie = new Graphics().circle(0, 0, raggio).fill(0xffffff);
  container.addChild(maskSuperficie);
  superficie.mask = maskSuperficie;
  container.addChild(superficie);

  // --- Illuminazione direzionale (terminator), coerente su tutta la mappa ----
  const ombra = new Graphics();
  ombra.circle(raggio * 0.45, raggio * 0.45, raggio * 0.98).fill({ color: 0x000000, alpha: 0.38 });
  const maskOmbra = new Graphics().circle(0, 0, raggio).fill(0xffffff);
  container.addChild(maskOmbra);
  ombra.mask = maskOmbra;
  container.addChild(ombra);

  // --- Bordo sottile per leggibilita' contro lo sfondo stellato ---------------
  const bordo = new Graphics().circle(0, 0, raggio).stroke({ color: vp.haloColor, width: 1.2, alpha: 0.6 });
  container.addChild(bordo);

  let accumuloMs = 0;
  const aggiorna = (dtMs: number, zoomScale: number) => {
    const dettagliVisibili = zoomScale >= SOGLIA_DETTAGLIO_LOD;
    halo.visible = dettagliVisibili;
    if (atmosfera) atmosfera.visible = dettagliVisibili;

    // La rotazione apparente della texture e la pulsazione dell'alone non
    // sarebbero comunque percepibili sotto la soglia: si evita il calcolo.
    if (!dettagliVisibili) return;

    accumuloMs += dtMs;
    // Le fotografie reali non sono texture seamless: farle scorrere
    // mostrerebbe una giunzione visibile. La rotazione apparente resta
    // solo sulle texture procedurali, pensate apposta per il tiling (A5).
    if (!foto) {
      superficie.tilePosition.x -= (vp.velocitaRotazione * dtMs * texture.width) / 1000;
    }
    if (pianeta.archetipo === "anomalo") {
      const pulsazione = 0.7 + Math.sin(accumuloMs / 350) * 0.3;
      halo.alpha = pulsazione;
    }
  };

  return { container, pianetaId: pianeta.id, aggiorna };
}
