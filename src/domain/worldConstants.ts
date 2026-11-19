// Parametri di generazione mondo (B4). Valori ragionevoli scelti come
// default testabile: non sono bilanciamento definitivo (docs/balance.json).
//
// pianetiMin/Max ridotti da 50-100 a 18-32 (richiesta utente dopo playtest:
// "i pianeti sono troppi"). L'estensione della regione e il raggio dell'area
// sicura sono stati riproporzionati di conseguenza (non solo diradati sulla
// stessa mappa enorme, altrimenti l'esplorazione diventa dispersiva), cosi'
// come il numero di sistemi stellari/cluster riconoscibili.
export const WORLD = {
  pianetiMin: 18,
  pianetiMax: 32,
  estensioneRegioneMeta: 1400, // meta' lato della regione quadrata, in unita' mondo
  areaSicuraRaggio: 300,
  // Ridotti da 4-6 a 3-4 e allontanati dal centro (richiesta utente: "appena
  // il gioco parte ci sono davvero tanti pianeti subito vicini alla nave
  // madre"): meno corpi nell'area sicura, e piazzati piu' lontano dal punto
  // di partenza invece che subito a ridosso della nave.
  areaSicuraPianetiMin: 3,
  areaSicuraPianetiMax: 4,
  visibilitaRaggio: 300, // raggio di scoperta attorno alla nave madre
  // Aumentato da 24 a 48 (richiesta utente: "i pianeti devono essere molto
  // piu' lontani tra loro"): piu' respiro tra un corpo e l'altro ovunque
  // sulla mappa, non solo nell'area sicura iniziale.
  separazioneMinimaPadding: 48,
  sistemiStellariMin: 3,
  sistemiStellariMax: 5,
  sistemaPianetiMin: 3,
  sistemaPianetiMax: 6,
  sistemaRaggioCluster: 220,
  probabilitaAppartenenzaCluster: 0.55,
  relittiMin: 3,
  relittiMax: 6,
  relittiRaggioMin: 18,
  relittiRaggioMax: 38,
  tentativiPosizionamento: 24,
} as const;
