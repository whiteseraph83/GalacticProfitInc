// Pericoli regionali (B9, CONFERMATO: "tempeste, gravita'/radiazioni,
// rischi con avvisi proporzionati"). Effetto continuo finche' la nave
// madre resta nella zona, proporzionale a `intensita'` (0..1); nessun
// valore e' specificato dal documento, vedi docs/balance.json.
export const PERICOLI = {
  numeroMin: 2,
  numeroMax: 4,
  raggioMin: 70,
  raggioMax: 140,
  intensitaMin: 0.3,
  intensitaMax: 1,
  /** Tempesta: consumo di carburante extra (indipendente dal movimento)
   * mentre la nave madre e' all'interno, fino a questo valore (carburante
   * al minuto) a intensita' massima. */
  tempestaConsumoExtraAlMinutoMax: 3,
  /** Campo gravitazionale: riduce la velocita' massima della nave madre
   * mentre e' all'interno (fino a -50% a intensita' massima). */
  gravitaRiduzioneVelocitaMax: 0.5,
  /** Radiazioni: erodono la fiducia (rischio per l'equipaggio) ogni minuto
   * trascorso all'interno, fino a 3 punti/min a intensita' massima. */
  radiazioniFiduciaPerMinutoMax: 3,
} as const;
