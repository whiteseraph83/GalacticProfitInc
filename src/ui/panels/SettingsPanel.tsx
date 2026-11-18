import { CommandsPanel } from "./CommandsPanel";
import { AudioSettingsPanel } from "./AudioSettingsPanel";
import { SavePanel } from "./SavePanel";

export interface SettingsPanelProps {
  /** Chiamato dopo "Ricomincia da zero" (richiesta utente: l'overlay
   * Impostazioni deve chiudersi da solo invece di restare aperto sulla
   * nuova partita appena creata). */
  onNuovaPartita?: () => void;
}

/** Impostazioni: raggruppa Comandi, Audio e Salvataggio in un unico
 * pannello, raggiunto da un solo bottone dedicato (su richiesta esplicita,
 * invece di tre sezioni separate sempre visibili in barra laterale). */
export function SettingsPanel({ onNuovaPartita }: SettingsPanelProps) {
  return (
    <div aria-label="Impostazioni">
      <CommandsPanel />
      <AudioSettingsPanel />
      <SavePanel onNuovaPartita={onNuovaPartita} />
    </div>
  );
}
