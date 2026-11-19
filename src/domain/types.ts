// Tipi di dominio condivisi. Nessuna dipendenza da React o PixiJS.

export type EntityId = string;

export interface Vector2 {
  x: number;
  y: number;
}

export type RawResourceType = "ferro" | "cristalliSilicio" | "titanioStellare" | "iridioQuantico" | "materiaEsotica";

export type RefinedResourceType =
  | "ferroRaffinato"
  | "cristalliRaffinati"
  | "titanioRaffinato"
  | "iridioRaffinato"
  | "materiaEsoticaRaffinata";

/** "carburante" qui e' il carburante raffinato trasportato come merce in
 * stiva (non il livello del serbatoio, che resta MothershipEntity.carburante):
 * diventa utilizzabile dal motore solo dopo il trasferimento con la carta
 * Rifornimento (B1, Macrostep 4). */
export type ResourceType = RawResourceType | RefinedResourceType | "carburante";

export type CardCode =
  | "OPS-01"
  | "OPS-02"
  | "OPS-03"
  | "IND-01"
  | "IND-02"
  | "RSH-01"
  | "LOG-01"
  | "IPS-01"
  | "RAR-01"
  | "RAR-02";

export type CardCategory = "operazioni" | "industria" | "ricerca" | "logistica";

/** Rarita' di una carta (richiesta utente): determina il peso con cui puo'
 * essere estratta dalla carta speciale "Esplora" — comune molto piu'
 * probabile di rara. */
export type RaritaCarta = "comune" | "rara";

export interface CardDefinition {
  code: CardCode;
  nome: string;
  categoria: CardCategory;
  rarita: RaritaCarta;
  descrizione: string;
  bersaglio:
    | "pianetaScoperto"
    | "pianetaInvestigato"
    | "nave"
    | "nessuno"
    | "relitto"
    | "civiltaScoperta";
  inManoIniziale: boolean;
  /** false per le carte la cui azione reale non e' ancora implementata in
   * questo macrostep (Fabbrica -> Macrostep 4, Ricerca -> Macrostep 7): la
   * carta resta in mano, consultabile, ma non trascinabile/giocabile, per
   * non spacciare un effetto finto per gameplay reale. */
  attivabile: boolean;
}

export interface CardInstance {
  instanceId: EntityId;
  code: CardCode;
  livello: number;
}

export type PlanetArchetype =
  | "roccioso"
  | "desertico"
  | "ghiacciato"
  | "oceanico"
  | "terrestre"
  | "vulcanico"
  | "gassoso"
  | "cristallino"
  | "anomalo";

/** Parametri visivi non distruttivi (A5): combinati a runtime dal renderer,
 * mai "cotti" in una texture unica per ogni possibile combinazione. */
export interface PlanetVisualProfile {
  tintColor: number; // 0xRRGGBB, moltiplicato sulla texture base dell'archetipo
  haloColor: number;
  haloIntensity: number; // 0..1
  atmosfera: boolean;
  nuvolosita: number; // 0..1, usata solo da archetipi con atmosfera
  velocitaRotazione: number; // cicli/secondo della texture (rotazione apparente)
  variantiTexture: number; // indice della variante di rumore per l'archetipo (varieta' senza nuove texture per combinazione)
}

export interface Planet {
  id: EntityId;
  nome: string;
  archetipo: PlanetArchetype;
  posizione: Vector2;
  raggio: number;
  visualProfile: PlanetVisualProfile;
  scoperto: boolean;
  investigato: boolean;
  /** tempoSimulatoMs al quale un'investigazione in corso si completera';
   * null se nessuna investigazione e' in corso su questo pianeta. */
  investigazioneCompletataAlMs: number | null;
  /** true se rilevato dal comando Radar (ex Esplora): resta visibile sulla
   * mappa anche fuori dal raggio sensori della nave madre, pur non essendo
   * ancora investigato (richiesta utente). I pianeti investigati sono
   * sempre visibili comunque, a prescindere da questo flag. */
  sempreVisibile: boolean;
  /** Risorsa dominante e giacimento totale estraibile, generati con il
   * pianeta ma non mostrati al giocatore finche' non investigato. */
  risorsaDominante: RawResourceType;
  giacimentoTotale: number;
}

export type WreckFieldType = "relitto" | "campoAsteroidi";

export interface WreckField {
  id: EntityId;
  tipo: WreckFieldType;
  posizione: Vector2;
  raggio: number;
  scoperto: boolean;
  /** true dopo che la carta Recupera rottami e' stata usata su questo campo:
   * non puo' essere recuperato una seconda volta. */
  recuperato: boolean;
}

// --- Civilta' locali e pericoli regionali (B9, Macrostep 9) -----------------

/** Richiesta commerciale di una civilta' (B9: "richieste"): consegna di
 * una quantita' di risorsa grezza, tracciata automaticamente come le
 * missioni (B5), ma locale alla civilta' che la propone. */
export interface RichiestaCivilta {
  risorsa: RawResourceType;
  quantita: number;
  progresso: number;
  ricompensaRelazione: number;
  ricompensaCrediti: number;
}

export interface Civilta {
  id: EntityId;
  nome: string;
  posizione: Vector2;
  raggio: number;
  scoperta: boolean;
  /** 0-100: relazione locale a questa civilta' (B9: "nessun punteggio
   * reputazione galattica obbligatorio" — resta per costruzione locale
   * alla regione, azzerata a ogni salto iperspaziale insieme al resto). */
  relazione: number;
  richiestaAttiva: RichiestaCivilta | null;
}

export type TipoPericolo = "tempesta" | "campoGravitazionale" | "radiazioni";

/** Zona di pericolo regionale (B9: "tempeste, gravita'/radiazioni, rischi
 * con avvisi proporzionati"): effetto continuo, proporzionale a
 * `intensita'`, mentre la nave madre si trova al suo interno; mai letale
 * di per se', mai permanente (cessa appena si esce dalla zona). */
export interface RegionalHazard {
  id: EntityId;
  tipo: TipoPericolo;
  posizione: Vector2;
  raggio: number;
  scoperto: boolean;
  intensita: number; // 0..1
}

export interface RegioneSpaziale {
  seedRegione: string;
  pianeti: Planet[];
  campiRelitti: WreckField[];
  areaSicuraIniziale: { centro: Vector2; raggio: number };
  civilta: Civilta[];
  pericoli: RegionalHazard[];
}

export type ShuttleState =
  | "libera"
  | "inViaggio"
  | "inAttesa"
  | "caricamento"
  | "ritorno"
  | "scarico"
  | "indisponibile";

export interface ShuttleEntity {
  id: EntityId;
  stato: ShuttleState;
  capacitaCargo: number;
  caricoAttuale: Partial<Record<ResourceType, number>>;
  posizione: Vector2;
  /** Prossimo punto verso cui la navetta si sta muovendo (null se ferma). */
  destinazione: Vector2 | null;
  contrattoAssegnatoId: EntityId | null;
  /** Tempo accumulato in attesa/caricamento, per il timeout di partenza (B1). */
  tempoAttesaMs: number;
  /** Pianeta verso cui la navetta sta volando per un'investigazione in corso
   * (richiesta utente: anche l'Investiga deve mostrare una navetta in volo,
   * non solo il Contratto minerario); null se la navetta non e' impegnata in
   * un'investigazione. Percorso gestito a parte da quello dei contratti
   * minerari in `integraNavette` per non interferire con la logistica di
   * carico/scarico. */
  pianetaInvestigazioneId: EntityId | null;
}

export interface MiningShipEntity {
  id: EntityId;
  contrattoAttivoId: EntityId | null;
  estrazioneBaseAlMinuto: number;
}

// --- Ricerca, upgrade, flotta (B2, Macrostep 7) -----------------------------

export type RamoRicerca = "esplorazione" | "industria" | "logistica" | "economia";

export type EffettoTecnologia =
  | { tipo: "moltiplicatoreEstrazione"; valore: number }
  | { tipo: "moltiplicatoreVelocitaRaffinazione"; valore: number }
  | { tipo: "capacitaManoCarteBonus"; valore: number }
  | { tipo: "riduzioneIntervalloGenerazioneCarteMs"; valore: number }
  | { tipo: "raggioFogBonus"; valore: number }
  | { tipo: "moltiplicatoreTrasporti"; valore: number }
  | { tipo: "slotRicercaBonus"; valore: number }
  | { tipo: "slotModuloBonus"; valore: number }
  | { tipo: "moltiplicatoreCosti"; valore: number }
  | { tipo: "lineeFabbricaBonus"; valore: number }
  | { tipo: "sbloccaIperspazio" };

export interface TecnologiaDefinition {
  id: string;
  ramo: RamoRicerca;
  nome: string;
  descrizione: string;
  costoCrediti: number;
  /** Punti ricerca richiesti per avviare il progetto (richiesta utente:
   * "per avviare una ricerca ora servono punti ricerca"), oltre al costo in
   * crediti. Si accumulano giocando il comando Ricerca (RSH-01), +1 punto
   * per ogni comando giocato. */
  costoPuntiRicerca: number;
  durataMs: number;
  prerequisiti: string[];
  effetto: EffettoTecnologia;
}

/** completataAlMs null = nessuna esplorazione in corso (la carta "Esplora"
 * mostra l'icona "+", pronta per essere avviata). */
export interface EsplorazioneState {
  completataAlMs: number | null;
}

export interface ProgettoRicercaAttivo {
  id: EntityId;
  tecnologiaId: string;
  inizioMs: number;
  fineMs: number;
}

export interface RicercaState {
  progettiAttivi: ProgettoRicercaAttivo[];
  completate: string[];
  /** Punti ricerca accumulati, spesi per avviare un progetto. */
  puntiRicerca: number;
}

/** Bonus globali aggregati dalle tecnologie completate (vedi
 * src/domain/research.ts, calcolaBonusRicerca): mai persistito a parte,
 * sempre ricalcolato da RicercaState.completate, cosi' non puo' mai
 * desincronizzarsi dallo stato reale. */
export interface BonusRicerca {
  moltiplicatoreEstrazione: number;
  moltiplicatoreVelocitaRaffinazione: number;
  capacitaManoCarteBonus: number;
  riduzioneIntervalloGenerazioneCarteMs: number;
  raggioFogBonus: number;
  moltiplicatoreTrasporti: number;
  slotRicercaBonus: number;
  slotModuloBonus: number;
  moltiplicatoreCosti: number;
  lineeFabbricaBonus: number;
  iperspazioSbloccato: boolean;
}

export interface ModuloDefinition {
  id: string;
  nome: string;
  descrizione: string;
  costoCrediti: number;
  costoRisorsaRaffinata: Partial<Record<RefinedResourceType, number>>;
  bonusEstrazioneAlMinuto: number;
}

/** Istanza di modulo craftato: naveMinerariaId null = in magazzino, non
 * equipaggiato. L'unicita' (B2: "remote equip/unequip garantendo
 * unicita'") e' garantita dal fatto che un'istanza ha al massimo una nave
 * assegnata alla volta. */
export interface ModuloInstance {
  instanceId: EntityId;
  definizioneId: string;
  naveMinerariaId: EntityId | null;
}

/** Contratto minerario attivo su un pianeta investigato (B1). La carta
 * IND-01 lo attivera' concretamente al Macrostep 3; qui il motore gestisce
 * gia' estrazione, deposito e logistica delle navette per un contratto
 * eventualmente presente nello stato. */
export interface MiningContract {
  id: EntityId;
  pianetaId: EntityId;
  naveMinerariaId: EntityId;
  risorsa: RawResourceType;
  giacimentoResiduo: number;
  estrazioneAlMinuto: number;
  /** Materiale estratto in attesa di ritiro da parte di una navetta; il
   * buffer e' limitato alla capacita' di una navetta (B1: "estrazione deve
   * sospendersi se non c'e' capacita' utilizzabile" a valle). */
  depositoAccumulato: number;
  priorita: number;
  ultimaAssegnazioneMs: number;
  attivo: boolean;
}

export interface MothershipEntity {
  posizione: Vector2;
  /** Radianti; 0 = verso destra (+X), positivo in senso orario (Y verso il basso). */
  orientamento: number;
  velocita: number;
  velocitaMax: number;
  accelerazione: number;
  velocitaAngolare: number;
  /** Waypoint residui da raggiungere, ultimo elemento = destinazione finale.
   * Puo' contenere piu' punti quando il percorso aggira un ostacolo. */
  percorso: Vector2[];
  stivaCapacita: number;
  stivaCarico: Partial<Record<ResourceType, number>>;
  serbatoioCapacita: number;
  carburante: number;
  /** tempoSimulatoMs fino al quale la nave madre e' immune agli effetti dei
   * pericoli regionali (carta Fuga d'emergenza, RAR-02, Macrostep 9); 0 =
   * nessuna immunita' attiva. */
  immunitaPericoliFinoMs: number;
}

/** Ricetta di raffinazione data-driven (B1/Macrostep 4): configurabile senza
 * toccare il codice, vedi src/domain/refineRecipes.ts. */
export interface RefineRecipe {
  id: string;
  nome: string;
  inputRisorsa: RawResourceType;
  inputQuantita: number;
  outputRisorsa: ResourceType;
  outputQuantita: number;
  costoCrediti: number;
  durataSec: number;
}

export type RefineQueueItemState = "inCoda" | "inLavorazione";

export interface RefineQueueItem {
  id: EntityId;
  ricettaId: string;
  stato: RefineQueueItemState;
  /** Impostati quando l'elemento passa in lavorazione (input gia' consumato
   * atomicamente a quel momento, non prima). */
  tempoCompletamentoMs: number | null;
}

export interface Factory {
  id: EntityId;
  costruita: boolean;
  /** Linee di produzione concorrenti; 1 in questo macrostep, espandibile
   * con la ricerca (Macrostep 7). */
  linee: number;
  coda: RefineQueueItem[];
}

export type StatoRevisione = "nessuna" | "dovuta" | "inTolleranza";

export interface CompanyReviewState {
  carteGiocateTotali: number;
  carteGiocateDallUltimaRevisione: number;
  sogliaCarteProssimaRevisione: number;
  quotaDaPagare: number;
  fiducia: number;
  soccorsoCarburanteUsato: boolean;
  /** "nessuna" = nessuna quota dovuta; "dovuta" = quota da pagare, tolleranza
   * non ancora iniziata; "inTolleranza" = quota non pagata, conto alla
   * rovescia di carte di tolleranza in corso (B3: 5 carte, poi Game Over). */
  statoRevisione: StatoRevisione;
  carteTolleranzaResidue: number;
  numeroRevisioniPagate: number;
  /** Utile (ricavi - spese) degli ultimi periodi tra una revisione e la
   * successiva, piu' recente in fondo; usato dalla formula adattiva della
   * quota (DA BILANCIARE, B3). Al massimo gli ultimi 3 valori. */
  storicoUtilePeriodi: number[];
}

/** Contabilita' separata da liquidita'/debito (B3: "tracciare separatamente
 * saldo liquidita', ricavi, costi, utile operativo, debito/prestiti";
 * ricevere un prestito non equivale a ricavo). I prestiti restano fuori
 * scope in questo macrostep (vedi docs/game-rules.md): il campo esiste gia'
 * per compatibilita' futura ma non viene mai popolato.
 */
export interface ContabilitaState {
  ricaviTotali: number;
  speseTotali: number;
  ricaviPeriodoCorrente: number;
  spesePeriodoCorrente: number;
  debito: { capitaleResiduo: number; tassoInteresse: number } | null;
  /** Numero di vendite manuali concluse (comando "vendi risorsa"): usato
   * per distinguere "prima vendita" da altre entrate (missioni, eventi,
   * scene narrative) che alzano `ricaviTotali` senza essere una vendita. */
  venditeTotali: number;
}

export interface MarketState {
  prezzi: Partial<Record<ResourceType, number>>;
  ultimoAggiornamentoMs: number;
}

// --- Missioni e opportunita' (B4/B5, Macrostep 6) --------------------------

export type TipoOpportunita = "missioneAziendale" | "investigazione" | "recupero" | "richiestaCommerciale";
export type StatoMissione = "disponibile" | "attiva" | "completata" | "abbandonata" | "archiviata";

/** Obiettivo tracciato automaticamente (B5: "obiettivi tracciati
 * automaticamente"). Ogni pianeta/relitto bersaglio e' usato da al massimo
 * una missione dello stesso identico obiettivo, cosi' completarla e'
 * un evento singolo, non ripetibile (B4). */
export type ObiettivoMissione =
  | { tipo: "investigaPianeta"; pianetaId: EntityId }
  | { tipo: "avviaContratto"; pianetaId: EntityId }
  | { tipo: "recuperaRelitto"; relittoId: EntityId }
  | { tipo: "vendiRisorsa"; risorsa: ResourceType; quantita: number; progresso: number };

export interface RicompensaMissione {
  crediti: number;
  carte: CardCode[];
}

export interface Missione {
  id: EntityId;
  tipo: TipoOpportunita;
  titolo: string;
  descrizione: string;
  /** true per l'unica missione principale (attiva automaticamente da
   * inizio partita, B5); le altre sono secondarie, accettate manualmente,
   * fino a 3 attive contemporaneamente. */
  principale: boolean;
  stato: StatoMissione;
  obiettivo: ObiettivoMissione;
  ricompensa: RicompensaMissione;
  /** Bonus opzionale non mostrato finche' non ottenuto (B5): mai
   * indispensabile per la progressione. null se questa missione non ne ha
   * uno. */
  ricompensaNascosta: RicompensaMissione | null;
}

// --- Mercato carte (B2, Macrostep 6) ----------------------------------------

export interface SlotMercatoCarte {
  id: EntityId;
  code: CardCode;
  prezzo: number;
}

export interface CardMarketState {
  slots: SlotMercatoCarte[];
  ultimaRotazioneMs: number;
}

// --- Eventi periodici (B9, Macrostep 9) -------------------------------------

export type CategoriaEvento = "aziendale" | "economico" | "diplomatico" | "misterioso" | "pirateria";

/** Conseguenze concrete e implementate (mai un generico "+X% a caso"
 * travestito da scelta, B9): crediti/fiducia/relazione sono variazioni
 * dirette e visibili; `cargoRubato`/`naveSabotata`/`naveMinerariaDistrutta`
 * sono esiti reali con effetto osservabile sullo stato, non solo testo. */
export type EffettoScelta =
  | { tipo: "crediti"; valore: number }
  | { tipo: "fiducia"; valore: number }
  | { tipo: "relazioneCivilta"; valore: number }
  | { tipo: "cargoRubato"; percentuale: number }
  | { tipo: "naveSabotata" }
  | { tipo: "naveMinerariaDistrutta" }
  | { tipo: "nessunEffetto" };

export interface ScelteEventoDefinition {
  id: string;
  testo: string;
  effetti: EffettoScelta[];
}

export interface EventoDefinition {
  id: string;
  categoria: CategoriaEvento;
  titolo: string;
  descrizione: string;
  /** B9: "eventi ordinari non modali, critici sospendono solo quando
   * necessario" — true solo per gli esiti di pirateria piu' gravi
   * (possibile naveMinerariaDistrutta), mostrati con una modale dedicata
   * invece che nel pannello eventi passivo. */
  critico: boolean;
  scelte: ScelteEventoDefinition[];
}

export interface EventoAttivo {
  id: EntityId;
  definizioneId: string;
  creatoAlMs: number;
}

export interface EventiState {
  attivi: EventoAttivo[];
  carteGiocateDallUltimo: number;
  sogliaProssimo: number;
}

// --- Campagna narrativa a 5 capitoli (B7/B10, Macrostep 10) -----------------
// Contenuti puramente data-driven, letti in sola lettura dallo stato di
// gioco esistente per decidere quando sbloccare una scena: non alterano in
// alcun modo le regole del motore di simulazione (B10: "integrare la
// campagna senza alterare la simulation engine").

export type CapitoloId = "CAP-1" | "CAP-2" | "CAP-3" | "CAP-4" | "CAP-5";

export type MittenteNarrativo = "BOB" | "RagZarg" | "Direzione";

export type AsseNarrativo = "lealta" | "indipendenza" | "ribellione";

export type EffettoScena =
  | { tipo: "allineamento"; asse: AsseNarrativo; valore: number }
  | { tipo: "crediti"; valore: number }
  | { tipo: "nessunEffetto" };

export type CondizioneScena =
  | { tipo: "semprePrimo" }
  | { tipo: "missioniCompletate"; minimo: number }
  | { tipo: "ricercaCompletata"; minimo: number }
  | { tipo: "creditiAlmeno"; minimo: number }
  | { tipo: "pianetaAnomaloInvestigato" }
  | { tipo: "pericoloScoperto" }
  | { tipo: "sceneCompletate"; id: string[] };

export interface SceltaNarrativaDefinition {
  id: string;
  testo: string;
  effetti: EffettoScena[];
}

export interface SceneNarrativaDefinition {
  id: string;
  capitolo: CapitoloId;
  mittente: MittenteNarrativo;
  titolo: string;
  testo: string;
  condizione: CondizioneScena;
  /** null = scena informativa, un solo pulsante "Continua" senza conseguenze. */
  scelte: SceltaNarrativaDefinition[] | null;
}

export interface FinaleDefinition {
  id: string;
  titolo: string;
  testo: string;
  segreto: boolean;
}

export interface CampagnaState {
  capitoloCorrente: CapitoloId | null;
  sceneCompletate: string[];
  allineamento: Record<AsseNarrativo, number>;
  finaleOttenuto: string | null;
}

export interface NotificationEntry {
  id: EntityId;
  timestampSimMs: number;
  testo: string;
  livello: "info" | "attenzione" | "critico";
}

export interface GameState {
  seed: string;
  creato: boolean;
  crediti: number;
  tempoSimulatoMs: number;
  inPausa: boolean;
  mothership: MothershipEntity;
  naviMinerarie: MiningShipEntity[];
  navette: ShuttleEntity[];
  manoCarte: CardInstance[];
  capacitaManoCarte: number;
  review: CompanyReviewState;
  notifiche: NotificationEntry[];
  pianetaSelezionatoId: EntityId | null;
  pianeti: Planet[];
  campiRelitti: WreckField[];
  areaSicuraIniziale: { centro: Vector2; raggio: number };
  contrattiMinerari: MiningContract[];
  /** Richiesta utente: sostituisce la generazione passiva di carte. Quando
   * la mano ha uno slot libero appare una carta speciale "Esplora" (non
   * acquistabile, icona "+"): cliccandola si avvia un'esplorazione, un
   * conto alla rovescia casuale (1-3 minuti) al termine del quale si riceve
   * una carta casuale (comuni piu' probabili delle rare). Una sola
   * esplorazione alla volta. */
  esplorazione: EsplorazioneState;
  fabbrica: Factory;
  mercato: MarketState;
  contabilita: ContabilitaState;
  /** non null quando la partita e' terminata (es. mancato pagamento dopo la
   * tolleranza); il motore smette di avanzare la simulazione. */
  gameOver: { motivo: string } | null;
  missioni: Missione[];
  mercatoCarte: CardMarketState;
  ricerca: RicercaState;
  moduli: ModuloInstance[];
  /** 1 alla creazione della carriera, incrementato a ogni salto
   * iperspaziale (B6, Macrostep 8); usato per derivare deterministicamente
   * il seed della regione successiva (`${seed}|regione${numeroRegione}`). */
  numeroRegione: number;
  civilta: Civilta[];
  pericoli: RegionalHazard[];
  eventi: EventiState;
  campagna: CampagnaState;
}
