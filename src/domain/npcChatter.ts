import dialoghiData from "../assets/reference/dialoghi/Galactic_Profit_Inc_Dialoghi_NPC.json";

// Libreria dialoghi NPC fornita dall'utente (docs/TODO.md, "Libreria
// dialoghi NPC completa"): 172 messaggi indicizzati per `trigger` di
// stato. Qui esposta come dati puri + una funzione di selezione con
// anti-ripetizione; la decisione di QUANDO un trigger scatta vive altrove
// (`src/ui/hooks/useNpcChatter.ts`, che osserva lo stato di gioco in sola
// lettura, stessa filosofia di `src/simulation/narrative.ts`).

export interface ChatterMessage {
  id: string;
  speaker: string;
  trigger: string;
  tone: "tutorial" | "info" | "warning" | "critical" | "mystery" | "story";
  text: string;
}

export interface ChatterSceneLine {
  speaker: string;
  text: string;
}

export interface ChatterScene {
  name: string;
  context: string;
  lines: ChatterSceneLine[];
}

interface DialoghiData {
  metadata: { language: string; total_messages: number; total_scenes: number };
  messages: ChatterMessage[];
  scenes: ChatterScene[];
}

const data = dialoghiData as DialoghiData;

export const CHATTER_MESSAGES: ChatterMessage[] = data.messages;
export const CHATTER_SCENES: ChatterScene[] = data.scenes;

const MESSAGES_BY_TRIGGER = new Map<string, ChatterMessage[]>();
for (const messaggio of CHATTER_MESSAGES) {
  const lista = MESSAGES_BY_TRIGGER.get(messaggio.trigger) ?? [];
  lista.push(messaggio);
  MESSAGES_BY_TRIGGER.set(messaggio.trigger, lista);
}

/**
 * Sceglie un messaggio per il trigger dato, evitando quelli gia' mostrati
 * (`visti`) quando esiste un'alternativa non vista per lo stesso trigger
 * (richiesta esplicita dell'utente: "indicazioni per evitare ripetizioni
 * eccessive"). null se il trigger non ha messaggi associati.
 */
export function scegliMessaggioChatter(trigger: string, visti: ReadonlySet<string>): ChatterMessage | null {
  const candidati = MESSAGES_BY_TRIGGER.get(trigger);
  if (!candidati || candidati.length === 0) return null;
  const nonVisti = candidati.filter((m) => !visti.has(m.id));
  const insieme = nonVisti.length > 0 ? nonVisti : candidati;
  return insieme[Math.floor(Math.random() * insieme.length)];
}

export function triggerConosciuti(): string[] {
  return [...MESSAGES_BY_TRIGGER.keys()];
}
