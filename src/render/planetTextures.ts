import { Assets, Texture } from "pixi.js";
import { SeededRng } from "../domain/rng";
import type { PlanetArchetype } from "../domain/types";

import roccioso from "../assets/sprites/planets/roccioso.png";
import oceanico from "../assets/sprites/planets/oceanico.png";
import ghiacciato from "../assets/sprites/planets/ghiacciato.png";
import terrestre from "../assets/sprites/planets/terrestre.png";
import vulcanico from "../assets/sprites/planets/vulcanico.png";

/** Fotografie reali fornite dall'utente, ritagliate/mascherate a cerchio
 * (vedi scripts/process_planets.py): usate al posto della texture
 * procedurale quando disponibili per l'archetipo (A5: "se disponibili
 * usare file effettivamente presenti; altrimenti placeholder procedurali").
 * Solo le foto dei singoli pianeti: `archetipi_sheet_ref.webp` e'
 * esplicitamente esemplificativo (foglio di riferimento per le categorie,
 * non un asset) e non viene usato. Gassoso/cristallino/anomalo/desertico
 * non hanno una foto individuale tra gli asset forniti e restano
 * procedurali. */
const FOTO_PER_ARCHETIPO: Partial<Record<PlanetArchetype, string>> = {
  roccioso,
  oceanico,
  ghiacciato,
  terrestre,
  vulcanico,
};

export function hasPlanetPhoto(archetipo: PlanetArchetype): boolean {
  return archetipo in FOTO_PER_ARCHETIPO;
}

/** Precarica le fotografie reali nella Cache di Pixi prima che un qualunque
 * `getPlanetTexture` le richieda: `Texture.from(url)` su una stringa non
 * ancora in cache non la carica da sola (resta una texture vuota con un
 * warning in console), a differenza di un `Assets.load` esplicito. Va
 * chiamata una volta, prima di creare i primi sprite pianeta (vedi
 * `PixiMapView.tsx`, stesso trattamento gia' riservato alla nave madre). */
export async function precaricaFotoPianeti(): Promise<void> {
  await Assets.load(Object.values(FOTO_PER_ARCHETIPO));
}

// Famiglie di pattern procedurali per archetipo: la texture codifica solo
// luminosita' (bianco=in rilievo/luce, nero=cratere/ombra); il colore vero
// e proprio viene applicato a runtime via tint sullo sprite, cosi' lo
// stesso archetipo puo' avere infinite varianti di colore senza generare
// una texture per ogni combinazione (A5).
type FamigliaPattern = "chiazzato" | "fasce" | "frattura" | "ondulato";

const FAMIGLIA_PER_ARCHETIPO: Record<PlanetArchetype, FamigliaPattern> = {
  roccioso: "chiazzato",
  desertico: "chiazzato",
  vulcanico: "chiazzato",
  anomalo: "chiazzato",
  gassoso: "fasce",
  cristallino: "frattura",
  oceanico: "ondulato",
  terrestre: "ondulato",
  ghiacciato: "ondulato",
};

const TEXTURE_SIZE = 160;
const textureCache = new Map<string, Texture>();

function disegnaChiazzato(ctx: CanvasRenderingContext2D, rng: SeededRng): void {
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const numChiazze = rng.nextInt(18, 32);
  for (let i = 0; i < numChiazze; i++) {
    const x = rng.nextFloat(0, TEXTURE_SIZE);
    const y = rng.nextFloat(0, TEXTURE_SIZE);
    const r = rng.nextFloat(6, 26);
    const chiaro = rng.next() < 0.5;
    const tono = chiaro ? rng.nextInt(170, 220) : rng.nextInt(70, 120);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${tono},${tono},${tono},0.55)`);
    grad.addColorStop(1, `rgba(${tono},${tono},${tono},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function disegnaFasce(ctx: CanvasRenderingContext2D, rng: SeededRng): void {
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const numFasce = rng.nextInt(7, 12);
  let y = 0;
  for (let i = 0; i < numFasce; i++) {
    const altezza = TEXTURE_SIZE / numFasce;
    const tono = rng.nextInt(90, 210);
    ctx.fillStyle = `rgba(${tono},${tono},${tono},0.5)`;
    ctx.fillRect(0, y, TEXTURE_SIZE, altezza * rng.nextFloat(0.6, 1.1));
    y += altezza;
  }
}

function disegnaFrattura(ctx: CanvasRenderingContext2D, rng: SeededRng): void {
  ctx.fillStyle = "rgb(140,140,140)";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  ctx.strokeStyle = "rgba(230,230,230,0.5)";
  const numLinee = rng.nextInt(10, 18);
  for (let i = 0; i < numLinee; i++) {
    ctx.lineWidth = rng.nextFloat(1, 3);
    ctx.beginPath();
    ctx.moveTo(rng.nextFloat(0, TEXTURE_SIZE), rng.nextFloat(0, TEXTURE_SIZE));
    ctx.lineTo(rng.nextFloat(0, TEXTURE_SIZE), rng.nextFloat(0, TEXTURE_SIZE));
    ctx.stroke();
  }
}

function disegnaOndulato(ctx: CanvasRenderingContext2D, rng: SeededRng): void {
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  const numOnde = rng.nextInt(5, 9);
  for (let i = 0; i < numOnde; i++) {
    const yBase = rng.nextFloat(0, TEXTURE_SIZE);
    const ampiezza = rng.nextFloat(6, 16);
    const tono = rng.nextInt(170, 225);
    ctx.strokeStyle = `rgba(${tono},${tono},${tono},0.35)`;
    ctx.lineWidth = rng.nextFloat(3, 7);
    ctx.beginPath();
    for (let x = 0; x <= TEXTURE_SIZE; x += 8) {
      const y = yBase + Math.sin((x / TEXTURE_SIZE) * Math.PI * rng.nextFloat(1.5, 3)) * ampiezza;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** `usaFoto` e' deciso dal chiamante (richiede sia una foto disponibile per
 * l'archetipo, sia il pianeta investigato: vedi `planetSprite.ts`), non
 * ricalcolato qui, perche' la sola disponibilita' della foto non basta a
 * deciderne la visualizzazione. */
export function getPlanetTexture(archetipo: PlanetArchetype, variante: number, usaFoto: boolean): Texture {
  const foto = usaFoto ? FOTO_PER_ARCHETIPO[archetipo] : undefined;
  if (foto) {
    // Una sola fotografia per archetipo (non una per variante): la varieta'
    // tra pianeti dello stesso archetipo resta affidata a tint/alone/
    // atmosfera/scala (vedi planetSprite.ts), non a texture multiple.
    const cached = textureCache.get(archetipo);
    if (cached) return cached;
    const texture = Texture.from(foto);
    textureCache.set(archetipo, texture);
    return texture;
  }

  const chiave = `${archetipo}-${variante}`;
  const cached = textureCache.get(chiave);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.WHITE;

  const rng = new SeededRng(chiave);
  switch (FAMIGLIA_PER_ARCHETIPO[archetipo]) {
    case "chiazzato":
      disegnaChiazzato(ctx, rng);
      break;
    case "fasce":
      disegnaFasce(ctx, rng);
      break;
    case "frattura":
      disegnaFrattura(ctx, rng);
      break;
    case "ondulato":
      disegnaOndulato(ctx, rng);
      break;
  }

  const texture = Texture.from(canvas);
  textureCache.set(chiave, texture);
  return texture;
}
