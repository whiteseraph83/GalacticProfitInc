import avatarBob from "../assets/reference/characters/avatar_bob_ref.webp";
import avatarRagZarg from "../assets/reference/characters/avatar_ragzarg_ref.webp";
import avatarDirezione from "../assets/reference/characters/avatar_direzione_ref.webp";
import avatarMeccanico from "../assets/reference/characters/avatar_meccanico_ref.webp";
import avatarAlieno from "../assets/reference/characters/avatar_alieno_ref.webp";
import avatarCapitano from "../assets/reference/characters/avatar_capitano_anziano_ref.webp";
import type { MittenteNarrativo } from "../domain/types";

/** Icona generica (nessuna foto fornita) per i messaggi di sistema/non
 * personaggio introdotti dalla sceneggiatura a capitoli (es.
 * "SISTEMA OMNIPROFIT™", "SISTEMA DI BORDO"): un'antenna/segnale stilizzata
 * in laser cyan, come SVG inline (nessun asset esterno). */
const avatarSistema =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2339f6ff' stroke-width='1.6'%3E%3Ccircle cx='12' cy='12' r='10.5' fill='%2305070c'/%3E%3Cpath d='M12 16v-5'/%3E%3Cpath d='M9 8a4.2 4.2 0 0 1 6 0'/%3E%3Cpath d='M6.5 5.5a8 8 0 0 1 11 0'/%3E%3Ccircle cx='12' cy='17.3' r='1.1' fill='%2339f6ff' stroke='none'/%3E%3C/svg%3E";

/**
 * Mappa personaggio -> avatar/nome visualizzato/colore accento, usata
 * dall'overlay narrativo (vedi docs/TODO.md, "Messaggi narrativi come
 * overlay in basso con avatar"). Copre sia i `mittente` storici del motore
 * (`src/domain/narrative.ts`) sia le stringhe `speaker` usate dalla
 * libreria dialoghi NPC fornita dall'utente — stesso abbinamento
 * ipotizzato/confermato nella todo list (B.O.B./Rag. Zarg quasi certi;
 * Direzione = Direttore Magnus Voss; meccanico = Dex Calder; alieno = Xylo
 * Venn; capitano anziano = Barthol Krix).
 */
export interface PersonaggioNarrativo {
  nomeVisualizzato: string;
  avatar: string;
  colore: string;
}

export const PERSONAGGI: Record<string, PersonaggioNarrativo> = {
  "B.O.B.": { nomeVisualizzato: "B.O.B.", avatar: avatarBob, colore: "var(--accent)" },
  "Rag. Zarg": { nomeVisualizzato: "Rag. Zarg", avatar: avatarRagZarg, colore: "var(--warning)" },
  "Direttore Magnus Voss": { nomeVisualizzato: "Direttore Magnus Voss", avatar: avatarDirezione, colore: "var(--critical)" },
  "Dex Calder": { nomeVisualizzato: "Dex Calder", avatar: avatarMeccanico, colore: "var(--laser-magenta)" },
  "Xylo Venn": { nomeVisualizzato: "Xylo Venn", avatar: avatarAlieno, colore: "var(--laser-violet)" },
  "Barthol Krix": { nomeVisualizzato: "Barthol Krix", avatar: avatarCapitano, colore: "#ffd23d" },
  "SISTEMA OMNIPROFIT™": { nomeVisualizzato: "SISTEMA OMNIPROFIT™", avatar: avatarSistema, colore: "var(--accent)" },
  "SISTEMA DI BORDO": { nomeVisualizzato: "SISTEMA DI BORDO", avatar: avatarSistema, colore: "var(--accent)" },
};

/** Alias per i `mittente` storici del motore (`src/domain/narrative.ts`),
 * che usano identificatori senza spazi/accenti invece del nome "speaker"
 * della libreria dialoghi NPC. */
const ALIAS_MITTENTE: Record<MittenteNarrativo, string> = {
  BOB: "B.O.B.",
  RagZarg: "Rag. Zarg",
  Direzione: "Direttore Magnus Voss",
};

export function personaggioPer(mittenteOSpeaker: string): PersonaggioNarrativo {
  const chiave = ALIAS_MITTENTE[mittenteOSpeaker as MittenteNarrativo] ?? mittenteOSpeaker;
  return PERSONAGGI[chiave] ?? { nomeVisualizzato: mittenteOSpeaker, avatar: avatarBob, colore: "var(--accent)" };
}
