// Parametri di generazione mondo (B4). Valori ragionevoli scelti come
// default testabile: non sono bilanciamento definitivo (docs/balance.json).
export const WORLD = {
  pianetiMin: 50,
  pianetiMax: 100,
  estensioneRegioneMeta: 2200, // meta' lato della regione quadrata, in unita' mondo
  areaSicuraRaggio: 380,
  areaSicuraPianetiMin: 4,
  areaSicuraPianetiMax: 6,
  visibilitaRaggio: 380, // raggio di scoperta attorno alla nave madre
  separazioneMinimaPadding: 24, // margine minimo aggiuntivo tra i bordi di due pianeti
  sistemiStellariMin: 4,
  sistemiStellariMax: 8,
  sistemaPianetiMin: 3,
  sistemaPianetiMax: 7,
  sistemaRaggioCluster: 220,
  probabilitaAppartenenzaCluster: 0.55,
  relittiMin: 3,
  relittiMax: 6,
  relittiRaggioMin: 18,
  relittiRaggioMax: 38,
  tentativiPosizionamento: 24,
} as const;
