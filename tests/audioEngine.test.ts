import { beforeEach, describe, expect, it } from "vitest";
import {
  AudioEngine,
  IMPOSTAZIONI_AUDIO_DEFAULT,
  clamp01,
  leggiImpostazioniAudio,
  scriviImpostazioniAudio,
} from "../src/audio/audioEngine";

describe("clamp01", () => {
  it("riporta i valori nell'intervallo 0-1", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(5)).toBe(1);
  });

  it("valori non finiti diventano 0", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
  });
});

describe("leggiImpostazioniAudio / scriviImpostazioniAudio (localStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ritorna i valori di default se non c'e' nulla salvato", () => {
    expect(leggiImpostazioniAudio()).toEqual(IMPOSTAZIONI_AUDIO_DEFAULT);
  });

  it("round-trip: scrive e rilegge le stesse impostazioni", () => {
    scriviImpostazioniAudio({ muto: true, volumeMusica: 0.2, volumeEffetti: 0.8 });
    expect(leggiImpostazioniAudio()).toEqual({ muto: true, volumeMusica: 0.2, volumeEffetti: 0.8 });
  });

  it("un valore corrotto nello storage non lancia eccezioni: ricade sul default", () => {
    localStorage.setItem("galactic-profit-inc:audio", "{non e' json valido");
    expect(leggiImpostazioniAudio()).toEqual(IMPOSTAZIONI_AUDIO_DEFAULT);
  });

  it("i volumi letti sono sempre clampati tra 0 e 1 anche se il JSON contiene valori fuori range", () => {
    localStorage.setItem("galactic-profit-inc:audio", JSON.stringify({ muto: false, volumeMusica: 5, volumeEffetti: -2 }));
    const impostazioni = leggiImpostazioniAudio();
    expect(impostazioni.volumeMusica).toBe(1);
    expect(impostazioni.volumeEffetti).toBe(0);
  });
});

describe("AudioEngine (degradazione senza Web Audio API in jsdom)", () => {
  it("getImpostazioni() ritorna le impostazioni correnti senza lanciare eccezioni", () => {
    const motore = new AudioEngine();
    expect(motore.getImpostazioni()).toBeDefined();
  });

  it("suonaEffetto/avviaAtmosfera/fermaAtmosfera non lanciano eccezioni quando AudioContext non esiste", () => {
    const motore = new AudioEngine();
    expect(() => motore.suonaEffetto("click")).not.toThrow();
    expect(() => motore.avviaAtmosfera()).not.toThrow();
    expect(() => motore.fermaAtmosfera()).not.toThrow();
  });

  it("impostaMuto/impostaVolume aggiornano le impostazioni e persistono su localStorage", () => {
    localStorage.clear();
    const motore = new AudioEngine();
    motore.impostaMuto(true);
    expect(motore.getImpostazioni().muto).toBe(true);
    motore.impostaVolume("musica", 0.7);
    expect(motore.getImpostazioni().volumeMusica).toBe(0.7);
    expect(leggiImpostazioniAudio().muto).toBe(true);
    expect(leggiImpostazioniAudio().volumeMusica).toBe(0.7);
  });
});
