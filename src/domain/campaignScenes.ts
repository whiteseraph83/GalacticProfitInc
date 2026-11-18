import scenesData from "../assets/reference/campagna/Galactic_Profit_Inc_Scene_Capitoli.json";
import type { CapitoloId } from "./types";

// Sceneggiatura a capitoli fornita dall'utente (docs/TODO.md, "Campagna
// narrativa a capitoli"): 5 capitoli, 41 scene narrative + 9 scene
// operative. Qui esposta come livello narrativo "affiancato" (opzione (b)
// del documento, docs/TODO.md): puro contenuto di ambientazione mostrato
// nell'overlay a comparsa, non collegata a `src/domain/narrative.ts` (che
// resta l'unica fonte di verita' per capitoli/finali/allineamento, gia'
// approvata e testata — non va toccata da questa integrazione). Le scene
// "OPERATIVE" marcate `duplicate_of` sono escluse qui per evitare il
// doppio trigger (richiesta esplicita del documento); le altre operative
// (senza controparte di capitolo) non sono ancora collegate a un trigger
// meccanico affidabile e restano fuori da questa prima versione (vedi
// docs/TODO.md).

export interface CampaignSceneLine {
  speaker: string;
  text: string;
}

export interface CampaignScene {
  id: string;
  chapter: string;
  title: string;
  trigger: string;
  summary: string;
  lines: CampaignSceneLine[];
  choices: unknown[];
  duplicate_of?: string;
}

interface ScenesFile {
  chapters: { id: string; title: string }[];
  scenes: CampaignScene[];
}

const data = scenesData as ScenesFile;

/** Solo le scene dei 5 capitoli narrativi, in ordine di sceneggiatura,
 * escluse le operative (sia i duplicati sia quelle senza trigger
 * collegato per ora). */
export const SCENE_CAPITOLI: CampaignScene[] = data.scenes.filter((s) => s.chapter !== "OPERATIVE");

const NUMERO_CAPITOLO: Record<string, number> = { "CAP-1": 1, "CAP-2": 2, "CAP-3": 3, "CAP-4": 4, "CAP-5": 5 };

export function numeroCapitoloAttuale(capitoloCorrente: CapitoloId | null): number {
  if (!capitoloCorrente) return 0;
  return NUMERO_CAPITOLO[capitoloCorrente] ?? 0;
}

export function numeroCapitoloScena(scena: CampaignScene): number {
  return Number(scena.chapter.replace("C", ""));
}

/** La prossima scena di sceneggiatura da mostrare: la prima non ancora
 * vista il cui capitolo e' gia' stato raggiunto nella campagna esistente
 * (stesso principio lineare di `sceneAttiva` in
 * `src/simulation/narrative.ts`, ma qui puramente read-only/decorativo:
 * non blocca nulla se non si sblocca mai). */
export function prossimaScenaSceneggiatura(capitoloCorrente: CapitoloId | null, viste: ReadonlySet<string>): CampaignScene | null {
  const numeroAttuale = numeroCapitoloAttuale(capitoloCorrente);
  for (const scena of SCENE_CAPITOLI) {
    if (viste.has(scena.id)) continue;
    if (numeroCapitoloScena(scena) > numeroAttuale) return null;
    return scena;
  }
  return null;
}
