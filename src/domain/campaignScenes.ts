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

  // Filone mistero (C2_S03/C2_S04, C3): legato a fatti di gioco reali gia'
  // osservabili, senza introdurre un vero registro indizi/investigazione
  // (sarebbe una meccanica nuova, fuori scope qui — vedi docs/TODO.md).
  // Le scene senza una condizione forte e distinguibile (C3_S03, C3_S05,
  // C3_S07, C3_S08: frammento di memoria, rapporto, soglia di prove,
  // indizio segreto) restano gated solo sul capitolo, come prima: non
  // esiste ancora un fatto di stato equivalente a "quante prove ho
  // raccolto" senza costruire quella meccanica.
  //
  // trigger: "first_contact_xylo" — Xylo Venn e' un'esploratrice
  // indipendente: il primo pianeta rilevato da Radar (sempre visibile
  // anche fuori raggio sensori) e' il punto di contatto piu' vicino a
  // questo tema gia' presente nel gioco.
  C2_S03: (stato) => stato.pianeti.some((p) => p.sempreVisibile),
  // trigger: "first_industrial_wreck_investigated"
  C2_S04: (stato) => stato.campiRelitti.some((w) => w.tipo === "relitto" && w.recuperato),
  // trigger: "investigate: anomaly_repeating_signal" — stesso segnale
  // "pericolo scoperto" gia' usato da src/simulation/narrative.ts per un
  // tema identico (anomalia regionale).
  C3_S01: (stato) => stato.pericoli.some((p) => p.scoperto),
  // trigger: "investigation: decoded_D17" — richiede sia il relitto
  // industriale di C2_S04 sia un pianeta anomalo investigato: la
  // "decodifica" e' la somma di questi due indizi distinti.
  C3_S02: (stato) =>
    stato.campiRelitti.some((w) => w.tipo === "relitto" && w.recuperato) &&
    stato.pianeti.some((p) => p.archetipo === "anomalo" && p.investigato),
  // trigger: "merchant_clue_available" — Barthol Krix ha commerciato con
  // qualcuno ormai scomparso dai registri: il primo contatto commerciale
  // con una civilta' locale e' il fatto di gioco piu' vicino a questo.
  C3_S04: (stato) => stato.civilta.some((c) => c.scoperta),
  // trigger: "investigation: abandoned_station_access" — una stazione
  // silenziosa in una regione piu' lontana: il secondo salto iperspaziale
  // (prima regione gia' lasciata) e' il proxy piu' vicino disponibile.
  C3_S06: (stato) => stato.numeroRegione >= 2,

  // Scelte morali/reputazione (C4, parte di C5): queste scene restano
  // puramente narrative/affiancate come tutte le altre 41 — non mutano
  // `campagna.allineamento` ne' alcun'altra regola di gioco (lo stesso
  // vincolo gia' documentato in testa a questo file: `narrative.ts` resta
  // l'unica fonte di verita' per capitoli/finali). Qui solo il *trigger di
  // comparsa* e' legato a un fatto reale, dove ne esiste uno credibile.
  //
  // trigger: "local_civilization: request_mining_rights" — non esiste
  // ancora un concetto di "autorizzazione mineraria", ma la richiesta
  // commerciale di una civilta' locale (gia' implementata) e' il fatto di
  // gioco piu' vicino a questo tema.
  C4_S02: (stato) => stato.civilta.some((c) => c.richiestaAttiva !== null),
  // trigger: "dex: hidden_technical_solution" — una seconda ricerca
  // completata (la prima ha gia' sbloccato C2_S01), per distinguere
  // "un'idea in piu'" da "la prima idea in assoluto".
  C4_S04: (stato) => stato.ricerca.completate.length >= 2,
  // trigger: "corporate_trust: milestone" — non esiste una "fiducia
  // aziendale" distinta: riusa la stessa soglia alta gia' scelta per il
  // rilevatore NPC `trust.high` (src/ui/hooks/useNpcChatter.ts).
  C4_S05: (stato) => stato.review.fiducia >= 80,
  // Le restanti scene di C4 (C4_S01 "chapter_4.start", C4_S03 offerta
  // aziendale, C4_S06 decisione sulle prove, C4_S07 direttiva di B.O.B.,
  // C4_S08 chiusura capitolo) e C5_S01-S05 (incluse le tre varianti
  // finale `ending_choice: *_option_unlocked`, fra loro mutuamente
  // esclusive — legarle al finale gia' deciso bloccherebbe per sempre le
  // altre due con l'algoritmo lineare attuale) restano gated solo sul
  // capitolo: nessun fatto di gioco equivalente esiste ancora (offerte
  // aziendali, prove, autonomia di B.O.B.) — vedi docs/TODO.md.
  //
  // trigger: "ending: post_credit" / "optional: secret_clues_complete AND
  // final_resolved" — qui invece un pezzo reale esiste: il finale
  // (`campagna.finaleOttenuto`, deciso da `src/simulation/narrative.ts`,
  // non da questa sceneggiatura) deve essere gia' assegnato prima
  // dell'epilogo e del possibile epilogo segreto.
  C5_S08: (stato) => stato.campagna.finaleOttenuto !== null,
  C5_S09: (stato) => stato.campagna.finaleOttenuto !== null,
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
    // C5_S07 e' gestita solo dal controllo esplicito sopra: la sua
    // condizione (gameOver) non deve mai bloccare la sequenza principale
    // per una carriera che non va mai in liquidazione, altrimenti
    // l'epilogo (C5_S08/C5_S09) non comparirebbe piu' per nessuno.
    if (scena.id === "C5_S07") continue;
    if (viste.has(scena.id)) continue;
    if (numeroCapitoloScena(scena) > numeroAttuale) return null;
    const condizione = CONDIZIONE_SCENA[scena.id];
    if (condizione && !condizione(stato)) return null;
    return scena;
  }
  return null;
}
