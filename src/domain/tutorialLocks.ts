import type { CardCode, GameState } from "./types";

/**
 * Passi del tutorial che bloccano le altre carte (richiesta utente: "dopo
 * che B.O.B. ha detto di usare il radar si deve bloccare e permettermi di
 * farlo. Inoltre deve illuminare la carta Radar e rendermi impossibile
 * usare le altre"). Ogni passo e' legato alla scena della sceneggiatura
 * (vedi src/domain/campaignScenes.ts) che da' l'istruzione esplicita:
 * appena quella scena e' comparsa, solo `cardCode` resta utilizzabile,
 * finche' `completato` non torna vero.
 */
export interface TutorialLockStep {
  sceneId: string;
  cardCode: CardCode;
  completato: (stato: GameState) => boolean;
}

export const TUTORIAL_LOCK_STEPS: TutorialLockStep[] = [
  { sceneId: "C1_S02", cardCode: "OPS-01", completato: (s) => s.pianeti.some((p) => p.sempreVisibile) },
  {
    sceneId: "C1_S02I",
    cardCode: "OPS-02",
    completato: (s) => s.pianeti.some((p) => p.investigato || p.investigazioneCompletataAlMs !== null),
  },
  { sceneId: "C1_S03I", cardCode: "IND-01", completato: (s) => s.contrattiMinerari.length > 0 },
];

/** Il passo attivo in questo momento, se la sua scena e' gia' comparsa e
 * l'azione richiesta non e' ancora stata completata; altrimenti null
 * (nessun blocco). */
export function trovaPassoTutorialAttivo(
  stato: GameState,
  sceneVista: (id: string) => boolean,
): TutorialLockStep | null {
  for (const passo of TUTORIAL_LOCK_STEPS) {
    if (!sceneVista(passo.sceneId)) continue;
    if (!passo.completato(stato)) return passo;
  }
  return null;
}
