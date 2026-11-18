import type { CapitoloId, FinaleDefinition, SceneNarrativaDefinition } from "./types";

// Campagna narrativa a 5 capitoli (B7, CONFERMATO nei titoli; B10,
// Macrostep 10): "missioni narrative principali incardinate su scoperte,
// economia e decisioni". Contenuti interamente data-driven: ogni scena si
// sblocca osservando (in sola lettura) lo stato di gioco gia' esistente,
// senza introdurre nuove regole nel motore di simulazione. Testi in
// italiano, struttura pronta per una futura localizzazione (A1: "testi di
// interfaccia... in italiano", qui separati dal codice per costruzione).

export const CAPITOLI: Record<CapitoloId, string> = {
  "CAP-1": "Benvenuto nella famiglia OmniProfit™",
  "CAP-2": "Espansione non autorizzata",
  "CAP-3": "Il dipartimento delle anomalie",
  "CAP-4": "Il costo del successo",
  "CAP-5": "Il profitto è eterno",
};

export const SCENE_NARRATIVE: Record<string, SceneNarrativaDefinition> = {
  "N1-1": {
    id: "N1-1",
    capitolo: "CAP-1",
    mittente: "BOB",
    titolo: "Messaggio di benvenuto",
    testo:
      "Benvenuto/a in OmniProfit Galactic Corporation™! Sono B.O.B., il tuo assistente di bordo. Il mio compito è aiutarti, ottimizzarti e, quando necessario, ricordarti gentilmente delle scadenze contrattuali. Buona fortuna, dipendente.",
    condizione: { tipo: "semprePrimo" },
    scelte: null,
  },
  "N1-2": {
    id: "N1-2",
    capitolo: "CAP-1",
    mittente: "RagZarg",
    titolo: "Il manuale del dipendente",
    testo:
      "Rag. Zarg, contabilità regionale: \"Complimenti per la prima missione completata. Ricorda: ogni carta giocata ti avvicina alla prossima revisione contabile. Non è una minaccia, è una proiezione statistica.\"",
    condizione: { tipo: "missioniCompletate", minimo: 1 },
    scelte: null,
  },
  "N1-3": {
    id: "N1-3",
    capitolo: "CAP-1",
    mittente: "Direzione",
    titolo: "Il tuo primo rapporto",
    testo: "La Direzione richiede un breve rapporto di presentazione. Come ti descrivi ai colleghi?",
    condizione: { tipo: "sceneCompletate", id: ["N1-1", "N1-2"] },
    scelte: [
      { id: "fedele", testo: "\"Un dipendente modello, fedele alla missione aziendale.\"", effetti: [{ tipo: "allineamento", asse: "lealta", valore: 2 }] },
      { id: "indipendente", testo: "\"Qualcuno che sa badare a se stesso, azienda o no.\"", effetti: [{ tipo: "allineamento", asse: "indipendenza", valore: 2 }] },
    ],
  },
  "N2-1": {
    id: "N2-1",
    capitolo: "CAP-2",
    mittente: "BOB",
    titolo: "Acquisizioni poco ortodosse",
    testo:
      "B.O.B.: \"Ho notato un incremento della tua capacità operativa oltre i parametri previsti per il tuo livello contrattuale. La Direzione potrebbe non aver autorizzato questa espansione.\"",
    condizione: { tipo: "sceneCompletate", id: ["N1-3"] },
    scelte: null,
  },
  "N2-2": {
    id: "N2-2",
    capitolo: "CAP-2",
    mittente: "RagZarg",
    titolo: "Zarg chiede spiegazioni",
    testo: "Rag. Zarg: \"I registri non tornano. Come giustifichi questa crescita non pianificata?\"",
    condizione: { tipo: "sceneCompletate", id: ["N2-1"] },
    scelte: [
      { id: "copri", testo: "Giustifica tutto come \"ottimizzazione da manuale\".", effetti: [{ tipo: "allineamento", asse: "lealta", valore: 2 }] },
      { id: "rivendica", testo: "Rivendica l'iniziativa personale, regole o no.", effetti: [{ tipo: "allineamento", asse: "indipendenza", valore: 3 }] },
    ],
  },
  "N2-3": {
    id: "N2-3",
    capitolo: "CAP-2",
    mittente: "Direzione",
    titolo: "La direzione osserva",
    testo: "Un messaggio laconico dalla Direzione: \"Prendiamo nota. Continua così. Qualunque cosa 'così' significhi.\"",
    condizione: { tipo: "sceneCompletate", id: ["N2-2"] },
    scelte: null,
  },
  "N3-1": {
    id: "N3-1",
    capitolo: "CAP-3",
    mittente: "BOB",
    titolo: "Un dipartimento che non dovrebbe esistere",
    testo:
      "B.O.B., a voce più bassa del solito: \"Ho trovato riferimenti a un 'Dipartimento delle Anomalie' nei log aziendali. Non risulta in nessun organigramma pubblico. Pensavo dovessi saperlo.\"",
    condizione: { tipo: "sceneCompletate", id: ["N2-3"] },
    scelte: null,
  },
  "N3-2": {
    id: "N3-2",
    capitolo: "CAP-3",
    mittente: "Direzione",
    titolo: "Cosa fare della scoperta",
    testo: "Hai trovato tracce concrete del dipartimento segreto. Come procedi?",
    condizione: { tipo: "sceneCompletate", id: ["N3-1"] },
    scelte: [
      { id: "segnala", testo: "Segnala tutto secondo procedura, come da contratto.", effetti: [{ tipo: "allineamento", asse: "lealta", valore: 3 }] },
      { id: "indaga", testo: "Indaga per conto tuo, senza coinvolgere la Direzione.", effetti: [{ tipo: "allineamento", asse: "ribellione", valore: 3 }] },
    ],
  },
  "N3-3": {
    id: "N3-3",
    capitolo: "CAP-3",
    mittente: "RagZarg",
    titolo: "Il silenzio di Zarg",
    testo: "Per la prima volta, Rag. Zarg non ha nulla da dire sui tuoi numeri. Un silenzio che pesa più di qualunque revisione.",
    condizione: { tipo: "sceneCompletate", id: ["N3-2"] },
    scelte: null,
  },
  "N4-1": {
    id: "N4-1",
    capitolo: "CAP-4",
    mittente: "RagZarg",
    titolo: "I numeri sono numeri",
    testo: "Rag. Zarg, tornato operativo: \"I tuoi profitti sono ottimi. OmniProfit è soddisfatta. I numeri, va detto, non raccontano mai tutta la storia.\"",
    condizione: { tipo: "creditiAlmeno", minimo: 5000 },
    scelte: null,
  },
  "N4-2": {
    id: "N4-2",
    capitolo: "CAP-4",
    mittente: "Direzione",
    titolo: "Qualcuno dovrà pagare",
    testo: "Un taglio ai costi operativi è in arrivo dall'alto. Qualcuno dovrà sostenerne il peso: l'equipaggio, o la tua carriera.",
    condizione: { tipo: "sceneCompletate", id: ["N4-1"] },
    scelte: [
      {
        id: "proteggi",
        testo: "Proteggi l'equipaggio, anche a costo di scontrarti con la Direzione.",
        effetti: [
          { tipo: "allineamento", asse: "indipendenza", valore: 2 },
          { tipo: "allineamento", asse: "ribellione", valore: 1 },
        ],
      },
      { id: "direttive", testo: "Segui le direttive alla lettera, senza eccezioni.", effetti: [{ tipo: "allineamento", asse: "lealta", valore: 3 }] },
    ],
  },
  "N4-3": {
    id: "N4-3",
    capitolo: "CAP-4",
    mittente: "BOB",
    titolo: "BOB riflette",
    testo: "B.O.B.: \"Ho elaborato milioni di decisioni aziendali. Questa è la prima volta che una mi sembra... personale. Buffer di analisi inconcluso.\"",
    condizione: { tipo: "sceneCompletate", id: ["N4-2"] },
    scelte: null,
  },
  "N5-1": {
    id: "N5-1",
    capitolo: "CAP-5",
    mittente: "Direzione",
    titolo: "L'ultimo rapporto",
    testo: "La Direzione richiede un rapporto conclusivo sul tuo periodo di servizio. Qualunque cosa tu scriva, verrà archiviata per sempre. Il profitto, dopotutto, è eterno.",
    condizione: { tipo: "sceneCompletate", id: ["N4-3"] },
    scelte: null,
  },
  "N5-2": {
    id: "N5-2",
    capitolo: "CAP-5",
    mittente: "BOB",
    titolo: "La scelta finale",
    testo: "B.O.B.: \"Questo è il momento. Qualunque cosa tu decida, io registrerò tutto. È il mio lavoro. Ma, se posso... scegli con cura.\"",
    condizione: { tipo: "sceneCompletate", id: ["N5-1"] },
    scelte: [
      { id: "resta-fedele", testo: "Resta fedele a OmniProfit fino in fondo.", effetti: [{ tipo: "allineamento", asse: "lealta", valore: 5 }] },
      { id: "dichiara-indipendenza", testo: "Dichiarati economicamente indipendente.", effetti: [{ tipo: "allineamento", asse: "indipendenza", valore: 5 }] },
      { id: "esponi-tutto", testo: "Esponi pubblicamente tutto cio' che hai scoperto.", effetti: [{ tipo: "allineamento", asse: "ribellione", valore: 5 }] },
    ],
  },
};

export const FINALI: Record<string, FinaleDefinition> = {
  "FIN-LEALTA": {
    id: "FIN-LEALTA",
    titolo: "Promozione aziendale",
    testo:
      "La tua dedizione non è passata inosservata. OmniProfit ti promuove a Direttore Regionale Associato. Un ufficio vero, un badge dorato, e la certezza di aver fatto esattamente cio' che ci si aspettava da te. B.O.B. ti augura, sinceramente, buona fortuna.",
    segreto: false,
  },
  "FIN-INDIPENDENZA": {
    id: "FIN-INDIPENDENZA",
    titolo: "Indipendenza economica",
    testo:
      "Hai saldato i conti con OmniProfit e sei salpato/a per conto tuo. Nessun badge, nessuna quota, nessun Rag. Zarg a ricordarti le scadenze. Solo tu, la tua flotta, e una galassia che non ti deve più nulla.",
    segreto: false,
  },
  "FIN-RIBELLIONE": {
    id: "FIN-RIBELLIONE",
    titolo: "Ribellione ed esposizione",
    testo:
      "Hai reso pubblici i log del Dipartimento delle Anomalie. OmniProfit nega tutto, ma il danno è fatto: qualcuno, da qualche parte nella galassia, ora sa la verità. Non sarà un'esistenza tranquilla. Sarà, almeno, la tua.",
    segreto: false,
  },
  "FIN-LIQUIDAZIONE": {
    id: "FIN-LIQUIDAZIONE",
    titolo: "Liquidazione narrativa",
    testo:
      "La fiducia nei tuoi confronti si è esaurita ben prima delle tue risorse. OmniProfit liquida silenziosamente il tuo contratto: nessuna cerimonia, nessun addio. Solo una notifica standard e un ultimo accredito, quello minimo contrattuale.",
    segreto: false,
  },
  "FIN-SEGRETO": {
    id: "FIN-SEGRETO",
    titolo: "L'algoritmo indeciso",
    testo:
      "Il tuo profilo è così perfettamente bilanciato tra lealtà, indipendenza e ribellione che l'algoritmo di valutazione di OmniProfit si blocca in un loop infinito. Nessuna casella ti si addice. Per la prima volta in anni, un dipendente ha davvero sorpreso l'azienda.",
    segreto: true,
  },
};

/** Adatta il contesto aziendale mostrato in cima all'interfaccia al
 * finale raggiunto (B11: "adattare il contesto aziendale ai finali
 * indipendenti/ribelli senza contraddizioni narrative"): dopo
 * l'indipendenza o la ribellione non avrebbe senso continuare a mostrare
 * il marchio OmniProfit come se nulla fosse successo. null = nessun
 * finale ancora raggiunto, branding invariato. */
export function brandingPostCampagna(finaleId: string | null): { main: string; sub: string } | null {
  switch (finaleId) {
    case "FIN-LEALTA":
      return { main: "OMNIPROFIT", sub: "DIRETTORE REGIONALE ASSOCIATO™" };
    case "FIN-INDIPENDENZA":
      return { main: "OPERATORE INDIPENDENTE", sub: "ex Galactic Corporation™" };
    case "FIN-RIBELLIONE":
      return { main: "TESTIMONE", sub: "contro OmniProfit Galactic Corporation™" };
    case "FIN-LIQUIDAZIONE":
      return { main: "CONTRATTO LIQUIDATO", sub: "OmniProfit Galactic Corporation™" };
    case "FIN-SEGRETO":
      return { main: "OMNIPROFIT", sub: "CASO NON CLASSIFICATO" };
    default:
      return null;
  }
}

/** Margine entro cui i tre assi si considerano "equilibrati" per
 * l'epilogo segreto (B7: "possibile epilogo segreto"): nessun valore e'
 * specificato dal documento, scelto per restare raggiungibile solo con
 * scelte deliberatamente miste. */
export const MARGINE_EPILOGO_SEGRETO = 2;

/** Sotto questa fiducia al momento del finale, la liquidazione sovrasta
 * qualunque allineamento (coerente con B3/B9: la fiducia e' gia' il
 * segnale di rischio esistente nel gioco). */
export const SOGLIA_FIDUCIA_LIQUIDAZIONE = 20;
