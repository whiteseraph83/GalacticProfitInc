import avatarBob from "../assets/reference/characters/avatar_bob_ref.webp";
import avatarRagZarg from "../assets/reference/characters/avatar_ragzarg_ref.webp";
import avatarDirezione from "../assets/reference/characters/avatar_direzione_ref.webp";
import avatarMeccanico from "../assets/reference/characters/avatar_meccanico_ref.webp";
import avatarAlieno from "../assets/reference/characters/avatar_alieno_ref.webp";
import avatarCapitano from "../assets/reference/characters/avatar_capitano_anziano_ref.webp";
import type { MittenteNarrativo } from "../domain/types";

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
