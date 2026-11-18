import { BALANCE } from "../domain/initialState";
import { NAVE_MINERARIA_COSTO } from "../domain/modules";
import type { GameState, MiningShipEntity } from "../domain/types";
import type { CommandValidationResult } from "./commands";
import { registraSpesa } from "./economy";

// Acquisto di navi minerarie aggiuntive (B2, Macrostep 7): "1.000 Cr +
// materiali raffinati", azione libera senza carta (B2: "acquisto nave...
// non richiedono carte"), quindi nessun ConfirmModal obbligatorio per
// regola, ma il pannello Flotta ne mostra comunque uno visto l'importo
// significativo e irreversibile (stesso trattamento della coda di
// raffinazione in FabbricaPanel, gia' "libera" ma confermata).

export function validaAcquistaNaveMineraria(stato: GameState): CommandValidationResult {
  if (stato.crediti < NAVE_MINERARIA_COSTO.crediti) {
    return { ok: false, motivo: "crediti insufficienti" };
  }
  if ((stato.mothership.stivaCarico.ferroRaffinato ?? 0) < NAVE_MINERARIA_COSTO.ferroRaffinato) {
    return { ok: false, motivo: "ferro raffinato insufficiente in stiva" };
  }
  return { ok: true };
}

let autoShipCounter = 0;
function nextShipId(): string {
  autoShipCounter += 1;
  return `miningship-acquisto-${autoShipCounter}`;
}

export function applicaAcquistaNaveMineraria(stato: GameState): GameState {
  const ferroRaffinatoAttuale = stato.mothership.stivaCarico.ferroRaffinato ?? 0;
  const nuovaNave: MiningShipEntity = {
    id: nextShipId(),
    contrattoAttivoId: null,
    estrazioneBaseAlMinuto: BALANCE.estrazioneBaseAlMinuto,
  };
  const nuovoStato: GameState = {
    ...stato,
    crediti: stato.crediti - NAVE_MINERARIA_COSTO.crediti,
    mothership: {
      ...stato.mothership,
      stivaCarico: { ...stato.mothership.stivaCarico, ferroRaffinato: ferroRaffinatoAttuale - NAVE_MINERARIA_COSTO.ferroRaffinato },
    },
    naviMinerarie: [...stato.naviMinerarie, nuovaNave],
  };
  return registraSpesa(nuovoStato, NAVE_MINERARIA_COSTO.crediti);
}
