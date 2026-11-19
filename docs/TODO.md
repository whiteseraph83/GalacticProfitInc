# Attività da fare

Elenco di richieste raccolte. La maggior parte e' stata sviluppata (vedi
"✅ Implementato" su ciascuna voce); i residui non ancora collegati sono
segnati esplicitamente in fondo a ciascuna sezione.

## ✅ Implementato in questo giro

- Overlay narrativo in basso con avatar, nome colorato, effetto di
  scrittura lettera per lettera e font digitale (`src/ui/components/NarrativeToast.tsx`,
  `src/ui/narrativeAvatars.ts`).
- Libreria dialoghi NPC (172 messaggi) collegata a ~22 trigger di stato
  reali, con anti-ripetizione (`src/domain/npcChatter.ts`,
  `src/ui/hooks/useNpcChatter.ts`).
- Sceneggiatura a capitoli (41 scene) mostrata come livello narrativo
  affiancato, non bloccante, gated sul capitolo gia' raggiunto dal motore
  esistente (`src/domain/campaignScenes.ts`).
- Animazione grafica (lampo colorato per categoria) + suono dedicato per
  ogni carta giocata (`src/ui/components/CardActionFlash.tsx`,
  `src/audio/audioEngine.ts`).
- Font piu' grandi in tutta l'interfaccia (+18% su tutte le dimensioni
  puntuali nei CSS, +base body).
- Palette "laser": nuove variabili `--accent` piu' acceso, `--laser-magenta`,
  `--laser-violet`, glow su bottoni/flash (`src/index.css`).

### Limiti noti di questa prima versione

- L'anti-ripetizione dei messaggi NPC e la cronologia delle scene di
  capitolo **non sono persistite nel salvataggio**: si azzerano a un
  ricaricamento (vivono solo in stato React locale, per non toccare lo
  schema di salvataggio esistente).
- Le 9 scene "operative" (OP01-OP09) della sceneggiatura NON sono ancora
  collegate: quelle marcate `duplicate_of` sono escluse di proposito (per
  evitare il doppio trigger, come richiesto dal documento); le altre
  (OP02, OP03, OP04, OP06, OP08) non hanno ancora un rilevatore di trigger
  dedicato.
- Il gating delle 41 scene di capitolo era **puramente sequenziale per
  capitolo** (si sbloccava la prima scena non vista del capitolo gia'
  raggiunto da `state.campagna.capitoloCorrente`), ignorando il trigger
  testuale di ognuna. **Parzialmente risolto** (richiesta utente,
  19/11): le scene il cui trigger corrisponde a un segnale di stato gia'
  osservabile ora hanno una condizione reale in `CONDIZIONE_SCENA`
  (`src/domain/campaignScenes.ts`) e restano bloccate finche' l'evento non
  e' davvero accaduto:
  - `C1_S03` prima investigazione, `C1_S04` primo contratto minerario,
    `C1_S05` prima vendita (nuovo contatore `contabilita.venditeTotali`,
    `SAVE_SCHEMA_VERSION` 4→5), `C1_S06` prima fabbrica costruita,
    `C1_S07`/`C1_S08` revisione a 3 carte/dovuta, `C2_S01` prima ricerca
    completata, `C2_S06` primo salto iperspaziale completato.
  - `C5_S07` (Liquidazione) e' ora davvero "accessibile da qualsiasi
    capitolo" come richiesto dal documento: compare appena `gameOver` si
    attiva, con priorita' assoluta, non solo se si arriva al capitolo 5.
  - Le restanti scene (mercato speciale, indizi di mistero, scelte morali
    — vedi sezione "Piano" piu' sotto) restano gated solo sul capitolo:
    la meccanica di gioco sottostante al loro trigger non esiste ancora.
  Il sistema di finali/allineamento esistente (`src/domain/narrative.ts`,
  `src/simulation/narrative.ts`) **non e' stato toccato**: resta l'unica
  fonte di verita' per capitoli e finali, come richiesto.
- Alcune soglie dei rilevatori (es. `credits.low` < 500, `trust.high` >=
  80) sono valori ragionevoli scelti in assenza di indicazioni, non
  concordati esplicitamente.

## Messaggi narrativi come overlay in basso con avatar

Attualmente i messaggi della campagna narrativa (B.O.B., Rag. Zarg,
Direzione — vedi `src/domain/narrative.ts`, campo `mittente`) sono
mostrati nel pannello Campagna (`src/ui/panels/NarrativePanel.tsx`), non
come notifica a comparsa.

Richiesta dell'utente:
- i messaggi devono comparire **in basso, sopra la mano carte**, in un
  overlay sul gioco (non bloccante, probabilmente simile a un toast/popup
  piu' che a un vero modale — da chiarire con l'utente quanto deve essere
  invasivo e se richiede un click per proseguire o scompare da solo);
- **animazione di comparsa** (slide-in dal basso o fade, da decidere in
  fase di implementazione, coerente con `prefers-reduced-motion` come il
  resto del progetto);
- **layout**: un'immagine avatar del personaggio a sinistra, il testo del
  messaggio a destra (pattern tipico "dialogo con ritratto").

### Tono narrativo (indicazione dell'utente, non una proporzione fissa)

L'utente vuole un gioco con una storia e tanti dialoghi/interazioni con i
personaggi, con un tono **~70% ironia e satira aziendale, ~30% serieta' e
mistero**. Esplicitamente indicato come un riferimento orientativo, non
una percentuale rigida gia' concordata: da tenere presente nello scrivere
nuovi testi narrativi (sostituisce/affina il tono eventualmente usato
finora in `src/domain/narrative.ts`).

### Personaggi e avatar forniti dall'utente

L'utente ha fornito una tabella di 6 personaggi con il momento di partita
in cui compaiono per la prima volta e il loro ambito narrativo:

| Personaggio | Prima apparizione | Ambito |
|---|---|---|
| B.O.B. | Inizio partita | Tutorial e notifiche |
| Rag. Zarg | Prima quota aziendale | Economia e revisioni |
| Magnus Voss | Prima revisione | Fiducia e trama aziendale |
| Dex Calder | Prima fabbrica | Industria e ricerca |
| Xylo Venn | Prime esplorazioni avanzate | Missioni ed eventi |
| Barthol Krix | Primo contatto commerciale | Scambi e carte speciali |

Nel codice attuale (`src/domain/narrative.ts`, campo `mittente`) esistono
solo 3 mittenti: `BOB`, `RagZarg`, `Direzione`. `Direzione` nella trama
attuale non ha un nome proprio: **da chiarire con l'utente se "Direzione"
va rinominato/sostituito da uno di questi nuovi personaggi (es. Magnus
Voss, vista la colonna "Fiducia e trama aziendale") o se resta distinto**.
Dex Calder, Xylo Venn e Barthol Krix sono personaggi nuovi, non presenti
in nessuna scena esistente: servira' scrivere nuove scene/trigger per
ciascuno nel punto di partita indicato (prima fabbrica, prime esplorazioni
avanzate, primo contatto commerciale).

Avatar forniti dall'utente, salvati in `src/assets/reference/characters/`
(solo riferimento, non ancora importati in nessun componente). Ipotesi di
abbinamento per somiglianza visiva/tematica con la tabella sopra —
**da confermare con l'utente prima di implementare, non assunzioni
definitive**:

- `avatar_bob_ref.webp` — robot bianco/oro con cravatta, sorriso →
  **B.O.B.** (quasi certo)
- `avatar_ragzarg_ref.webp` — uomo calvo, occhiali tondi, baffi, completo
  viola con tablet → **Rag. Zarg** (quasi certo)
- `avatar_direzione_ref.webp` — ufficiale anziano, giacca blu/oro con
  spalline, espressione severa → ipotesi **Magnus Voss** (fiducia/trama
  aziendale si addice a una figura di comando)
- `avatar_meccanico_ref.webp` — giovane meccanico, giacca arancione,
  occhiali da aviatore, cicatrice → ipotesi **Dex Calder** (industria e
  ricerca)
- `avatar_alieno_ref.webp` — alieno verde/squid-like con impianto oculare
  tecnologico → ipotesi **Xylo Venn** (missioni ed eventi, esplorazione)
- `avatar_capitano_anziano_ref.webp` — capitano/nano anziano con occhiali
  da aviatore, mantello rosso/oro → ipotesi **Barthol Krix** (scambi e
  carte speciali, si addice a un mercante/capitano)

### Libreria dialoghi NPC completa, fornita dall'utente (pronta per lo sviluppo)

L'utente ha fornito una sceneggiatura completa, gia' strutturata per
l'integrazione, salvata in `src/assets/reference/dialoghi/`:

- `Galactic_Profit_Inc_Dialoghi_NPC.json` — 172 messaggi + 9 scene
  multi-personaggio, in formato dati pronto da leggere direttamente nel
  sistema di messaggistica.
- `Galactic_Profit_Inc_Biblioteca_Dialoghi_NPC.docx` — stessa sceneggiatura
  in formato leggibile, da usare per revisione/ampliamento testi (non per
  l'integrazione dati: quella va fatta dal JSON).

**Conferma la mappatura personaggi** ipotizzata piu' sopra: la libreria usa
esattamente i nomi "B.O.B.", "Rag. Zarg", "Dex Calder", "Direttore Magnus
Voss", "Xylo Venn", "Barthol Krix" — stesso abbinamento gia' proposto in
base all'ambito tematico. Resta comunque da confermare con l'utente solo
l'abbinamento *visivo* avatar -> personaggio (la libreria non contiene
immagini).

Distribuzione dei 172 messaggi per personaggio (dati dell'utente, utile per
capire il peso relativo di ciascuno nell'esperienza):

| Personaggio | Messaggi | Temi principali |
|---|---|---|
| B.O.B. | 60 | Notifiche, carburante, stiva, carte, eventi |
| Rag. Zarg | 35 | Crediti, prestiti, mercato, revisioni |
| Dex Calder | 26 | Fabbriche, navette, moduli, ricerca |
| Magnus Voss | 18 | Direzione aziendale, fiducia, minacce |
| Barthol Krix | 17 | Commercio, offerte, opportunita' |
| Xylo Venn | 16 | Esplorazione, anomalie, mistero |

Struttura dati di ogni messaggio: `id`, `speaker`, `trigger` (es.
`fuel.low`, `cargo.full`, `review.near`, `module.available`,
`jump.complete`, `rare.signal`...), `tone` (`tutorial` / `info` /
`warning` / `critical` / `mystery` / `story`), `text` (con placeholder tipo
`{cards_remaining}`, `{quota}`, `{grace_cards}`, `{resource_estimate}` da
interpolare con i valori reali di stato). Le 9 scene multi-personaggio
hanno invece solo `speaker` + `text` per riga, nessun trigger/tono
individuale (il trigger e' della scena nel suo insieme, descritto da
`context`).

**Nota architetturale da risolvere prima di implementare**: questa libreria
e' organizzata per *trigger di stato* (basso carburante, stiva piena,
revisione vicina, ecc.), un sistema diverso e piu' granulare rispetto alle
scene della campagna narrativa attuale (`src/domain/narrative.ts`), che si
sblocca osservando condizioni di stato gia' esistenti ma in sola lettura e
senza alterare il motore (vedi README, sezione Macrostep 10). Molti
trigger qui elencati coincidono o si sovrappongono con eventi che gia'
generano una notifica "meccanica" nel registro (`state.notifiche`, vedi
`src/simulation/engine.ts` e affini — es. carburante basso, stiva piena,
revisione in arrivo). Va deciso in fase di design se questa libreria:
(a) sostituisce il testo di quelle notifiche esistenti con una versione
"recitata" da un personaggio, (b) le affianca come livello narrativo
separato (le notifiche meccaniche restano, in piu' compare ogni tanto un
messaggio in overlay), o (c) alimenta un sistema di "chiacchiericcio NPC"
indipendente con una propria cadenza. Serve inoltre un meccanismo
anti-ripetizione (l'utente lo segnala esplicitamente: "indicazioni per
evitare ripetizioni eccessive" — probabilmente va tracciato quali id
messaggio sono gia' stati mostrati, con rotazione tra le varianti dello
stesso trigger quando ce ne sono piu' di una, come per `fuel.low` che ne
ha diverse per personaggio).

### Note implementative (per quando si parte)

- Un singolo avatar per `mittente` richiede una mappa `mittente -> url
  immagine` (pattern identico a `cardArt.ts`, gia' rimosso ma riusabile
  come riferimento) in un nuovo file, es. `src/ui/narrativeAvatars.ts`.
- La coda di messaggi narrativi non ancora visti dovra' probabilmente
  pilotare la comparsa automatica dell'overlay (un messaggio alla volta?
  in coda?), da verificare contro la logica attuale in `NarrativePanel.tsx`
  e nello stato `state.campagna`.
- Va deciso se questo sostituisce il pannello Campagna attuale o lo
  affianca (il pannello resta utile come log consultabile a posteriori).

## Animazioni per le azioni delle carte

Ogni carta giocata (Radar, Investiga, Contratto minerario, Fabbrica,
Recupera rottami, Ricerca, ecc.) dovrebbe avere una propria animazione
grafica al momento dell'applicazione dell'effetto, non solo il risultato
finale che compare di colpo. Serve a rendere il feedback dell'azione piu'
riconoscibile e il gioco piu' "accattivante" in generale (richiesta
esplicita dell'utente).

Da chiarire in fase di implementazione: un'animazione diversa per
categoria di carta o per singola carta; dove va disegnata (sulla mappa
PixiJS al bersaglio, o come overlay UI, o entrambe a seconda del
bersaglio); durata e se e' saltabile/interrompibile da un'azione
successiva.

## Font piu' grande in generale

L'utente chiede di aumentare la dimensione dei font nell'interfaccia in
generale (non solo nei messaggi narrativi), per leggibilita' e resa
grafica. Richiede una revisione sistematica delle dimensioni testo nei
CSS esistenti (non solo un cambiamento del default a livello body, dato
che molte dimensioni sono specificate puntualmente per elemento).

## Suoni per le azioni delle carte

Ad ogni carta giocata dovrebbe corrispondere un suono dedicato e
riconoscibile (non solo gli effetti UI generici gia' presenti in
`src/audio/audioEngine.ts` per conferme/notifiche). Probabilmente un
suono per carta o per categoria (operazioni/industria/ricerca), da
agganciare al momento dell'applicazione dell'effetto (stesso punto
dell'animazione grafica sopra, idealmente sincronizzati).

## Effetto di scrittura lettera per lettera nei messaggi narrativi

Collegata alla voce "Messaggi narrativi come overlay" sopra: il testo del
messaggio deve comparire con un effetto macchina da scrivere (lettera per
lettera), molto veloce, invece di apparire tutto insieme. Va anche scelto
un font piu' "digitale/terminale" per questi messaggi (diverso dal font
UI generale), coerente con l'estetica sci-fi del gioco.

Da verificare in fase di implementazione: rispetto di
`prefers-reduced-motion` (mostrare il testo intero subito invece
dell'animazione lettera-per-lettera per chi lo richiede, come gia' fatto
altrove nel progetto).

## Campagna narrativa a capitoli — sceneggiatura completa fornita dall'utente

L'utente ha fornito una sceneggiatura completa per rifare/estendere la
campagna narrativa, pronta per lo sviluppo, salvata in
`src/assets/reference/campagna/`:

- `Galactic_Profit_Inc_Campagna_Scene_per_Sviluppo.md` — testo completo
  leggibile (capitoli, scene, dialoghi, scelte, effetti, vincoli): il
  riferimento principale per capire storia e ordine degli eventi.
- `Galactic_Profit_Inc_Campagna_Capitoli_Scene.docx` — stesso contenuto in
  Word, per revisione/modifica testi.
- `Galactic_Profit_Inc_Scene_Capitoli.json` — stessi dati in formato dati
  (id scena, personaggi, trigger, condizioni, conseguenze): da leggere
  direttamente per l'integrazione nel codice, non da trascrivere a mano.

Indicazione esplicita dell'utente: usare **Markdown + JSON insieme al
prompt di sviluppo originale** per l'implementazione; il docx serve solo
per revisione testi. La sceneggiatura **amplia** il progetto con nuovi
dialoghi e scelte proposte — **le regole gestionali gia' approvate restano
invariate**, le nuove diramazioni narrative potranno essere affinate in
corso d'opera. Non va implementata tutta insieme: e' una base da
sviluppare progressivamente.

### Struttura della sceneggiatura

5 capitoli (`C1`–`C5`), 41 scene narrative di capitolo + 9 "scene
operative" riutilizzabili (`OP01`–`OP09`) pensate per compatibilita' con
la libreria dialoghi NPC gia' segnata piu' sopra — **alcune scene
operative sono esplicitamente duplicate di scene di capitolo** (es. `OP01`
= `C1_S04`, `OP05` = `C1_S07`, `OP07` = `C3_S01`, `OP09` = `C5_S01`: il
documento stesso dice "dove compare `duplicate_of`, utilizzare una sola
versione" — **va evitato il doppio trigger quando la scena di capitolo
corrispondente e' gia' stata eseguita**, esattamente come gia' notato per
la libreria dialoghi NPC).

I 5 capitoli, in ordine:
1. **C1 — Benvenuto nella famiglia OmniProfit™**: tutorial (~5 min) e
   primo contratto, fino alla prima revisione (40 carte, 600 Cr). Introduce
   B.O.B., Rag. Zarg, Dex Calder; prima traccia di mistero appena accennata
   (`C1_S08`, un "direttore non riconosciuto" nei dati di confronto).
2. **C2 — Espansione non autorizzata**: ricerca/moduli, primo incontro con
   Barthol Krix e Xylo Venn, primo salto iperspaziale, primi indizi sul
   mistero (relitto con sigla `D-17`, cliente con identita' cancellata).
3. **C3 — Il dipartimento delle anomalie**: filone investigativo puro
   (segnali, log, documenti), introduce Magnus Voss come antagonista
   esplicito; include un indizio opzionale (`C3_S08`) per l'epilogo
   segreto, esplicitamente non necessario per i finali principali.
4. **C4 — Il costo del successo**: conflitto morale con scelte a
   conseguenze reali (relazione con civilta' locali, fiducia aziendale,
   autonomia di B.O.B.), niente combattimento — solo conseguenze
   economiche/sociali.
5. **C5 — Il profitto è eterno**: confronto finale, 4 esiti principali
   (promozione/fedelta', indipendenza, ribellione, liquidazione per
   insolvenza — quest'ultima raggiungibile anche da capitoli precedenti,
   non solo a fine campagna) + 1 epilogo segreto opzionale che richiede gli
   indizi facoltativi raccolti; ponte esplicito alla modalita' infinita
   post-finale, con la quota adattata alla fazione scelta.

### Differenze rispetto al sistema narrativo attuale

Il codice attuale (`src/domain/narrative.ts`) ha gia' 5 capitoli e 4
finali impostati (vedi README, Macrostep 10), **ma con testi, trigger e
struttura delle scelte diversi** da questa nuova sceneggiatura (nomi scena
diversi, assi di allineamento invece di `flag`/variabili nominate,
mittente `"Direzione"` invece di `"Direttore Magnus Voss"`, ecc.). Questa
sceneggiatura non e' un drop-in replacement: **va fatto un confronto
puntuale** fra lo schema scene esistente (`src/domain/narrative.ts`,
`SCENE_NARRATIVE` o struttura equivalente) e il nuovo JSON prima di
decidere se sostituire, fondere o far convivere i due sistemi. Il
documento stesso segnala regole di integrazione esplicite da rispettare,
tra cui:
- le scene di capitolo si attivano una sola volta (salvo indicazione
  esplicita); i messaggi operativi invece seguono cooldown/deduplicazione;
- la progressione usa combinazioni di obiettivi/scoperte/economia, mai
  timer rigidi;
- nessun indizio indispensabile puo' dipendere solo da RNG o drop di carte
  rare non garantiti;
- le notifiche operative non devono mai bloccare la simulazione; solo le
  scelte cruciali lo fanno, preservando la pausa gia' esistente;
- gli ID scena sono immutabili (usati per salvataggio/registro) e il testo
  usa variabili localizzabili senza interpolazione HTML (stesso pattern
  `{placeholder}` gia' visto nella libreria dialoghi NPC, es. `{quota}`,
  `{cards_remaining}`).

### Collegamenti con le altre voci di questa todo list

Questa sceneggiatura usa esattamente i 6 personaggi gia' segnati sopra
("Personaggi e avatar forniti dall'utente"), confermando ulteriormente
quella mappatura. Le scene vanno presentate con lo stesso overlay con
avatar + animazione di comparsa + effetto macchina da scrivere gia'
richiesti per i messaggi narrativi (voci 1 e 5 di questa lista), non con
un pannello separato.

## Piano: meccaniche narrative ancora mancanti per i trigger reali

Le scene di capitolo elencate sotto hanno un trigger testuale specifico
nel JSON (`Galactic_Profit_Inc_Scene_Capitoli.json`) che oggi non puo'
essere verificato: non esiste ancora, nello stato di gioco, il dato che
descrivono. Restano quindi gated solo sul capitolo (vedi sezione sopra).
Qui sotto un piano concreto, per gruppo di meccanica, su cosa andrebbe
costruito per sbloccarle davvero — da implementare un pezzo alla volta,
non tutto insieme, e da confermare con l'utente prima di ogni pezzo (sono
scelte di design, non dettagli tecnici).

### 1. Eventi di mercato speciali (`C2_S02`, `C2_S07`) — ✅ fatto

Trigger: `first_special_market_event`, `special_demand_with_deleted_identity`.
Introducono Barthol Krix con un'offerta/richiesta unica, non ripetibile.

Implementato riusando il motore eventi generico gia' esistente
(`src/domain/events.ts`, `src/simulation/events.ts`) invece di costruire
un sistema separato:
- Due nuove `EventoDefinition` di categoria `"commerciale"`:
  `EVT-COM-01` ("L'offerta del signor Krix") ed `EVT-COM-02` ("Il cliente
  cancellato"), con le stesse scelte/effetti del motore eventi generico
  (`EffettoScelta`, nessun nuovo tipo di effetto necessario).
- `CampagnaState.eventiMercatoSpeciali: string[]` (nuovo campo,
  `SAVE_SCHEMA_VERSION` 5→6) registra gli id gia' comparsi almeno una
  volta: li rende non ripetibili dal pool casuale e permette alle scene
  `C2_S02`/`C2_S07` di sbloccarsi solo quando l'evento e' davvero apparso
  (`CONDIZIONE_SCENA` in `src/domain/campaignScenes.ts`).
- `candidatiEvento()` in `src/simulation/events.ts` filtra il pool: niente
  eventi commerciali prima del capitolo 2, mai due volte, ed `EVT-COM-02`
  solo dopo che `EVT-COM-01` e' gia' comparso (Krix va introdotto prima).
  Generati con la stessa cadenza casuale ad ogni 8-10 carte degli altri
  eventi (`EVENTI_CONFIG`), coerente con "mai timer rigidi".
- Pannello: nessuna modifica necessaria, `EventsPanel.tsx` e' gia'
  completamente data-driven (basta la nuova etichetta categoria
  "Commerciale").

### 2. Indizi di mistero (`C2_S03`, `C2_S04`, tutte le `C3_S01`...`C3_S08`) — parzialmente fatto

Trigger: contatti NPC specifici (`first_contact_xylo`), investigazioni
mirate (`first_industrial_wreck_investigated`, `investigation: decoded_D17`,
`bob.memory_fragment_discovered`, `merchant_clue_available`, ecc.).

**Parzialmente fatto** (19/11, senza introdurre un vero registro
indizi/investigazione — sarebbe una meccanica nuova, non solo un trigger):
collegate le scene con un fatto di gioco reale e distinguibile gia'
esistente, in `CONDIZIONE_SCENA` (`src/domain/campaignScenes.ts`):
- `C2_S03` (`first_contact_xylo`) → primo pianeta rilevato da Radar
  (`sempreVisibile`): Xylo e' un'esploratrice indipendente, e Radar e'
  l'azione di esplorazione piu' vicina a questo tema gia' nel gioco.
- `C2_S04` (`first_industrial_wreck_investigated`) → primo `WreckField` di
  `tipo: "relitto"` con `recuperato: true` (il tipo esisteva gia', non
  serviva aggiungerlo).
- `C3_S01` (`investigate: anomaly_repeating_signal`) → primo pericolo
  regionale scoperto (`pericoli.some(p => p.scoperto)`, lo stesso segnale
  gia' usato da `src/simulation/narrative.ts` per un tema identico).
- `C3_S02` (`investigation: decoded_D17`) → relitto industriale di C2_S04
  **e** un pianeta anomalo investigato insieme: la "decodifica" come somma
  di due indizi distinti.
- `C3_S04` (`merchant_clue_available`) → prima civilta' scoperta.
- `C3_S06` (`investigation: abandoned_station_access`) → secondo salto
  iperspaziale (seconda regione raggiunta).

Restano **gated solo sul capitolo** (nessun fatto di stato equivalente
esiste, e inventarne uno debole sarebbe stato peggio che lasciarli cosi'):
`C3_S03` (frammento di memoria di B.O.B.), `C3_S05` (rapporto intermedio),
`C3_S07` (soglia di prove raggiunta), `C3_S08` (indizio segreto opzionale
per l'epilogo, legato a `secret_clue += 1`). Costruirli davvero richiede un
vero registro indizi con prerequisiti a catena (indizio N sbloccabile solo
se i precedenti sono gia' raccolti) — una meccanica a parte, non solo un
trigger di scena: lasciato per un giro futuro, non e' un trigger "facile".

### 3. Scelte morali e reputazione (tutte le `C4_S01`...`C4_S08`, parte di `C5`) — parzialmente fatto

Trigger: `local_civilization: request_mining_rights`,
`corporate_offer: high_margin_scheme`, `corporate_trust: milestone`,
`evidence: release_decision`, `bob: internal_directive_detected`, e gli
esiti finali `ending_choice: *_option_unlocked` di `C5_S03`/`C5_S04`/`C5_S05`.

**Decisione presa (19/11, senza bisogno di nuova conferma): queste scene
restano un livello narrativo affiancato come tutte le altre 41 — non
mutano `campagna.allineamento` ne' alcun'altra regola di gioco.** Il
sistema di allineamento a 3 assi esiste gia' in
`src/domain/narrative.ts`/`src/simulation/narrative.ts` ed e' gia'
"l'unica fonte di verita' per capitoli e finali" (vincolo ripetuto piu'
volte in questo stesso documento, prima di questo giro): farlo alimentare
anche da questa sceneggiatura sarebbe una modifica architetturale
importante su un sistema gia' approvato e testato, non richiesta
esplicitamente — quindi non e' stata fatta. Collegati solo i trigger di
comparsa a fatti reali, dove ne esiste uno credibile, in
`CONDIZIONE_SCENA`:
- `C4_S02` (`local_civilization: request_mining_rights`) → una civilta'
  locale con una richiesta commerciale attiva (`richiestaAttiva`, gia'
  esistente): non e' letteralmente un'"autorizzazione mineraria", ma e' il
  fatto di gioco piu' vicino a questo tema.
- `C4_S04` (`dex: hidden_technical_solution`) → seconda ricerca completata
  (la prima sblocca gia' `C2_S01`: qui serve "un'idea in piu'").
- `C4_S05` (`corporate_trust: milestone`) → riusa la soglia `fiducia >= 80`
  gia' scelta per il rilevatore NPC `trust.high`.
- `C5_S08` (`ending: post_credit`) e `C5_S09` (epilogo segreto) → il
  finale (`campagna.finaleOttenuto`) deve essere gia' assegnato dal
  sistema esistente prima di comparire: senza questa condizione una
  carriera senza liquidazione non avrebbe mai mostrato l'epilogo (bug
  trovato e corretto in questo stesso giro, insieme alla condizione).

Restano gated solo sul capitolo, senza un fatto di stato credibile:
`C4_S01` (semplice inizio capitolo, va bene cosi'), `C4_S03` (offerta
aziendale), `C4_S06` (decisione sulle prove), `C4_S07` (direttiva interna
di B.O.B.), `C4_S08` (chiusura capitolo). **`C5_S03`/`C5_S04`/`C5_S05`
(le tre varianti di finale) restano deliberatamente senza condizione**:
sono mutuamente esclusive (solo un finale viene davvero raggiunto), e
l'algoritmo di sblocco attuale e' lineare — una scena con una condizione
mai vera bloccherebbe per sempre le scene successive (lo stesso bug
corretto per `C5_S07`/liquidazione, vedi sopra). Collegarle correttamente
richiederebbe poter "saltare" una scena non piu' raggiungibile invece di
bloccare la sequenza, una modifica all'algoritmo stesso — rimandata.

### Nota: bug trovato e corretto durante l'implementazione del punto 3

La condizione originale di `C5_S07` (Liquidazione, aggiunta al giro
precedente: "`gameOver !== null`") veniva controllata anche dentro il loop
lineare normale, non solo dal controllo esplicito con priorita'. In una
carriera che non va mai in liquidazione la condizione resta falsa per
sempre, e l'algoritmo lineare blocca tutto cio' che segue: l'epilogo
(`C5_S08`/`C5_S09`) non sarebbe quindi **mai** comparso per una carriera
vittoriosa. Corretto escludendo esplicitamente `C5_S07` dal loop
principale (resta gestita solo dal controllo `gameOver` con priorita' in
testa alla funzione). Aggiunto un test che copre esplicitamente questo
caso (`tests/campaignScenes.test.ts`).

## Palette "laser" piu' accesa in generale

L'utente chiede di introdurre colori piu' "laser"/accesi (stile
videogiochi/film sci-fi: neon saturi, bagliori) nella palette generale
dell'interfaccia, non solo in punti isolati. Richiede una revisione dei
colori accento definiti nelle variabili CSS globali (`--accent` e affini)
e probabilmente l'aggiunta di effetti glow/neon coerenti sugli elementi
interattivi (bottoni, bordi carte, evidenziazioni), mantenendo leggibilita'
e contrasto.
