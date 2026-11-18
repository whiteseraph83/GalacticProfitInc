# Regole di gioco — stato dopo il Macrostep 11 (roadmap completa, v1.0)

Questo documento registra le regole CONFERMATE gia' implementate (anche solo
come infrastruttura) e i parametri ancora DA BILANCIARE, aggiornandosi a ogni
macrostep. Riferimento completo: `Galactic_Profit_Inc_Prompt_Sviluppo_Macrostep.md`
(fornito dall'utente).

## Implementato al Macrostep 0

- **Stato iniziale validato** (`src/domain/initialState.ts`): 2.000 Cr, una
  nave mineraria, due navette da 40 unita', nave madre con stiva 500 /
  serbatoio 150, carburante iniziale 120 (provvisorio), mano di 5 carte
  esattamente `OPS-01, OPS-02, IND-01, IND-02, RSH-01`.
- **Motore di simulazione** (`src/simulation/engine.ts`): tick a sub-step
  fissi (100 ms) indipendenti dal frame rate della UI; la pausa congela
  l'avanzamento del tempo simulato; un comando con lo stesso `id` applicato
  due volte viene rifiutato la seconda volta (protezione doppio
  click/callback duplicata).
- **Flusso comandi**: valida -> applica atomicamente -> notifica.
- **Modale di conferma generica** (`src/ui/components/ConfirmModal.tsx`):
  Annulla ed Esc non hanno alcun effetto; il pulsante Conferma e' protetto
  da doppio click lato componente, e il motore rifiuta comunque un comando
  duplicato.

## Implementato al Macrostep 1 (universo procedurale)

- **Generatore di regione seed-based** (`src/world/regionGenerator.ts`):
  18-32 pianeti (originariamente 50-100 in B4, ridotti su richiesta
  dell'utente dopo playtest — vedi `docs/balance.json`), distribuiti in
  parte in 3-5 "sistemi stellari" riconoscibili (cluster) e in parte
  liberamente nella regione; 9 archetipi
  (`src/domain/planetArchetypes.ts`) con l'archetipo `anomalo` come quota
  rara (~3%, peso 3 su un totale di 97). Nomi procedurali unici
  (`src/world/nameGenerator.ts`). Separazione minima garantita tra i corpi
  (rejection sampling con fallback deterministico dopo N tentativi).
- **Area sicura iniziale**: 4-6 pianeti di archetipo comune generati entro
  un raggio fisso dal punto di nascita della nave madre e marcati
  "scoperti" fin dall'inizio, cosi' una risorsa comune e' sempre
  raggiungibile subito (anti-softlock, A4/B4).
- **Relitti e campi di asteroidi**: 3-6 corpi generati come dati di mondo
  (`WreckField`), distinti dai contratti minerari normali; riservati alla
  futura carta `OPS-03 Recupera rottami` (non ancora giocabile).
- **Fog of war persistente** (`SimulationEngine.integrateFogDiscovery`): a
  ogni tick, ogni pianeta/relitto non ancora scoperto entro il raggio di
  visibilita' della nave madre viene marcato `scoperto = true` in modo
  permanente (non torna mai "nascosto"); viene generata una notifica alla
  scoperta di un pianeta. Un pianeta non scoperto non viene renderizzato e
  non puo' essere selezionato (`ui/selectPlanet` rifiuta l'id): la camera
  puo' muoversi liberamente ma non rivela nulla che la nave madre non abbia
  ancora raggiunto.
- **Rendering dei pianeti, procedurale e fotografico** (`src/render/planetSprite.ts`,
  `src/render/planetTextures.ts`): per 5 archetipi su 9 (`roccioso`,
  `oceanico`, `ghiacciato`, `terrestre`, `vulcanico`), per cui l'utente ha
  fornito una fotografia individuale, la superficie usa quella fotografia
  (ritagliata a cerchio con bordo sfumato, `scripts/process_planets.py`,
  A5: "se disponibili usare file effettivamente presenti"), con tint
  ridotto al 20% e senza scorrimento di rotazione (non essendo una texture
  seamless). Gli archetipi senza foto individuale (`gassoso`, `cristallino`,
  `anomalo`, `desertico`) restano su texture generate via canvas 2D (4
  famiglie di pattern: chiazzato, a fasce, a frattura, ondulato, assegnate
  per archetipo), applicate via `TilingSprite` mascherato a cerchio con
  scorrimento continuo per la rotazione apparente. In entrambi i casi
  colore/tint, alone luminoso, ombra direzionale coerente su tutta la
  mappa, atmosfera opzionale (nuvolosita') e dimensione sono tutti
  parametri indipendenti (`PlanetVisualProfile`), non "cotti" in un'unica
  immagine per combinazione. L'archetipo `anomalo` ha un alone pulsante per
  distinguerlo visivamente. Anello "raggio sensori" attorno alla nave madre
  per mostrare l'area di scoperta corrente.
- **Pannello pianeta aggiornato**: nome, archetipo, dimensione (classe
  piccola/media/grande), stato risorse ("sconosciute" finche' non
  investigato — l'investigazione reale arriva con la carta Investiga al
  Macrostep 3).

## Implementato al Macrostep 2 (navi, movimento, carburante, logistica)

- **Fisica della nave madre** (`SimulationEngine.integrateMothership`):
  accelerazione/decelerazione verso il waypoint corrente, velocita'
  angolare limitata (la nave "insegue" gradualmente la direzione di marcia,
  non ruota all'istante), frenata calcolata per fermarsi esattamente
  sull'ultimo waypoint. Rotazione visibile anche a schermo (`src/render`).
- **Pathfinding anti-ostacolo** (`src/simulation/pathfinding.ts`): quando
  il comando `ui/moveMothership` viene applicato, il percorso diretto verso
  la destinazione viene controllato contro tutti i pianeti scoperti; se
  interseca un pianeta viene inserito un waypoint di aggiramento (tangente
  al bordo + margine di sicurezza), ricontrollato fino a 6 iterazioni. Il
  percorso pianificato e' disegnato sulla mappa.
- **Consumo carburante proporzionale alla distanza**: dedotto solo per la
  distanza effettivamente percorsa a ogni sub-step, mai anticipato. Se il
  carburante finisce a meta' tragitto la nave si ferma (notifica critica),
  scenario diverso dal rifiuto per "movimento non autorizzato" (quello
  avviene solo se il comando viene dato a carburante gia' a zero: in quel
  caso nessun carburante viene consumato).
- **Soccorso carburante** (`ui/soccorsoCarburante`): +30 carburante (senza
  superare il serbatoio), -10 fiducia, utilizzabile una sola volta per
  carriera, con modale di conferma dedicata.
- **Navette e logistica mineraria** (`src/simulation/logistics.ts`, pure,
  testate senza browser): macchina a stati completa (libera / in viaggio /
  in attesa / caricamento / ritorno / scarico / indisponibile);
  assegnazione delle navette libere ai contratti con materiale disponibile,
  con priorita' e anti-starvation (contratto servito meno di recente vince
  a parita' di priorita'); durante il ritorno la navetta insegue la
  posizione corrente della nave madre anche se questa si sposta; carico
  fino a pieno o al timeout di partenza (3 min, provvisorio); scarico
  atomico nella stiva della nave madre, con eccedenza che resta fisicamente
  a bordo della navetta se la stiva e' piena (nessuna perdita, nessuna
  duplicazione).
- **Estrazione mineraria** (`integraEstrazione`): un contratto accumula
  materiale in un buffer pari alla capacita' di una navetta (40 unita'); al
  raggiungimento del buffer l'estrazione si sospende automaticamente finche'
  una navetta non lo svuota (B1: "estrazione deve sospendersi se non c'e'
  capacita' utilizzabile").
- **Pannello Flotta**: stato/posizione/carico di nave madre, nave mineraria
  e navette, sempre visibile nel pannello laterale destro.

## Implementato al Macrostep 3 (carte giocabili ed esplorazione)

- **Comando generico `ui/giocaCarta`** (`src/simulation/cardEffects.ts`,
  pure, testate senza browser): valida -> applica atomicamente -> notifica,
  come ogni altro comando (A2). Consuma la carta e incrementa
  `carteGiocateTotali`/`carteGiocateDallUltimaRevisione` **solo** se il
  comando viene davvero applicato: un bersaglio non valido o un doppio
  dispatch dello stesso id non toccano ne' la mano ne' il contatore.
- **Esplora (OPS-01)**: bersaglio = un punto qualsiasi della mappa; rivela
  permanentemente (stesso meccanismo del fog of war) tutti i pianeti/relitti
  entro un raggio dal punto cliccato, indipendentemente dalla posizione
  della nave madre.
- **Investiga (OPS-02)**: bersaglio = un pianeta scoperto non ancora
  investigato. **Non istantanea** (B2): avvia un timer di 10-30 secondi
  (seed-based, deterministico per partita); solo allo scadere il pianeta
  diventa `investigato` e la risorsa dominante e' visibile nel pannello.
  Un pianeta con investigazione gia' in corso non puo' essere scelto di
  nuovo come bersaglio.
- **Contratto minerario (IND-01)**: bersaglio = un pianeta investigato
  senza contratto attivo, con almeno una nave mineraria libera e crediti
  sufficienti per il costo iniziale (30 Cr, provvisorio). Crea un
  `MiningContract` con il giacimento del pianeta e aziona esattamente la
  logistica di estrazione/navette gia' costruita al Macrostep 2 — **ora
  osservabile end-to-end nell'app**, non piu' solo nei test. Il costo
  operativo (4 Cr/min, provvisorio) viene dedotto nel tempo
  (`integraCostoOperativoContratti`); se i crediti non bastano il contratto
  si sospende (nessun saldo negativo, G1).
- **Recupera rottami (OPS-03)**: logica di validazione/applicazione
  implementata (bersaglio = relitto scoperto non ancora recuperato, premio
  in crediti), come richiesto dal documento ("logica implementata con
  bersaglio specifico"). **Correzione rispetto alla nota scritta qui al
  Macrostep 3**: e' gia' raggiungibile dalla UI tramite la generazione
  passiva di carte (sotto), che pesca da tutti i codici definiti; le fonti
  "ufficiali" (missioni, esplorazione-con-probabilita', mercato carte)
  restano comunque Macrostep 6.
- **Drag & drop e click-carta/click-bersaglio** (`src/ui/AppShell.tsx`,
  `src/render/PixiMapView.tsx`): entrambi i metodi mostrano sempre la
  stessa modale di conferma (nome carta, bersaglio, effetto, costi,
  durata, reversibilita') prima di consumare la carta; Annulla/Esc non
  hanno alcun effetto; i bersagli validi vengono evidenziati sulla mappa
  mentre una carta e' "armata"; il click su spazio libero in questa
  modalita' **non** muove la nave madre (A4).
- **Ricerca resta in mano** (B2 richiede la mano iniziale esatta) **ma non
  e' attivabile**: non e' trascinabile, il click mostra solo il tooltip con
  la nota "non ancora attivabile" invece di entrare in modalita' bersaglio.
  La sua azione reale e' Macrostep 7: niente effetto finto spacciato per
  gameplay.
- **Generazione passiva di carte** (`integraGenerazioneCarte`): una carta
  casuale ogni 5 minuti di tempo attivo se la mano non e' piena; se piena,
  il ciclo viene semplicemente saltato (nessun accumulo), come richiesto.

## Implementato al Macrostep 4 (fabbrica, raffinazione, produzione)

- **Carta Fabbrica (IND-02), ora attivabile**: bersaglio "nave" (nessuna
  selezione sulla mappa, click → conferma immediata). Costruisce la prima
  fabbrica (una linea di raffinazione) per 200 Cr (confermato, B1) + 50
  ferro grezzo in stiva (quantita' provvisoria: il documento non la
  specifica); bloccata se crediti o ferro insufficienti, o se gia'
  costruita.
- **Coda di raffinazione** (`src/simulation/factory.ts`, pure, testata
  senza browser): impostata manualmente dal giocatore con un comando libero
  (`ui/accodaRaffinazione`, nessuna carta — come le rotte cargo delle
  navette, B2), produzione automatica dopo l'avvio. Una ricetta per ognuna
  delle 5 risorse grezze verso il relativo raffinato, piu' una ricetta
  speciale che produce carburante. Il costo in crediti e' dedotto
  all'accodamento; l'input grezzo viene consumato solo quando la linea
  (una sola, in questo macrostep) la avvia davvero; l'output viene
  consegnato solo se puo' essere immagazzinato per intero (nessuna
  produzione nel vuoto, nessuna perdita silenziosa) — se la stiva non ha
  spazio la linea resta occupata, in attesa, esattamente come le navette
  quando la stiva e' piena.
- **Carburante raffinato**: riempie prima il serbatoio della nave madre,
  poi l'eccedenza va in stiva come merce (`ResourceType "carburante"`),
  trasferibile al serbatoio con la nuova **carta Rifornimento (LOG-01)**
  (bersaglio "nave", non in mano iniziale — "altra carta futura" gia'
  citata in B2, raggiungibile da subito tramite la generazione passiva).
- **Pannello Fabbrica**: stato di costruzione, elenco ricette disponibili
  con pulsante "Avvia" (con conferma), coda di produzione in tempo reale.
- **Minerali grezzi vendibili senza fabbrica / raffinati piu' redditizi**
  (B4): per ora senza effetto osservabile in assenza del mercato
  (Macrostep 5) — i raffinati restano in stiva, pronti per quando il
  mercato esistera'.

## Implementato al Macrostep 5 (economia, mercato, revisioni, save)

- **Mercato** (`src/simulation/economy.ts`, pure, testato senza browser):
  acquisto/vendita manuali (B3, confermato: "transazioni sempre manuali")
  di qualunque risorsa posseduta, quantita' intere, saldo mai negativo,
  nessuna vendita automatica. Prezzi aggiornati ogni 5 minuti di tempo
  attivo (B3, confermato), con un nuovo bersaglio casuale entro ±20% dal
  prezzo base avvicinato gradualmente (non un salto secco). Azione libera,
  senza carta, come le rotte cargo o la coda di raffinazione.
- **Contabilita' separata** (`GameState.contabilita`): ricavi/spese totali
  e del periodo corrente, distinti dalla liquidita' (`crediti`) e dal
  debito (B3: "ricevere un prestito non equivale a ricavo o profitto").
  Ogni spesa/ricavo in crediti del gioco (contratti, fabbrica,
  raffinazione, mercato, recupero rottami) passa da qui.
- **Prima revisione esattamente alla 40ª carta giocata** (B3, confermato:
  "non sostituire il trigger delle 40 carte con un timer"), quota 600 Cr
  pagabile anche dal solo capitale iniziale, nessun requisito aggiuntivo.
  Stato `statoRevisione`: `nessuna` → `dovuta` (alla soglia) →
  `inTolleranza` (dopo la prima carta giocata senza pagare) → di nuovo
  `nessuna` al pagamento. Banner persistente in UI con pulsante "Paga
  quota" (con conferma) finche' la quota e' dovuta.
- **Tolleranza e Game Over** (B3, confermato: 5 carte di tolleranza):
  ogni carta giocata con successo mentre la quota e' dovuta/in tolleranza
  consuma una carta di tolleranza residua; a tolleranza esaurita senza
  pagamento la partita termina (`GameState.gameOver`). A Game Over il
  motore rifiuta ogni comando (tranne pausa) e smette di avanzare il
  tempo; la UI mostra una schermata dedicata con l'opzione di iniziare
  una nuova carriera (cancella il salvataggio e ricarica).
- **Quota adattiva per le revisioni successive**: euristica sull'utile
  medio degli ultimi 3 periodi (crescita max +25%, calo max -15%, mai
  sotto 600 Cr) — provvisoria per esplicita ammissione del documento
  ("DA BILANCIARE"), dato che il "livello aziendale" citato in B3 non
  esiste ancora come sistema di gioco.
- **Prestiti: esplicitamente rimandati.** B3 li descrive in dettaglio
  (interesse 20%, rate ogni 20 carte, tolleranza 5 carte su mancato
  pagamento) ma il documento stesso autorizza a rimandarli "se non
  implementabili senza compromettere la qualita'", a condizione di
  documentarlo e prevedere lo stato in modo compatibile: il campo
  `GameState.contabilita.debito` esiste gia' con la forma giusta
  (`capitaleResiduo`, `tassoInteresse`) ma resta sempre `null`. Dato il
  volume gia' consistente di questo macrostep (mercato + revisioni +
  persistenza), implementarli ora avrebbe significato affrettare
  l'ultima parte senza la stessa cura delle altre.
- **Persistenza IndexedDB** (`src/persistence/indexedDbAdapter.ts`): un
  solo salvataggio "carriera attiva", schema versionato
  (`SAVE_SCHEMA_VERSION`). Autosave ogni 30 secondi di tempo reale a
  pagina aperta, piu' immediato su eventi importanti (Game Over,
  pagamento quota). Al caricamento della pagina il motore riprende
  esattamente dall'ultimo autosave (nessuna simulazione del tempo
  trascorso a pagina chiusa, A3) oppure genera una nuova partita se non
  c'e' alcun salvataggio valido. Esporta/importa JSON manuali dal
  pannello Salvataggio, con validazione (`validaStato`) prima di
  sostituire la partita corrente.
- **Bug corretto durante lo sviluppo**: il primo tentativo di caricamento
  asincrono usava una guardia extra (`useRef`) per evitare doppie
  esecuzioni dell'effetto, ma in combinazione con il doppio montaggio di
  React StrictMode in sviluppo faceva si' che *nessuna* delle due
  esecuzioni completasse il caricamento, bloccando l'app sulla schermata
  "Caricamento partita…" per sempre. Rimossa: il pattern corretto (gia'
  usato altrove, es. `PixiMapView`) e' una semplice variabile `annullato`
  locale all'effetto, senza stato condiviso tra le due esecuzioni.

## Implementato al Macrostep 6 (tutorial, missioni, mercato carte, rifinitura)

- **Generatore di missioni seed-based** (`src/world/missionGenerator.ts`,
  pure, testato senza browser): esattamente 4 missioni introduttive
  garantite (2 `investigaPianeta` su due pianeti distinti dell'area sicura,
  1 `avviaContratto` sul primo di questi, 1 `vendiRisorsa` di ferro×5), ognuna
  con esattamente 1 carta di ricompensa — le "4 carte extra garantite" di B6
  — piu' esattamente 1 missione **principale** (`avviaContratto` su un
  pianeta fuori dal set introduttivo, gia' `attiva` dall'inizio, ricompensa
  maggiore con possibilita' di bonus nascosto), poi un pool di 20-30
  missioni totali (secondarie opzionali, di 4 tipi: missione aziendale,
  investigazione, recupero, richiesta commerciale), senza bersagli duplicati
  dello stesso tipo. Distribuzione delle ricompense (20% zero carte / 70%
  una carta / 10% due carte) per approssimare "generalmente 1 carta,
  raramente 2, talvolta 0" (B6).
- **Comandi `ui/accettaMissione` / `ui/abbandonaMissione`**
  (`src/simulation/missions.ts`, pure, testato senza browser): massimo 3
  missioni secondarie attive contemporaneamente (la principale non conta nel
  limite e non puo' essere abbandonata); abbandonare libera subito uno slot.
- **Tracking automatico degli obiettivi** (`integraMissioni`, eseguito a
  ogni tick): scansiona tutte le missioni attive e completa automaticamente
  quella il cui obiettivo diventa vero (pianeta investigato, contratto
  avviato, relitto recuperato, quantita' di risorsa venduta raggiunta — il
  progresso di vendita si accumula tramite `applicaVendiRisorsa`), assegnando
  ricompensa (ed eventuale ricompensa nascosta) atomicamente nello stesso
  tick; a differenza dell'acquisto al mercato, una ricompensa puo' superare
  la capacita' della mano (non e' una scelta del giocatore, non va bloccata).
- **Mercato carte** (`src/domain/cardMarket.ts`, `src/simulation/cardMarket.ts`,
  pure, testati senza browser): 5 slot con prezzo fisso per codice carta,
  rinnovati casualmente ogni 15 minuti di tempo simulato attivo. Acquisto
  diretto (`ui/acquistaCartaMercato`, nessuna carta richiesta) bloccato se
  crediti insufficienti **o se la mano e' gia' piena** — qui, al contrario
  delle ricompense passive, e' una scelta deliberata del giocatore, quindi
  viene impedita finche' non c'e' spazio. La spesa passa da
  `registraSpesa` come ogni altro movimento economico (Macrostep 5).
- **Pannello Missioni** (`src/ui/panels/MissionsPanel.tsx`): missione
  principale sempre in evidenza, elenco delle secondarie attive (con
  "Abbandona"), elenco delle disponibili (con "Accetta", disabilitato oltre
  il limite di 3 attive, elenco troncato con interruttore "mostra tutte"),
  contatore delle completate.
- **Pannello Mercato carte** (`src/ui/panels/CardMarketPanel.tsx`):
  countdown al prossimo rinnovo, 5 slot con prezzo e pulsante "Compra"
  (disabilitato se crediti insufficienti o mano piena).
- **Guida introduttiva non invasiva** (`src/ui/TutorialPanel.tsx`): checklist
  flottante di 5 passi suggeriti (scoperta, investigazione, contratto, prima
  consegna in stiva, prima vendita), sempre richiudibile e mai bloccante
  (B6: "poche istruzioni... chi gioca non deve rimanere costretto a una
  sequenza rigida"); due passi (consegna/vendita) sono proxy approssimati
  (cargo in stiva > 0 / ricavi totali > 0) in assenza di eventi dedicati per
  "prima consegna"/"prima vendita"; la chiusura non e' persistita (torna
  visibile a un nuovo caricamento di pagina), scelta deliberata per
  restare un aiuto leggero senza aggiungere stato salvato solo per questo.

## Implementato al Macrostep 7 (ricerca, upgrade, flotta)

- **Albero di ricerca** (`src/domain/research.ts`, `src/simulation/research.ts`,
  pure, testati senza browser): quattro rami — Esplorazione, Industria,
  Logistica, Economia — con 3 tecnologie ciascuno (12 totali), prerequisiti
  a catena all'interno del ramo, costi 300-900 Cr e durate 3-14 minuti.
  **Ogni ricerca richiede una carta Ricerca (RSH-01) giocata** (B2): la
  carta e' ora attivabile, con un nuovo tipo di bersaglio dedicato
  (`"progettoRicerca"`, l'id della tecnologia scelta nel pannello Ricerca,
  non un punto sulla mappa) che passa comunque dal normale flusso
  valida → conferma → applica → consuma-carta-e-tolleranza (A2), identico a
  ogni altra carta. **Un solo progetto contemporaneo iniziale**; uno slot
  aggiuntivo si sblocca con la tecnologia "Pianificazione progetti"
  (Logistica). I progetti non avanzano mentre la simulazione e' in pausa
  (il motore non chiama affatto `integrate()` in quel caso, A3).
- **Bonus globali ricalcolati dalla lista di tecnologie completate**
  (`calcolaBonusRicerca`, mai persistiti separatamente: zero rischio di
  disallineamento): estrazione mineraria, velocita' di raffinazione,
  capacita' massima della mano di carte, intervallo di generazione passiva
  delle carte (fino a un minimo di 2 minuti, B2), raggio del fog of war,
  velocita' delle navette, costi operativi dei contratti minerari, numero
  di linee di raffinazione concorrenti, slot modulo per nave mineraria.
- **Seconda nave mineraria acquistabile** (`src/simulation/fleet.ts`): 1.000
  Cr (confermato, B2) + ferro raffinato in stiva (quantita' provvisoria:
  il documento non la specifica); azione libera, senza carta (B2: "acquisto
  nave... non richiede carte"). Il pannello Flotta elenca automaticamente
  tutte le navi minerarie possedute.
- **Moduli craftabili** (`src/domain/modules.ts`, `src/simulation/modules.ts`):
  richiedono una fabbrica costruita, costo in crediti + risorsa raffinata;
  ogni istanza craftata e' un oggetto a se' stante (id univoco), posseduta
  "in magazzino" finche' non equipaggiata. **Uno slot per nave mineraria
  iniziale, fino a due slot aggiuntivi via ricerca** (B2: "massimo due via
  ricerca" — qui due tecnologie distinte, una per ramo Logistica e una per
  ramo Economia, concedono +1 slot ciascuna). Equip/unequip e' reversibile
  e garantisce l'unicita' dell'assegnazione: un'istanza equipaggiata su una
  nave non puo' essere equipaggiata su un'altra finche' non viene rimossa
  (verificato con test dedicati di "collisione inventario"). Il bonus di
  estrazione di un modulo viene sommato a quello di una nave mineraria solo
  al momento della creazione di un nuovo contratto (IND-01): equipaggiare
  un modulo dopo che un contratto e' gia' avviato non ha effetto
  retroattivo su quel contratto specifico, coerente con la natura fisica
  dell'equipaggiamento.
- **Persistenza**: `GameState.ricerca` (progetti attivi, tecnologie
  completate) e `GameState.moduli` (istanze craftate, equipaggiate o in
  magazzino) sono parte dello stato serializzato come ogni altro campo,
  quindi gia' coperti dall'autosave/export-import esistenti (Macrostep 5)
  senza bisogno di codice di persistenza dedicato.
- **Test dedicati**: prerequisiti mancanti/soddisfatti, limite di slot di
  ricerca contemporanei e di slot modulo per nave ("limite livello"),
  collisione d'inventario nell'equipaggiamento moduli, ricerca che non
  avanza durante la pausa, idempotenza del comando `ui/giocaCarta` per
  RSH-01 (stesso id ripetuto non avvia due volte lo stesso progetto ne'
  consuma due carte).

## Implementato al Macrostep 8 (iperspazio e regioni multiple)

- **Tecnologia Iperspazio** (`src/domain/research.ts`, tech `ESP-04` nel ramo
  Esplorazione, prerequisito "Catalogazione avanzata"): sblocca l'uso della
  nuova **carta Iperspazio (IPS-01)** — in mano iniziale no, reperibile
  come le altre carte "future" (generazione passiva, mercato carte,
  missioni), coerente con B2. Il salto resta bloccato finche' la
  tecnologia non e' completata, **indipendentemente dallo stato delle
  revisioni** (B6): nessun collegamento tra quota dovuta/tolleranza e
  possibilita' di saltare.
- **Costo confermato**: 60 carburante (B6). **Carta e carburante vengono
  consumati solo quando il salto avviene davvero**: la carta Iperspazio
  passa dallo stesso identico flusso di ogni altra carta (valida → mostra
  ConfirmModal → conferma → applica atomicamente, A2); Annulla o Esc non
  consumano nulla, per costruzione (nessun codice "di preparazione"
  separato che agisca prima della conferma).
- **Anteprima pre-salto** (`src/world/hyperspacePreview.ts`,
  `generaAnteprimaRegione`): mostrata nella stessa ConfirmModal del gioco
  carta, calcola la regione candidata dallo stesso seed deterministico che
  il salto userebbe davvero (`${seed}|regione${N}`), quindi l'anteprima
  **coincide esattamente** con cio' che si otterrebbe saltando — ma riporta
  solo aggregati (numero di corpi, ricchezza approssimata a 3 livelli,
  numero di campi relitti come indicatore di rischio), **senza rivelare
  posizioni o nomi dei pianeti** (B6). Nessuna "presenza di civilta'" da
  segnalare in questo macrostep: le civilta' arrivano al Macrostep 9.
- **Avviso esplicito su missioni/opportunita' perse**: la stessa modale
  conta e mostra quante missioni (attive + disponibili) e quanti contratti
  minerari attivi andranno persi/interrotti prima di confermare.
- **Esecuzione del salto** (`src/simulation/hyperspace.ts`,
  `applicaSaltoIperspaziale`): genera la nuova regione e un nuovo set di
  20-30 missioni (stesso generatore del Macrostep 6) dallo stesso seed
  gia' usato per l'anteprima; interrompe tutti i contratti minerari attivi
  e libera le navi minerarie; richiama tutte le navette (tornano "libere"
  all'origine della nuova regione), **trasferendo nella stiva della nave
  madre il materiale gia' fisicamente a bordo di ciascuna navetta**, con lo
  stesso principio di scarico parziale/mai duplicato usato altrove se la
  stiva e' piena; il materiale ancora depositato nei contratti (non ancora
  ritirato da una navetta) **va perso per abbandono**, nessuna vendita
  implicita (B6). Nave madre riportata all'origine, orientamento/velocita'/
  percorso azzerati.
- **Trasferito alla nuova regione** ("progressione globale", B6): crediti,
  mano di carte, fiducia/stato revisione, tecnologie di ricerca completate
  e progetti attivi, moduli posseduti/equipaggiati, navi minerarie e
  navette (col cargo gia' trasferito), fabbrica e coda di produzione,
  contabilita'. **Restano nella vecchia regione** (B6): pianeti/giacimenti,
  campi relitti, area sicura, missioni (sostituite interamente da quelle
  nuove — nessun archivio storico delle vecchie missioni e' mantenuto,
  scelta di scope: il documento non richiede di poter rivedere regioni
  passate).
- **`GameState.numeroRegione`**: 1 alla creazione della carriera,
  incrementato a ogni salto; usato per derivare deterministicamente il
  seed della regione successiva. Fa gia' parte dello stato serializzato,
  quindi coperto dall'autosave/export-import esistenti senza codice di
  persistenza dedicato — **verificato manualmente**: un salvataggio
  preparato con la tecnologia sbloccata e la carta in mano, ricaricato
  (simulando un refresh nel momento della preparazione), riprende
  correttamente dallo stato pre-salto; dopo il salto lo stato risultante
  resta valido (`validaStato`) e supera un round-trip JSON identico a
  quello del salvataggio reale.
- **Test dedicati**: rifiuto senza tecnologia/carburante, anteprima
  deterministica e coerente col salto reale, incremento di
  `numeroRegione`, nuove missioni, posizione nave madre azzerata,
  interruzione contratti, trasferimento cargo navette con gestione
  dell'eccedenza a stiva piena (nessuna perdita ne' duplicazione),
  persistenza di crediti/carte/fiducia/moduli/ricerca, validita' dello
  stato post-salto, idempotenza del comando (stesso id ripetuto non
  consuma due volte carta/carburante ne' avanza due volte di regione).

## Implementato al Macrostep 9 (civilta', anomalie, eventi)

- **Civilta' locali alla regione** (`src/domain/civilizations.ts`,
  `src/world/regionGenerator.ts`, `src/simulation/civilizations.ts`): 1-3
  per regione, generate e scoperte via fog of war come pianeti/relitti;
  relazione 0-100 **locale alla regione** (B9: "nessun punteggio
  reputazione galattica obbligatorio" — infatti la relazione non
  sopravvive a un salto iperspaziale, la nuova regione ha le sue civilta').
  Una richiesta di consegna attiva (0-70% di probabilita' alla
  generazione), tracciata automaticamente come le missioni (B5):
  completarla assegna crediti + relazione e puo' generarne una nuova dopo
  un po'. **Bonus commerciali** (B9): oltre una soglia di relazione,
  vendere direttamente a una civilta' frutta un prezzo migliore del
  mercato generico. **Diplomazia** (B9): un dono diretto in crediti
  converte in relazione (azione libera, senza carta) o la carta rara
  Diplomazia lampo (bersaglio "civiltaScoperta", scelto nel pannello
  Civilta', non sulla mappa) per un salto diretto e consistente — mai un
  generico bonus percentuale.
- **Pericoli regionali** (`src/domain/hazards.ts`,
  `src/simulation/hazards.ts`): tempeste, campi gravitazionali, radiazioni
  (B9: "rischi con avvisi proporzionati"), scoperti via fog of war con una
  notifica di livello proporzionato all'intensita' (critico se >=70%).
  Effetto continuo finche' la nave madre resta nella zona, **mai
  distruttivo di per se'**: le tempeste consumano carburante extra
  (indipendente dal movimento), i campi gravitazionali riducono la
  velocita' massima (calcolato dal motore a ogni sub-step, mai persistito:
  cessa esattamente uscendo dalla zona), le radiazioni erodono lentamente
  la fiducia. La carta rara Fuga d'emergenza (bersaglio "nessuno") da'
  un'immunita' temporanea a tutti i pericoli attivi — un'azione originale
  legata alla situazione, non un bonus statistico generico.
- **Pirateria senza combattimento** (B9: "pedaggi, furti limitati,
  sabotaggi, fuga; navi distrutte solo in eventi estremi e annunciati; nave
  madre mai distrutta"): implementata come categoria di evento periodico
  (vedi sotto) con conseguenze reali e dichiarate prima della scelta — mai
  un dado nascosto. L'esito piu' grave (perdita di una nave mineraria) e'
  isolato in un singolo evento **critico**, chiaramente annunciato come
  tale, e resta una scelta esplicita del giocatore tra alternative (pagare,
  sacrificare carico, rischiare la nave) mai imposta automaticamente. La
  nave madre non puo' mai essere persa: nessun effetto di gioco la tocca.
- **Eventi periodici** (`src/domain/events.ts`, `src/simulation/events.ts`):
  10 definizioni su 5 categorie (aziendale, economico, diplomatico,
  misterioso, pirateria), generati **circa ogni 8-10 carte giocate**
  (soglia casuale rigenerata a ogni evento, B9, confermato), fino a 3
  eventi attivi contemporaneamente. **Ordinari, non modali** (B9): restano
  nel pannello Eventi, consultabili o ignorabili senza penalita' oltre a
  perdere l'opportunita'. **Critici, invece, sospendono** con una modale
  dedicata (`EventoCriticoModal`, stesso stile visivo di ConfirmModal ma
  senza un'opzione "Annulla" generica: un evento critico richiede sempre
  una scelta esplicita tra conseguenze reali). Ogni scelta ha un effetto
  concreto e implementato (crediti, fiducia, relazione con la civilta'
  scoperta piu' vicina, furto di una percentuale del carico, sabotaggio di
  un contratto attivo, perdita di una nave mineraria) — **mai un generico
  "+X%" travestito da scelta** (B9).
- **Due carte rare** (B9: "carte rare che consentono azioni originali"):
  Diplomazia lampo (RAR-01, bersaglio civilta' scoperta) e Fuga
  d'emergenza (RAR-02, bersaglio nessuno) — entrambe azioni puntuali e
  situazionali, non reperibili al mercato generico delle carte (solo da
  missioni/eventi/generazione passiva), coerenti col principio di non
  essere "semplici bonus percentuali travestiti".
- **Bug reale trovato e corretto durante la verifica manuale**: il
  contatore di id delle notifiche (`notif-N`) era una variabile
  module-level azzerata a ogni caricamento di pagina; riprendendo un
  salvataggio che gia' conteneva notifiche, le nuove notifiche
  riutilizzavano id gia' esistenti (es. due "notif-1"), causando chiavi
  React duplicate. Corretto rendendo il contatore un campo di istanza del
  motore, inizializzato (sia nel costruttore sia in `caricaStato`) dal
  massimo id gia' presente nello stato di partenza — mai piu' una fonte di
  verita' separata che puo' disallinearsi. Coperto da 3 test dedicati in
  `tests/simulationEngine.test.ts`.

## Implementato al Macrostep 10 (campagna narrativa a 5 capitoli)

- **5 capitoli data-driven** (`src/domain/narrative.ts`, titoli confermati
  da B7): "Benvenuto nella famiglia OmniProfit™", "Espansione non
  autorizzata", "Il dipartimento delle anomalie", "Il costo del successo",
  "Il profitto è eterno". 14 scene totali, ciascuna con un mittente
  (B.O.B., Rag. Zarg o Direzione OmniProfit™) e un testo satirico coerente
  col tono gia' stabilito nel resto del gioco. Ogni scena si sblocca
  osservando (in sola lettura) condizioni gia' esistenti nello stato di
  gioco — missioni completate, tecnologie di ricerca completate, crediti
  accumulati, un pianeta anomalo investigato, un pericolo regionale
  scoperto — **mai introducendo nuove regole nel motore di simulazione**
  (B10, confermato: "integrare la campagna senza alterare la simulation
  engine"). La scena attiva non e' mai persistita a parte: ricalcolata ogni
  volta dalla lista di scene gia' completate, stessa filosofia gia' usata
  per i bonus di ricerca (nessuna fonte di verita' duplicata che possa
  disallinearsi).
- **Scelte con conseguenze reali** (`src/simulation/narrative.ts`): quattro
  delle 14 scene offrono una decisione (le altre sono informative, un solo
  pulsante "Continua"); ogni scelta assegna punti a uno dei tre assi di
  allineamento narrativo (lealta', indipendenza, ribellione) o, in un caso,
  crediti — mai un generico "+X%" travestito da narrativa.
- **Quattro finali principali + un epilogo segreto opzionale** (B7,
  confermato): il finale si calcola alla risoluzione dell'ultima scena
  (capitolo 5), confrontando i tre assi di allineamento — vince quello piu'
  alto (promozione aziendale / indipendenza economica / ribellione ed
  esposizione) — a meno che la **fiducia** al momento del finale sia sotto
  una soglia critica (allora "liquidazione narrativa" sovrasta qualunque
  scelta, riusando un segnale di rischio gia' esistente nel gioco invece di
  inventarne uno nuovo) o i tre assi risultino tutti vicini tra loro
  (sblocca l'epilogo segreto "L'algoritmo indeciso", raggiungibile solo con
  scelte deliberatamente miste lungo tutta la campagna).
- **Non modale, tranne il finale**: la scena narrativa attiva appare nel
  pannello laterale (`NarrativePanel`, sopra il pannello Pianeta) come un
  elemento tra gli altri, mai bloccante — coerente con B10 che non richiede
  l'opposto e con la scelta gia' fatta per gli eventi ordinari (Macrostep
  9). Il finale invece usa una schermata dedicata (`EndingOverlay`, stesso
  stile visivo di Game Over) per dargli il peso narrativo che merita, ma
  **non blocca la partita**: e' dismissibile con "Continua a giocare" (la
  modalita' infinita post-campagna arriva solo al Macrostep 11) e non
  ricompare dopo la chiusura (stato locale non persistito, come gia' fatto
  per la guida introduttiva).
- **Comportamento verificato (non un bug)**: un salvataggio IndexedDB creato
  prima di questo macrostep non contiene il nuovo campo `campagna`;
  caricandolo, `validaStato` solleva un'eccezione invece di restituire un
  elenco di problemi, intercettata dal `.catch()` generico di
  `EngineContext` — il motore ripiega correttamente su una nuova partita
  anziche' crashare. Confermato con una verifica manuale dedicata durante
  questo macrostep; nessuna modifica necessaria.

## Implementato al Macrostep 11 (fine carriera, roguelite, infinito, presentazione)

Ultimo macrostep della roadmap (`Galactic_Profit_Inc_Prompt_Sviluppo_Macrostep.md`,
sezioni C-G): con questo macrostep il gioco copre l'intero percorso 0.0→1.0
descritto dal documento di design.

- **Modalita' infinita dopo la campagna, senza nuovo codice dedicato**
  (B11: "modalita' infinita dopo campagna con nuovi settori e incarichi"):
  nulla nel gioco si ferma al finale — `EndingOverlay` e' dismissibile e
  non blocca la partita (Macrostep 10); i "nuovi settori" sono le regioni
  generate dal salto iperspaziale gia' implementato (Macrostep 8, senza
  limite al numero di salti), e i "nuovi incarichi" sono il set di 20-30
  missioni generato per ogni nuova regione (Macrostep 6). Scelta
  deliberata di riuso invece di un sistema parallelo: i due meccanismi gia'
  esistenti soddisfano il requisito senza duplicare logica.
- **Contesto aziendale adattato ai finali indipendenti/ribelli** (B11:
  "senza contraddizioni narrative"): il marchio mostrato in cima
  all'interfaccia (`TopBar`, tramite `brandingPostCampagna` in
  `src/domain/narrative.ts`) cambia in base al finale raggiunto — resta
  "OMNIPROFIT" solo per lealta' ed epilogo segreto, diventa "OPERATORE
  INDIPENDENTE" per l'indipendenza, "TESTIMONE" per la ribellione,
  "CONTRATTO LIQUIDATO" per la liquidazione — cosi' l'interfaccia non
  continua a presentare un'affiliazione aziendale che la narrativa ha gia'
  smentito.
- **Nuova carriera dopo Game Over, con vantaggio ereditato** (B11,
  confermato: "scelta di 1 tra 3 piccoli vantaggi casuali ereditati"):
  `GameOverOverlay` propone 3 dei 4 vantaggi definiti (`src/domain/legacy.ts`,
  sorteggio deterministico dal seed della carriera appena conclusa);
  scelto uno, applicato una sola volta alla creazione del nuovo stato
  iniziale (`creaStatoIniziale(seed, vantaggioId)`), mai un effetto che si
  accumula partita dopo partita. La nuova carriera parte senza un reload
  di pagina (`engine.caricaStato`).
- **Archivio direttori** (B11: "archivio direttori, statistiche, traguardi
  persistenti"): prima di iniziare la nuova carriera, quella conclusa viene
  archiviata in un secondo object store IndexedDB (`direttori`, separato da
  `saves`: la carriera finita non e' piu' giocabile, resta solo come
  record), con seed, data, finale narrativo (se raggiunto) o Game Over, e
  statistiche (crediti finali, regioni visitate, carte giocate, revisioni
  pagate, tempo di servizio). Consultabile in sola lettura dal pannello
  Salvataggio (`DirectorArchivePanel`), caricato su richiesta. **Una sola
  carriera attiva** resta garantito strutturalmente: lo store `saves` ha
  sempre un'unica chiave (`carriera-attiva`, gia' dal Macrostep 5).
- **Audio sintetizzato** (B11: "audio originale di atmosfera, feedback UI,
  mute/volumi separati"): nessun asset audio e' stato fornito dall'utente,
  quindi — stesso principio A1 gia' applicato ai placeholder grafici —
  l'audio e' generato via Web Audio API (`src/audio/audioEngine.ts`): un
  drone atmosferico continuo a bassissimo volume, brevi toni sintetizzati
  per il feedback (conferma/annulla di ogni `ConfirmModal`, nuove
  notifiche con intensita' proporzionata al livello). Muto generale e due
  volumi indipendenti (musica/effetti), impostazioni di dispositivo in
  localStorage, **mai** nello stato di partita. Il motore di simulazione
  non importa mai questo modulo: l'audio resta sempre un effetto
  collaterale della UI, coerente con l'architettura stabilita fin dal
  Macrostep 0. Degrada a no-op silenzioso se `AudioContext` non esiste
  (stesso pattern gia' usato per IndexedDB).
- **LOD leggero sul rendering dei pianeti** (B11: "ottimizzazione
  shader/LOD"): sotto una soglia di zoom della camera, alone e atmosfera
  dei pianeti si nascondono e smettono di aggiornarsi ogni frame
  (`src/render/planetSprite.ts`), un risparmio reale su regioni con fino a
  100 pianeti quando la mappa e' vista da lontano, dove quei dettagli non
  sarebbero comunque percepibili. La superficie procedurale resta sempre
  visibile e aggiornata.
- **Riduzione del motion e accessibilita' di base**: `@media
  (prefers-reduced-motion: reduce)` era gia' presente globalmente
  (`src/index.css`, introdotto prima di questo macrostep) e azzera
  transizioni/animazioni quando richiesto dal sistema operativo (A1);
  l'intera UI usa gia' `aria-label`/`aria-modal`/`role` sistematicamente e
  Esc per chiudere le modali — verificato qui, non aggiunto ex novo.
- **Salvataggi versionati** (B11: "salvataggi versionati"):
  `SAVE_SCHEMA_VERSION` incrementato a 2 in occasione dell'aggiunta del
  secondo object store; la strategia di compatibilita' resta quella scelta
  fin dal Macrostep 5 — validazione strutturale (`validaStato`) invece di
  migrazioni campo-per-campo — gia' verificata sicura in pratica durante lo
  sviluppo (un salvataggio di schema incompatibile viene scartato e
  sostituito da una carriera nuova, mai un crash, vedi Macrostep 10).
- **Test di regressione completa** (B11, G2): suite dedicata
  (`tests/regressionG2.test.ts`) che verifica esplicitamente i punti della
  checklist G2 non ancora coperti da un test dedicato in un file
  specifico: determinismo stesso-seed-stessa-sequenza su un motore intero,
  contratto sospeso senza debiti invisibili, prezzi di mercato fermi
  durante la pausa, nessuna duplicazione di stato al "ricaricamento"
  (`caricaStato`), un evento critico che non sblocca una pausa volontaria
  preesistente. Gli altri punti di G2 erano gia' coperti nei file di test
  dei rispettivi sistemi (navette, fabbrica, revisione, iperspazio) o
  verificati manualmente nel browser (drag & drop, click su
  pianeta/mappa) durante i macrostep in cui quei sistemi sono stati
  introdotti.
- **268 test automatici in totale**, lint e typecheck senza errori, build
  statica verificata.

## Limiti noti di questa versione

- **Nave mineraria senza posizione/sprite proprio**: non vola ancora sulla
  mappa (si assume "sul posto" del contratto); un suo sprite dedicato e'
  rimandato a un prossimo macrostep.
- **Raggio di visibilita' della nave madre e raggio di Esplora separati**:
  oggi sono due costanti indipendenti non ancora armonizzate/bilanciate
  insieme con playtest reale.
- **Minimappa assente**: il documento la rende opzionale "solo se non
  distrae"; non implementata per restare nello scope.
- **Linee di produzione**: una base, espandibile a due con la tecnologia
  "Seconda linea di produzione" (Macrostep 7); un'ulteriore espansione resta
  possibile in futuro ma non e' richiesta dal documento.
- **Prestiti non implementati** (vedi sopra): deliberatamente rimandati,
  con lo stato predisposto per restare compatibile quando arriveranno.
- **Nessun limite massimo al numero di navi minerarie acquistabili**: il
  documento specifica solo il costo della "seconda" nave, non un tetto
  complessivo; per ora l'acquisto resta ripetibile finche' ci sono risorse.
- **Moduli con un solo effetto (bonus di estrazione)**: il documento non
  specifica altri tipi di effetto modulo; l'architettura (`ModuloDefinition`)
  resta comunque estendibile a futuri tipi di bonus senza modifiche
  strutturali.
- **Persistenza non testabile in automatico**: l'ambiente di test (jsdom)
  non implementa `IndexedDB`; l'adapter degrada correttamente (verificato
  con test dedicati) ma il round-trip reale e' stato verificato
  manualmente nel browser (salvataggio, ricarica pagina, ripresa esatta
  dello stato — incluso un caso con la nave madre a meta' carburante).
- **Nessun archivio delle regioni/missioni passate**: dopo un salto
  iperspaziale le missioni della vecchia regione sono sostituite, non
  conservate in uno storico consultabile; il documento non richiede di
  poter rivedere una regione abbandonata, quindi non e' stata aggiunta
  nessuna struttura dati solo per questo.
- **Nessun limite al numero di salti iperspaziali**: ogni salto richiede
  comunque tecnologia (gia' completata) + carta + 60 carburante, quindi il
  costo reale e' la disponibilita' di carte Iperspazio e carburante, non un
  tetto esplicito.
- **"Presenza di civilta'" nell'anteprima pre-salto ancora non mostrata**:
  l'anteprima (`generaAnteprimaRegione`, Macrostep 8) riporta ricchezza e
  campi relitti ma non il numero di civilta' della regione candidata, pur
  esistendo ora (Macrostep 9); un'estensione naturale, rimandata per
  restare nello scope della richiesta originale del Macrostep 8.
- **Nessuna rappresentazione grafica di civilta'/pericoli sulla mappa**: a
  differenza di pianeti/relitti, civilta' e pericoli regionali non hanno
  ancora uno sprite PixiJS dedicato; sono scoperti via fog of war
  (notifica, pannelli laterali) ma non visibili direttamente sulla mappa,
  stesso trattamento gia' riservato alla nave mineraria (Macrostep 2).
- **Richieste delle civilta' per una sola risorsa alla volta**: una
  civilta' ha al massimo una richiesta attiva; il documento non specifica
  diversamente, e tenerne una sola mantiene il pannello leggibile.
- **Pirateria come categoria di evento, non sistema a parte**: B9 descrive
  i pirati con un certo dettaglio ("pedaggi, furti limitati, sabotaggi,
  fuga"); qui sono modellati come una delle categorie di evento periodico
  (vedi sopra) invece che come incontri dedicati con una propria logica di
  spawn/inseguimento sulla mappa, scelta che rispetta "senza combattimento"
  e "navi distrutte solo in eventi estremi e annunciati" senza aggiungere
  una seconda macchina a stati parallela a quella degli eventi.
- **Campagna lineare, senza missioni narrative "ramificate" sulla mappa**:
  le 14 scene si sbloccano osservando condizioni di stato gia' esistenti
  (B10: "incardinate su scoperte, economia e decisioni"), non creano nuovi
  obiettivi sulla mappa (bersagli, pianeti dedicati) come le missioni
  ordinarie; il documento chiede esplicitamente di non alterare il motore
  di simulazione, e questa scelta rispetta il vincolo restando un livello
  di osservazione sopra ai sistemi esistenti.
- **Un solo percorso di scelte per playthrough**: una volta completata, una
  scena resta completata per sempre in quella carriera (coerente con "una
  carriera attiva alla volta", B7); rivedere scelte precedenti o esplorare
  rami alternativi richiede una nuova carriera. L'archivio direttori
  (Macrostep 11) registra statistiche aggregate di ogni carriera conclusa,
  non un log scena-per-scena delle scelte fatte.
- **L'anteprima pre-salto iperspaziale non menziona lo stato della
  campagna**: un salto non altera ne' interrompe la campagna (le scene
  dipendono da condizioni "globali" come crediti/ricerca, non da missioni
  regionali), quindi non c'era un avviso specifico da aggiungere; la
  civilta' coinvolta in una scelta diplomatica resta "quella scoperta piu'
  vicina al momento della scelta", che dopo un salto sara' quella della
  nuova regione.
- **Audio interamente sintetizzato, nessun asset composto**: B11 chiede
  "audio originale"; qui "originale" e' soddisfatto nel senso che non e'
  preso da librerie terze (generato via oscillatori Web Audio API), ma
  resta un placeholder funzionale — toni semplici, non una composizione
  musicale — coerente con l'assenza di asset audio forniti dall'utente
  (stesso trattamento gia' riservato alla grafica, A1/A5).
- **LOD limitato ai dettagli secondari dei pianeti**: non tocca navi,
  navette, civilta' o pericoli (nessuno di questi ha ancora uno sprite
  dedicato sulla mappa, vedi limiti dei Macrostep 2/9); un'estensione
  naturale se in futuro venissero aggiunti.
- **Nessuna migrazione campo-per-campo dei salvataggi**: la strategia di
  versionamento scelta (validazione strutturale invece di trasformazioni
  esplicite tra schemi) significa che un salvataggio di uno schema
  precedente non viene "aggiornato" ma sostituito da una carriera nuova;
  scelta deliberata per semplicita' (il documento non richiede di
  preservare le carriere tra versioni del gioco), verificata sicura in
  pratica (nessun crash, nessuno stato corrotto).
- **Compatibilita' browser**: il gioco punta ai browser evergreen moderni
  (Chrome/Edge/Firefox/Safari aggiornati) che supportano IndexedDB,
  Web Audio API e Canvas/WebGL (per PixiJS); dove un'API non e' disponibile
  il gioco degrada senza crash (nessun salvataggio persistente, nessun
  audio) ma resta giocabile, secondo lo stesso principio gia' applicato
  sistematicamente dal Macrostep 5 in poi. Nessun test automatizzato
  cross-browser e' stato eseguito (fuori portata di questo ambiente di
  sviluppo); la build statica (`npm run build`) non usa funzionalita'
  sperimentali o prefissate a un singolo motore browser.
- **Distribuzione statica**: `npm run build` produce `dist/` come sito
  completamente statico (HTML/JS/CSS), pubblicabile su qualunque hosting
  che serva file statici (GitHub Pages, Netlify, Vercel, S3+CDN, un
  semplice server HTTP) senza alcuna configurazione server-side; vedi la
  sezione "Distribuzione" in `README.md`.

## Parametri DA BILANCIARE in questo macrostep

Vedi `docs/balance.json` (sezioni `mothership`, `navette`, `mondo`, `carte`,
`fabbrica`, `raffinazione`, `mercato`, `revisioni`, `missioni`, `ricerca`,
`iperspazio`, `civilta`, `pericoli`, `eventi`, `carteRare`, `campagna`,
`vantaggiEreditati`, `audio`, `rendering`) per i valori con flag
`confermato: false`. In particolare i prezzi base del mercato sono gli
stessi valori PROPOSTI (non approvati) nel documento di design (B3); la
formula della quota adattiva e' un'euristica provvisoria, come richiesto
esplicitamente dal documento; le sezioni `missioni`, `civilta`, `pericoli`,
`eventi`, `carteRare`, `campagna`, `vantaggiEreditati`, `audio` e
`rendering` (conteggi, distribuzioni, soglie, costi/effetti, condizioni di
sblocco) sono interamente stimate, dato che il documento fissa solo il
principio generale e non valori numerici.
