# Galactic Profit Inc.

Gestionale economico/strategico spaziale, single player, per browser. Nessun
backend a runtime: build statica distribuibile su qualunque hosting
HTML/JS. Sviluppo guidato dal documento di design
`Galactic_Profit_Inc_Prompt_Sviluppo_Macrostep.md` (fornito dall'utente).

**Stato attuale: fine Macrostep 11 — Fine carriera, roguelite, infinito,
presentazione.** Ultimo macrostep della roadmap descritta dal documento di
design: il gioco copre l'intero percorso 0.0→1.0 (scaffold → universo
procedurale → navi/logistica → carte → fabbrica → economia/revisioni →
tutorial/missioni → ricerca/flotta → iperspazio → civilta'/eventi →
campagna narrativa → fine carriera/roguelite/polish). Possibili sviluppi
ulteriori (bilanciamento con playtest reale, asset grafici/audio definitivi,
minimappa opzionale) restano fuori da questo documento, che segue solo i
macrostep elencati nel prompt di sviluppo originale.

## Avvio

```bash
npm install
npm run dev       # sviluppo, http://localhost:5173
npm run build     # build statica in dist/
npm run preview   # serve la build statica per verifica locale
npm run test      # test unitari/integrati (vitest)
npm run typecheck # controllo tipi TypeScript
npm run lint      # oxlint
```

## Architettura

```
src/
  domain/        tipi, RNG a seed, archetipi pianeta, definizioni/parametri carte,
                   ricette di raffinazione, prezzi di mercato, albero di ricerca,
                   moduli nave, costanti iperspazio, civilta', pericoli regionali,
                   eventi periodici, campagna narrativa, vantaggi ereditati,
                   stato iniziale validato
  simulation/     motore (tick, command bus, fog of war, fisica nave madre),
                   pathfinding anti-ostacolo, logistica navette/estrazione,
                   effetti delle carte, fabbrica/raffinazione, economia/mercato/
                   revisioni aziendali, missioni, mercato carte, ricerca, flotta,
                   moduli, salto iperspaziale, civilta', pericoli, eventi,
                   campagna narrativa (tutte funzioni pure)
  world/          generatore di regione seed-based (pianeti, relitti, civilta',
                   pericoli, nomi, colori), generatore di missioni, anteprima
                   pre-salto iperspaziale
  render/         vista mappa PixiJS (pan/zoom/click/drag&drop), rendering
                   procedurale pianeti con LOD in base allo zoom
  audio/          motore audio sintetizzato (Web Audio API): atmosfera,
                   feedback UI, mute/volumi separati
  ui/             shell React: top bar (marchio adattato al finale raggiunto),
                   banner revisione, pannelli (flotta, fabbrica, mercato,
                   mercato carte, missioni, ricerca, moduli, civilta', eventi,
                   campagna, audio, salvataggio + archivio direttori, pianeta,
                   comandi), modale evento critico, schermata finale campagna,
                   guida introduttiva non invasiva, mano carte, log, modali,
                   schermata Game Over con scelta del vantaggio ereditato
  persistence/    adapter IndexedDB (autosave, resume, import/export JSON,
                   archivio direttori di carriere concluse)
  assets/reference/  immagini originali fornite dall'utente (pianeti, template
                      carte, navi): sorgente per gli sprite reali in assets/sprites/
                      (vedi "Asset grafici") e, dove non esiste uno sprite
                      derivato, riferimento per la direzione artistica procedurale
  assets/sprites/    sprite raster derivati dai riferimenti via scripts/process_*.py
                      (pianeti ritagliati a cerchio, navi con sfondo rimosso),
                      importati direttamente nel rendering
docs/
  game-rules.md   regole confermate e limiti della versione corrente
  balance.json    parametri di bilanciamento, con flag confermato/provvisorio
tests/            test vitest (motore, RNG, stato iniziale, mondo, pathfinding,
                   logistica navette, effetti carte, fabbrica/raffinazione,
                   economia/mercato/revisioni, Game Over, persistenza, missioni,
                   mercato carte, ricerca, flotta, moduli, iperspazio, civilta',
                   pericoli, eventi, carte rare, campagna narrativa, vantaggi
                   ereditati, audio, regressione G2, componenti UI)
```

Separazione architetturale rispettata: il motore (`src/simulation`), il
dominio (`src/domain`) e il generatore di mondo (`src/world`) non importano
React ne' PixiJS e sono testabili senza aprire un browser — inclusa tutta
la logistica navette/estrazione, la logica delle carte, la coda di
raffinazione e l'intera economia (mercato, revisioni, Game Over), scritte
come funzioni pure (stato -> nuovo stato).

## Cosa funziona

- Shell applicativa dark sci-fi completa: top bar, banner di revisione
  aziendale, mappa centrale, pannelli laterali (mercato, pianeta, flotta,
  fabbrica, salvataggio, comandi), mano carte sempre visibile in basso,
  registro notifiche, pulsanti Pausa e Ricentra, schermata di Game Over.
- Stato di partita iniziale validato (B1/B2): 2.000 Cr, una nave mineraria,
  due navette da 40 unita', nave madre stiva 500 / serbatoio 150, mano di
  5 carte esatte.
- Motore di simulazione indipendente da React/PixiJS, tick a sub-step
  fissi, pausa che congela l'orologio simulato, command bus tipizzato con
  flusso valida → applica atomicamente → notifica.
- Regione procedurale seed-based, fog of war persistente, rendering
  procedurale dei pianeti, fisica della nave madre con pathfinding
  anti-ostacolo, soccorso carburante, logistica navette e contratti
  minerari, carte giocabili per drag & drop o click-carta/click-bersaglio
  con conferma obbligatoria, generazione passiva di carte, fabbrica e coda
  di raffinazione.
- **Mercato e revisioni aziendali (nuovo)**: acquisto/vendita manuali di
  qualunque risorsa (grezza, raffinata, carburante), quantita' intere,
  saldo mai negativo, prezzi che fluttuano gradualmente entro ±20% ogni 5
  minuti di tempo attivo. Prima revisione esattamente alla 40ª carta
  giocata, quota 600 Cr pagabile anche dal capitale iniziale, 5 carte di
  tolleranza se non pagata, Game Over allo scadere senza pagamento. Quota
  adattiva per le revisioni successive basata sull'utile recente.
  Contabilita' separata (ricavi/spese/debito, quest'ultimo mai popolato:
  i prestiti restano esplicitamente fuori scope, vedi `docs/game-rules.md`).
- **Salvataggio IndexedDB (nuovo)**: autosave ogni 30s di tempo reale a
  pagina aperta + su eventi importanti (Game Over, pagamento quota);
  ripresa automatica all'avvio senza mai simulare il tempo trascorso a
  pagina chiusa; esporta/importa salvataggio come JSON dal pannello
  dedicato, con validazione prima di sostituire la partita corrente.
- **Tutorial, missioni e mercato carte (nuovo)**: guida introduttiva
  flottante non invasiva a 5 passi, sempre richiudibile; generatore di
  20-30 missioni per regione (4 introduttive con 1 carta di ricompensa
  garantita ciascuna, 1 missione principale attiva dall'inizio, fino a 3
  secondarie attive scelte dal giocatore), completamento automatico degli
  obiettivi con assegnazione della ricompensa; mercato carte con 5 slot a
  prezzo fisso, rotazione ogni 15 minuti di tempo attivo, acquisto diretto
  bloccato solo a mano piena (non a ricompensa).
- **Ricerca, upgrade e flotta (nuovo)**: quattro rami di ricerca
  (Esplorazione/Industria/Logistica/Economia, 12 tecnologie), ogni ricerca
  richiede una carta Ricerca giocata, un solo progetto contemporaneo
  iniziale (sbloccabile uno in piu' via ricerca); bonus globali a
  estrazione, velocita' di raffinazione, capacita' mano, intervallo
  generazione carte, raggio fog of war, velocita' navette, costi operativi,
  linee di raffinazione; seconda nave mineraria acquistabile; moduli
  craftabili in fabbrica, equipaggiabili/rimovibili con slot limitati per
  nave (uno iniziale, fino a due in piu' via ricerca) e unicita' garantita.
- **Iperspazio e regioni multiple (nuovo)**: tecnologia dedicata (ramo
  Esplorazione) sblocca la carta Iperspazio; salto a 60 carburante,
  indipendente dalle revisioni, irreversibile. Anteprima pre-salto
  (ricchezza, numero corpi, campi relitti) calcolata dalla stessa regione
  deterministica che si otterrebbe saltando, senza rivelarne posizioni o
  nomi; avviso esplicito su missioni/contratti che andranno persi. Al
  salto: contratti interrotti, navette richiamate con trasferimento del
  cargo gia' a bordo nella stiva (nessuna perdita ne' duplicazione),
  nuova regione e nuovo set di missioni generati, mentre crediti, carte,
  fiducia, ricerca completata, moduli e flotta restano della carriera.
- **Civilta', pericoli ed eventi (nuovo)**: 1-3 civilta' locali per
  regione (relazione 0-100, nessuna reputazione galattica), richieste di
  consegna tracciate automaticamente, bonus commerciale oltre una soglia
  di relazione, dono diplomatico diretto. Pericoli regionali (tempeste,
  campi gravitazionali, radiazioni) con effetto continuo proporzionale
  all'intensita' finche' si resta nella zona, mai distruttivo. Eventi
  periodici (aziendali/economici/diplomatici/misteriosi/pirateria) circa
  ogni 8-10 carte giocate, ordinari non modali nel pannello Eventi,
  critici con una modale dedicata a scelta obbligatoria; pirateria senza
  combattimento, nave madre mai distruttibile, perdita di una nave
  mineraria isolata in un singolo evento critico e dichiarato. Due carte
  rare con azioni originali (Diplomazia lampo, Fuga d'emergenza), mai
  semplici bonus percentuali.
- **Campagna narrativa a 5 capitoli (nuovo)**: "Benvenuto nella famiglia
  OmniProfit™", "Espansione non autorizzata", "Il dipartimento delle
  anomalie", "Il costo del successo", "Il profitto è eterno" — 14 scene
  data-driven con B.O.B., Rag. Zarg e la Direzione, sbloccate osservando in
  sola lettura condizioni di stato gia' esistenti (missioni completate,
  ricerca, crediti, pianeti anomali, pericoli scoperti), **senza alterare
  il motore di simulazione**. Scelte con conseguenze reali su tre assi di
  allineamento narrativo; quattro finali principali (promozione aziendale,
  indipendenza economica, ribellione ed esposizione, liquidazione
  narrativa) piu' un epilogo segreto per chi bilancia deliberatamente le
  scelte. Scene non modali nel pannello Campagna; il finale ha una
  schermata dedicata, dismissibile, che non interrompe la partita.
- **Fine carriera, roguelite, infinito e presentazione (nuovo)**: la
  campagna conclusa non blocca la partita, nessun nuovo sistema dedicato —
  "nuovi settori" e "incarichi" sono i salti iperspaziali e le missioni
  rigenerate gia' esistenti; il marchio in cima all'interfaccia si adatta
  al finale raggiunto (indipendente/ribelle/liquidato/fedele), coerenza
  narrativa senza duplicare logica. Game Over propone 1 vantaggio tra 3
  sorteggiati, ereditato dalla prossima carriera (crediti, carburante,
  capacita' mano o fiducia iniziali); la carriera conclusa viene archiviata
  (seed, finale o motivo, statistiche) in un archivio direttori consultabile
  dal pannello Salvataggio, separato dalla carriera attiva (una sola alla
  volta, sempre). Audio sintetizzato via Web Audio API (nessun asset
  fornito): atmosfera, feedback su conferme/notifiche, muto e volumi
  separati musica/effetti. LOD leggero sul rendering dei pianeti in base
  allo zoom. Riduzione del motion e aria-label/ruoli ARIA gia' presenti,
  verificati non aggiunti ex novo. Salvataggi versionati (schema 2) con
  fallback sicuro su schema incompatibile.
- **Revisione interfaccia post-release (nuovo)**: percorso della nave madre
  corretto — il pianeta di destinazione non viene piu' trattato come un
  ostacolo da aggirare (causava un percorso a zig-zag invece di una linea
  diretta quando si cliccava direttamente su un pianeta, `src/simulation/engine.ts`).
  Pulsante "Ricomincia partita" nel pannello Salvataggio, con conferma
  dedicata (irreversibile, non richiede un Game Over). La barra laterale
  sinistra/destra non ospita piu' stabilmente Missioni, Mercato, Mercato
  carte, Ricerca (solo la dashboard in sola lettura delle tecnologie
  completate resta in barra), Registro notifiche, Comandi, Audio e
  Salvataggio: ciascuno si apre in un overlay centrato sul gioco da un
  bottone dedicato sulla mappa (Comandi/Audio/Salvataggio sono raggruppati
  in un unico bottone "Impostazioni" che apre un unico pannello), chiudibile
  con Esc, click sullo sfondo o il pulsante di chiusura, senza mettere in
  pausa la simulazione (`src/ui/components/OverlayPanel.tsx`). Dettagli
  pianeta si apre allo stesso modo, automaticamente alla selezione di un
  pianeta sulla mappa.
- 268 test automatici (vitest + Testing Library) su RNG, generatore di
  regione, pathfinding, stato iniziale, motore di simulazione, logistica
  navette/estrazione, effetti delle carte, fabbrica/raffinazione,
  economia/mercato/revisioni, Game Over, persistenza, missioni, mercato
  carte, ricerca, flotta, moduli, iperspazio, civilta', pericoli, eventi,
  carte rare, campagna narrativa, vantaggi ereditati, audio e una suite di
  regressione dedicata ai 12 test prioritari del documento (G2). Lint
  (oxlint), typecheck (tsc) e build statica (vite build) senza errori.

## Cosa NON c'e' ancora (volutamente, fuori dallo scope dei macrostep)

- Prestiti (B3): esplicitamente rimandati con autorizzazione del
  documento stesso; stato predisposto per restare compatibile.
- Minimappa (resa esplicitamente opzionale dal documento di design).
- Asset grafici/audio parzialmente definitivi: le fotografie reali fornite
  per 5 archetipi di pianeta (dopo l'investigazione) e per 1 nave (madre)
  sono usate come sprite veri (vedi "Asset grafici"); i template carta
  forniti sono stati provati e poi rimossi su richiesta esplicita
  dell'utente (le carte restano sul design compatto originale, non
  illustrato). Gli archetipi restanti, navetta/nave mineraria sulla mappa
  e l'audio restano procedurali/sintetizzati per mancanza di un asset
  fornito per quei casi specifici.
- Bilanciamento definitivo di tutti i parametri "DA BILANCIARE" (vedi
  `docs/balance.json`): richiede playtest reale con utenti, fuori portata
  di questo ambiente di sviluppo.

## Overlay narrativo, chiacchiericcio NPC e sceneggiatura a capitoli

Oltre alla campagna a 5 capitoli/4 finali gia' approvata (`src/domain/narrative.ts`,
`src/simulation/narrative.ts`, invariata), e' stato aggiunto un livello
narrativo di ambientazione, affiancato e non bloccante:

- **Overlay a comparsa** (`src/ui/components/NarrativeToast.tsx`): in
  basso sopra la mano carte, avatar del personaggio a sinistra, testo a
  destra con effetto macchina da scrittura (font `--font-digital`),
  rispetta `prefers-reduced-motion`. Una coda unica (`src/ui/hooks/useNpcChatter.ts`)
  mostra un messaggio alla volta.
- **Chiacchiericcio NPC** (`src/domain/npcChatter.ts`): la libreria di 172
  messaggi fornita dall'utente, indicizzata per `trigger` ed collegata a
  ~22 rilevatori di stato reali (carburante, stiva, revisione, missioni,
  ricerca, fabbrica, pianeti, salti, crediti, fiducia, primo contatto
  civilta'), con anti-ripetizione.
- **Sceneggiatura a capitoli** (`src/domain/campaignScenes.ts`): le 41
  scene narrative fornite dall'utente, mostrate in sequenza man mano che
  il capitolo corrispondente viene raggiunto dalla campagna esistente;
  puramente decorativo, non influenza crediti/allineamento/finali.
- **Avatar** (`src/ui/narrativeAvatars.ts`): mappa i 6 personaggi (B.O.B.,
  Rag. Zarg, Direttore Magnus Voss, Dex Calder, Xylo Venn, Barthol Krix)
  alle immagini fornite dall'utente in `src/assets/reference/characters/`.

Limiti noti e voci non ancora collegate: vedi `docs/TODO.md`.

## Animazioni, suoni per carta, font e palette

- Ogni carta giocata produce un lampo colorato a schermo intero per
  categoria (`src/ui/components/CardActionFlash.tsx`) e un suono
  sintetizzato dedicato (`src/audio/audioEngine.ts`, tipi `carta*`),
  sincronizzati al momento della conferma (B11, richiesta utente).
- Dimensioni dei font aumentate sistematicamente in tutta l'interfaccia
  (+18% su tutte le dimensioni puntuali nei CSS, oltre al default del
  `body`).
- Palette "laser" piu' accesa (`src/index.css`): `--accent` piu' saturo,
  nuove `--laser-magenta`/`--laser-violet`, glow su bottoni e lampi carta.

## Asset grafici

Le immagini originali fornite dall'utente restano salvate in
`src/assets/reference/` (sottocartelle `planets/`, `cards/`, `ships/`).
Dove l'utente ha fornito un asset individuale utilizzabile, e' stato
elaborato (ritaglio/mascheratura, A5: "se disponibili usare file
effettivamente presenti") in uno sprite raster vero e proprio salvato in
`src/assets/sprites/`, importato ed usato direttamente nel rendering:

- **Pianeti** (`scripts/process_planets.py`): le foto singole di 5
  archetipi su 9 (`roccioso`, `oceanico`, `ghiacciato`, `terrestre`,
  `vulcanico`) sono ritagliate a cerchio con bordo sfumato (feather) e
  usate come texture di superficie reale (`src/render/planetTextures.ts`,
  `hasPlanetPhoto`), ma solo *dopo* che il pianeta e' stato investigato
  (carta Investiga, Macrostep 3): prima la composizione non e' nota al
  giocatore, quindi resta sulla texture procedurale anche per questi 5
  archetipi, che diventa la foto reale non appena investigato — lo sprite
  viene ricreato al cambio di stato (`src/render/PixiMapView.tsx`). Il tint
  di colore e' ridotto al 20% (invece che pieno) per non coprire la
  fotografia, e lo scorrimento di rotazione apparente e' disattivato per
  questi pianeti (non essendo texture seamless) mentre resta attivo per
  quelli procedurali (`src/render/planetSprite.ts`). La superficie e'
  disegnata con un `TilingSprite`: per una fotografia (non pensata per il
  tiling) va esplicitamente scalata con `tileScale` sulla dimensione del
  pianeta, altrimenti PixiJS la disegna alla risoluzione nativa mostrando
  solo un frammento in alto a sinistra invece dell'immagine intera — bug
  iniziale corretto. Gli archetipi restanti (`gassoso`, `cristallino`,
  `anomalo`, `desertico`) non hanno una foto individuale tra gli asset
  forniti — l'immagine `archetipi_sheet_ref.webp` e' esplicitamente un
  foglio di riferimento esemplificativo per le categorie, non un asset da
  ritagliare — e restano su texture procedurale, come prima.
- **Navi** (`scripts/process_ship.py`, rimozione sfondo via chroma-distance
  + flood-fill dai bordi + pulizia componente connessa piu' grande): la
  nave madre e' renderizzata come sprite reale sulla mappa
  (`src/render/PixiMapView.tsx`), al posto del precedente triangolo
  vettoriale. Navetta e nave mineraria non hanno ancora una rappresentazione
  propria sulla mappa (limitazione preesistente, indipendente dagli asset:
  non vengono disegnate come entita' visibili, solo la nave madre lo e').
- **Carte**: i 6 template illustrati forniti (Esplora, Investiga, Contratto
  minerario, Fabbrica, Recupera rottami, Ricerca) sono stati provati come
  sfondo delle carte in mano con un effetto di rivelazione all'hover, ma su
  richiesta esplicita dell'utente ("non mi piacciono i template") sono
  stati rimossi: le carte in mano restano sul design compatto originale
  (bordo colorato per categoria, nessuna illustrazione, `src/ui/CardHandBar.css`).
  I file dei template restano comunque salvati in `src/assets/reference/cards/`
  come riferimento, semplicemente non importati nel rendering.

## Test eseguiti

- `npm run typecheck` → nessun errore.
- `npm run lint` → nessun errore (oxlint).
- `npm run test` → 268/268 test passati.
- `npm run build` → build statica generata senza errori.
- Verifica manuale in browser (dev server): simulato un Game Over — la
  schermata propone 3 vantaggi sorteggiati, sceltone uno la nuova carriera
  parte senza reload di pagina con il bonus applicato (crediti iniziali
  2000+500 osservati); l'Archivio direttori mostra correttamente la
  carriera appena conclusa con tutte le statistiche. Pannello Audio
  verificato (muto, volumi, avvio/arresto dell'atmosfera) senza errori in
  console, inclusa l'assenza di `AudioContext` coperta da test dedicati.
  Mappa verificata durante lo zoom (LOD) senza artefatti visivi o errori.
  Verifiche ereditate dal Macrostep 10 (campagna narrativa) restano
  valide, non ripetute in questo giro.
- Verifica manuale dedicata agli asset reali (dopo l'integrazione foto
  pianeti/nave madre): partita giocata dal vivo con screenshot ad ogni
  azione rilevante; nave madre con sprite fotografico verificata sulla
  mappa senza artefatti; caricamento dei 5 file di texture pianeta e del
  file nave madre confermato via `performance.getEntriesByType('resource')`;
  nessun errore in console in nessuna fase.
- Verifica manuale dedicata alla revisione interfaccia (percorso nave
  madre, overlay Missioni/Mercato/Dettagli pianeta, Ricomincia partita,
  carte compatte): percorso diretto confermato cliccando un pianeta
  (prima zig-zag, ora una linea pulita fino al bersaglio); le tre overlay
  si aprono/chiudono correttamente senza bloccare la simulazione dietro;
  Ricomincia partita verificato end-to-end (conferma -> nuova regione,
  nuova mano, mercato carte rigenerato); drag `draggable="true"`
  confermato sul DOM per le carte con bersaglio sulla mappa (il
  trascinamento HTML5 nativo non e' simulabile dallo strumento di
  automazione del browser usato per la verifica, quindi non testato punto
  per punto in questo giro, ma il flusso alternativo click-carta +
  click-bersaglio e' stato verificato funzionante).

## Distribuzione

`npm run build` produce un sito interamente statico in `dist/` (HTML, JS,
CSS): nessun backend, nessuna configurazione server-side richiesta.
Pubblicabile cosi' com'e' su qualunque hosting statico (GitHub Pages,
Netlify, Vercel, un bucket S3+CDN, o un qualsiasi server HTTP). Browser di
riferimento: versioni recenti di Chrome/Edge/Firefox/Safari con supporto a
IndexedDB, Web Audio API e Canvas/WebGL; dove un'API manca il gioco degrada
senza interrompersi (nessun salvataggio persistente o nessun audio, ma
resta giocabile), coerente con l'approccio di degradazione graduale gia'
usato in tutto il progetto.
