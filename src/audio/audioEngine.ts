// Audio (B11, Macrostep 11): "atmosfera, feedback UI, mute/volumi
// separati". Sintetizzato via Web Audio API (nessun asset audio fornito
// dall'utente: coerente col principio A1 sui placeholder chiaramente
// segnalati, qui applicato all'audio invece che alla grafica). Le
// impostazioni (muto, volumi) sono una preferenza del dispositivo/browser,
// non uno stato di partita: vivono in localStorage, mai in GameState/
// IndexedDB (separazione gia' stabilita per la UI, es. TutorialPanel).
// Il motore di simulazione (`src/simulation`) non importa mai questo
// modulo: l'audio e' sempre un effetto collaterale innescato dalla UI.

export interface ImpostazioniAudio {
  muto: boolean;
  volumeMusica: number; // 0..1
  volumeEffetti: number; // 0..1
}

export const IMPOSTAZIONI_AUDIO_DEFAULT: ImpostazioniAudio = { muto: false, volumeMusica: 0.35, volumeEffetti: 0.5 };

const CHIAVE_LOCALSTORAGE = "galactic-profit-inc:audio";

export function clamp01(valore: number): number {
  if (!Number.isFinite(valore)) return 0;
  return Math.max(0, Math.min(1, valore));
}

export function leggiImpostazioniAudio(): ImpostazioniAudio {
  try {
    const raw = localStorage.getItem(CHIAVE_LOCALSTORAGE);
    if (!raw) return { ...IMPOSTAZIONI_AUDIO_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<ImpostazioniAudio>;
    return {
      muto: parsed.muto === true,
      volumeMusica: clamp01(parsed.volumeMusica ?? IMPOSTAZIONI_AUDIO_DEFAULT.volumeMusica),
      volumeEffetti: clamp01(parsed.volumeEffetti ?? IMPOSTAZIONI_AUDIO_DEFAULT.volumeEffetti),
    };
  } catch {
    return { ...IMPOSTAZIONI_AUDIO_DEFAULT };
  }
}

export function scriviImpostazioniAudio(impostazioni: ImpostazioniAudio): void {
  try {
    localStorage.setItem(CHIAVE_LOCALSTORAGE, JSON.stringify(impostazioni));
  } catch {
    // Scrittura best-effort: storage pieno/negato non deve interrompere il gioco.
  }
}

export type TipoEffetto =
  | "click"
  | "conferma"
  | "notificaInfo"
  | "notificaAttenzione"
  | "notificaCritica"
  | "cartaOperazioni"
  | "cartaIndustria"
  | "cartaRicerca"
  | "cartaLogistica";

const PARAMETRI_EFFETTO: Record<TipoEffetto, { frequenza: number; durataSec: number; tipo: OscillatorType; frequenzaFinale?: number }> = {
  click: { frequenza: 420, durataSec: 0.05, tipo: "sine" },
  conferma: { frequenza: 660, durataSec: 0.12, tipo: "sine" },
  notificaInfo: { frequenza: 520, durataSec: 0.08, tipo: "triangle" },
  notificaAttenzione: { frequenza: 340, durataSec: 0.15, tipo: "sawtooth" },
  notificaCritica: { frequenza: 220, durataSec: 0.25, tipo: "square" },
  // Un suono per categoria di carta (B11, richiesta utente: "ad ogni azione
  // di carte crea un sound appropriato"), distinto dai toni UI generici
  // sopra: ogni categoria ha un timbro/pendenza di frequenza riconoscibile.
  cartaOperazioni: { frequenza: 480, frequenzaFinale: 760, durataSec: 0.14, tipo: "sine" },
  cartaIndustria: { frequenza: 180, frequenzaFinale: 140, durataSec: 0.18, tipo: "square" },
  cartaRicerca: { frequenza: 700, frequenzaFinale: 1100, durataSec: 0.2, tipo: "triangle" },
  cartaLogistica: { frequenza: 330, frequenzaFinale: 500, durataSec: 0.15, tipo: "sawtooth" },
};

/** Motore audio minimale: un drone atmosferico continuo (bassissimo
 * volume) piu' brevi toni sintetizzati per il feedback UI. Degradazione
 * identica al resto del progetto (IndexedDB, A1): se l'API non esiste o il
 * contesto non puo' avviarsi, ogni chiamata diventa un no-op silenzioso. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private impostazioni: ImpostazioniAudio;

  constructor() {
    this.impostazioni = leggiImpostazioniAudio();
  }

  getImpostazioni(): ImpostazioniAudio {
    return this.impostazioni;
  }

  private assicuraContesto(): AudioContext | null {
    const Costruttore = typeof AudioContext !== "undefined" ? AudioContext : undefined;
    if (!Costruttore) return null;
    if (this.ctx) return this.ctx;

    this.ctx = new Costruttore();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.applicaVolumi();
    return this.ctx;
  }

  private applicaVolumi(): void {
    if (!this.musicGain || !this.sfxGain) return;
    const fattoreMuto = this.impostazioni.muto ? 0 : 1;
    this.musicGain.gain.value = this.impostazioni.volumeMusica * fattoreMuto;
    this.sfxGain.gain.value = this.impostazioni.volumeEffetti * fattoreMuto;
  }

  impostaMuto(muto: boolean): void {
    this.impostazioni = { ...this.impostazioni, muto };
    scriviImpostazioniAudio(this.impostazioni);
    this.applicaVolumi();
  }

  impostaVolume(canale: "musica" | "effetti", valore: number): void {
    const campo = canale === "musica" ? "volumeMusica" : "volumeEffetti";
    this.impostazioni = { ...this.impostazioni, [campo]: clamp01(valore) };
    scriviImpostazioniAudio(this.impostazioni);
    this.applicaVolumi();
  }

  /** Richiede un gesto utente per avviarsi (politica autoplay dei
   * browser): va chiamato da un handler di click, non al mount. */
  avviaAtmosfera(): void {
    const ctx = this.assicuraContesto();
    if (!ctx || !this.musicGain || this.droneOsc) return;
    if (ctx.state === "suspended") void ctx.resume();

    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55; // nota bassa, atmosfera non invasiva
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.6;
    drone.connect(droneGain);
    droneGain.connect(this.musicGain);
    drone.start();
    this.droneOsc = drone;
  }

  fermaAtmosfera(): void {
    this.droneOsc?.stop();
    this.droneOsc = null;
  }

  suonaEffetto(tipo: TipoEffetto): void {
    const ctx = this.assicuraContesto();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === "suspended") void ctx.resume();

    const { frequenza, frequenzaFinale, durataSec, tipo: formaOnda } = PARAMETRI_EFFETTO[tipo];
    const osc = ctx.createOscillator();
    osc.type = formaOnda;
    const ora = ctx.currentTime;
    osc.frequency.setValueAtTime(frequenza, ora);
    if (frequenzaFinale !== undefined) osc.frequency.exponentialRampToValueAtTime(frequenzaFinale, ora + durataSec);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ora);
    gain.gain.exponentialRampToValueAtTime(0.0001, ora + durataSec);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ora);
    osc.stop(ora + durataSec);
  }
}

export const audioEngine = new AudioEngine();
