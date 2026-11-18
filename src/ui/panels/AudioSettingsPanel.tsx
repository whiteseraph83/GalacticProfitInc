import { useState } from "react";
import { audioEngine } from "../../audio/audioEngine";

/** Impostazioni audio (B11: "mute/volumi separati"): muto generale piu' due
 * volumi indipendenti (musica/effetti). Preferenza del browser, non dello
 * stato di partita: persistita in localStorage dall'AudioEngine stesso. */
export function AudioSettingsPanel() {
  const [impostazioni, setImpostazioni] = useState(audioEngine.getImpostazioni());
  const [atmosferaAttiva, setAtmosferaAttiva] = useState(false);

  const alternaMuto = () => {
    const muto = !impostazioni.muto;
    audioEngine.impostaMuto(muto);
    setImpostazioni(audioEngine.getImpostazioni());
  };

  const cambiaVolume = (canale: "musica" | "effetti", valore: number) => {
    audioEngine.impostaVolume(canale, valore);
    setImpostazioni(audioEngine.getImpostazioni());
  };

  const alternaAtmosfera = () => {
    if (atmosferaAttiva) {
      audioEngine.fermaAtmosfera();
    } else {
      audioEngine.avviaAtmosfera(); // richiede un gesto utente: questo click lo e'
    }
    setAtmosferaAttiva(!atmosferaAttiva);
  };

  return (
    <section aria-label="Audio">
      <h2>Audio</h2>
      <button type="button" className="btn btn-small" onClick={alternaMuto}>
        {impostazioni.muto ? "Riattiva audio" : "Muto"}
      </button>
      <button type="button" className="btn btn-small" onClick={alternaAtmosfera}>
        {atmosferaAttiva ? "Ferma atmosfera" : "Avvia atmosfera"}
      </button>
      <label className="management-panel__note">
        Musica
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={impostazioni.volumeMusica}
          onChange={(e) => cambiaVolume("musica", Number(e.target.value))}
          aria-label="Volume musica"
        />
      </label>
      <label className="management-panel__note">
        Effetti
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={impostazioni.volumeEffetti}
          onChange={(e) => cambiaVolume("effetti", Number(e.target.value))}
          aria-label="Volume effetti"
        />
      </label>
    </section>
  );
}
