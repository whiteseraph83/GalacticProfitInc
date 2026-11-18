import type { RawResourceType } from "./types";

export const RISORSE_GREZZE: RawResourceType[] = ["ferro", "cristalliSilicio", "titanioStellare", "iridioQuantico", "materiaEsotica"];

// Civilta' locali alla regione (B9, CONFERMATO: "relazioni locali alla
// regione... nessun punteggio reputazione galattica obbligatorio").
// Nessun valore numerico specificato dal documento: stime ragionevoli, vedi
// docs/balance.json.
export const CIVILTA = {
  numeroMin: 1,
  numeroMax: 3,
  raggioMin: 50,
  raggioMax: 90,
  relazioneIniziale: 30,
  relazioneMax: 100,
  relazioneMin: 0,
  /** Sopra questa soglia di relazione, commerciare con la civilta' da' un
   * bonus di prezzo rispetto al mercato generico (B9: "bonus commerciali"). */
  sogliaBonusCommerciale: 60,
  bonusCommercialeMassimo: 0.15, // +15% sul prezzo di vendita alla relazione massima
  donoCostoMinimo: 50,
  donoRelazionePerCrediti: 0.05, // 1 punto relazione ogni 20 Cr donati
  richiestaQuantitaMin: 15,
  richiestaQuantitaMax: 40,
  richiestaRicompensaRelazione: 15,
  richiestaRicompensaCreditiPerUnita: 8,
} as const;
