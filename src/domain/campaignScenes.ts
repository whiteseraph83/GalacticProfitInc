import scenesData from "../assets/reference/campagna/Galactic_Profit_Inc_Scene_Capitoli.json";
import type { CapitoloId, GameState } from "./types";

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
  // null = il motore non ha ancora registrato il capitolo corrente (accade
  // per un istante al primo render, prima del primo tick di
  // `integraCampagna`): una nuova carriera e' concettualmente gia' al
  // capitolo 1 fin da subito, quindi si considera CAP-1 raggiunto anche in
  // questo caso transitorio invece di bloccare la primissima scena.
  if (!capitoloCorrente) return 1;
  return NUMERO_CAPITOLO[capitoloCorrente] ?? 0;
}

export function numeroCapitoloScena(scena: CampaignScene): number {
  return Number(scena.chapter.replace("C", ""));
}

/** Condizioni di sblocco reali (richiesta utente: "alcuni dialoghi devono
 * innescarsi solo ad un evento specifico", non alla sola sequenza di
 * capitolo) per le scene di sceneggiatura il cui `trigger` testuale nel
 * JSON corrisponde a un segnale di stato gia' osservabile nel gioco.
 * Scena assente da questa mappa = nessuna condizione extra oltre al
 * capitolo raggiunto (comportamento di prima: riguarda soprattutto le
 * scene la cui meccanica sottostante non esiste ancora — mercato
 * speciale, indizi di mistero, scelte morali — vedi docs/TODO.md). */
const CONDIZIONE_SCENA: Record<string, (stato: GameState) => boolean> = {
  // trigger: "tutorial.first_investigation"
  C1_S03: (stato) => stato.pianeti.some((p) => p.investigato),
  // trigger: "tutorial.first_contract_started"
  C1_S04: (stato) => stato.contrattiMinerari.length > 0,
  // trigger: "tutorial.first_sale"
  C1_S05: (stato) => stato.contabilita.venditeTotali > 0,
  // trigger: "first_factory_built"
  C1_S06: (stato) => stato.fabbrica.costruita,
  // trigger: "first_review.cards_remaining == 3"
  C1_S07: (stato) =>
    stato.review.numeroRevisioniPagate === 0 &&
    stato.review.statoRevisione === "nessuna" &&
    stato.review.sogliaCarteProssimaRevisione - stato.review.carteGiocateDallUltimaRevisione <= 3,
  // trigger: "first_review.ready"
  C1_S08: (stato) => stato.review.numeroRevisioniPagate === 0 && stato.review.statoRevisione !== "nessuna",
  // trigger: "research.first_upgrade_complete"
  C2_S01: (stato) => stato.ricerca.completate.length > 0,
  // trigger: "first_hyperspace_jump_completed"
  C2_S06: (stato) => stato.numeroRegione > 1,
  // trigger: "first_special_market_event" (EVT-COM-01, "L'offerta del
  // signor Krix": vedi src/domain/events.ts / src/simulation/events.ts)
  C2_S02: (stato) => stato.campagna.eventiMercatoSpeciali.includes("EVT-COM-01"),
  // trigger: "special_demand_with_deleted_identity" (EVT-COM-02, "Il
  // cliente cancellato")
  C2_S07: (stato) => stato.campagna.eventiMercatoSpeciali.includes("EVT-COM-02"),
  // trigger: "career: insolvency_game_over" — mostrata in anticipo dal
  // controllo esplicito qui sotto quando serve; questa condizione evita
  // comunque che compaia "in sequenza" per chi raggiunge il capitolo 5
  // senza essere mai andato in liquidazione.
  C5_S07: (stato) => stato.gameOver !== null,
};

/** La prossima scena di sceneggiatura da mostrare: fra quelle del
 * capitolo gia' raggiunto (ordine lineare, stesso principio di
 * `sceneAttiva` in `src/simulation/narrative.ts`), la prima non ancora
 * vista la cui condizione di sblocco (se definita in `CONDIZIONE_SCENA`)
 * e' gia' soddisfatta. Le scene senza condizione nota restano gate solo
 * sul capitolo, come prima (puramente read-only/decorativo: non blocca
 * nulla se non si sblocca mai).
 *
 * Eccezione: C5_S07 ("Liquidazione") e' per design accessibile da
 * qualsiasi capitolo, non solo dal 5 (gate esplicito nel documento di
 * sceneggiatura), quindi va controllata a parte, con priorita' assoluta
 * appena `gameOver` e' impostato. */
export function prossimaScenaSceneggiatura(stato: GameState, viste: ReadonlySet<string>): CampaignScene | null {
  if (stato.gameOver && !viste.has("C5_S07")) {
    const liquidazione = SCENE_CAPITOLI.find((s) => s.id === "C5_S07");
    if (liquidazione) return liquidazione;
  }

  const numeroAttuale = numeroCapitoloAttuale(stato.campagna.capitoloCorrente);
  for (const scena of SCENE_CAPITOLI) {
    if (viste.has(scena.id)) continue;
    if (numeroCapitoloScena(scena) > numeroAttuale) return null;
    const condizione = CONDIZIONE_SCENA[scena.id];
    if (condizione && !condizione(stato)) return null;
    return scena;
  }
  return null;
}
