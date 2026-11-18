import type { EntityId, ResourceType, Vector2 } from "../domain/types";

/** Bersaglio di una carta: solo i campi pertinenti al codice carta vengono
 * letti dalla validazione/applicazione (vedi src/simulation/cardEffects.ts). */
export interface BersaglioCarta {
  planetId?: EntityId;
  punto?: Vector2;
  relittoId?: EntityId;
  tecnologiaId?: string;
  civiltaId?: EntityId;
}

// Comandi validi riconosciuti dal motore in questo macrostep. L'UI non puo'
// mutare lo stato se non attraverso questi comandi tipizzati.
export type GameCommand =
  | { id: EntityId; type: "ui/togglePause" }
  | { id: EntityId; type: "ui/moveMothership"; payload: { destinazione: Vector2 } }
  | { id: EntityId; type: "ui/selectPlanet"; payload: { planetId: EntityId | null } }
  | { id: EntityId; type: "ui/soccorsoCarburante" }
  | { id: EntityId; type: "ui/giocaCarta"; payload: { cardInstanceId: EntityId; bersaglio: BersaglioCarta } }
  | { id: EntityId; type: "ui/accodaRaffinazione"; payload: { ricettaId: string } }
  | { id: EntityId; type: "ui/vendiRisorsa"; payload: { risorsa: ResourceType; quantita: number } }
  | { id: EntityId; type: "ui/acquistaRisorsa"; payload: { risorsa: ResourceType; quantita: number } }
  | { id: EntityId; type: "ui/pagaQuotaRevisione" }
  | { id: EntityId; type: "ui/accettaMissione"; payload: { missioneId: string } }
  | { id: EntityId; type: "ui/abbandonaMissione"; payload: { missioneId: string } }
  | { id: EntityId; type: "ui/acquistaCartaMercato"; payload: { slotId: string } }
  | { id: EntityId; type: "ui/acquistaNaveMineraria" }
  | { id: EntityId; type: "ui/craftModulo"; payload: { moduloId: string } }
  | { id: EntityId; type: "ui/equipaggiaModulo"; payload: { moduloInstanceId: string; naveMinerariaId: EntityId } }
  | { id: EntityId; type: "ui/rimuoviModulo"; payload: { moduloInstanceId: string } }
  | { id: EntityId; type: "ui/commerciaConCivilta"; payload: { civiltaId: EntityId; risorsa: ResourceType; quantita: number } }
  | { id: EntityId; type: "ui/inviaDonoCivilta"; payload: { civiltaId: EntityId; crediti: number } }
  | { id: EntityId; type: "ui/sceltaEvento"; payload: { eventoId: EntityId; scelteId: string } }
  | { id: EntityId; type: "ui/ignoraEvento"; payload: { eventoId: EntityId } }
  | { id: EntityId; type: "ui/sceltaNarrativa"; payload: { sceneId: string; scelteId: string } }
  | { id: EntityId; type: "ui/avviaRicerca"; payload: { tecnologiaId: string } }
  | { id: EntityId; type: "demo/confirmableAction"; payload: Record<string, never> };

export type GameCommandType = GameCommand["type"];

export interface CommandValidationResult {
  ok: boolean;
  motivo?: string;
}
