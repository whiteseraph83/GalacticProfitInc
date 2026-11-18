# GALACTIC PROFIT INC. — CAMPAGNA NARRATIVA E SCENE

> Documento di sceneggiatura per l’assistente di sviluppo. Le scene C1–C5 sono contenuti di campagna proposti; gli eventi OP riprendono scene già definite nella biblioteca dei dialoghi.

## Regole narrative e integrazione

- Le scene narrative si attivano una sola volta salvo indicazione esplicita; i messaggi operativi seguono cooldown e deduplicazione.
- La progressione narrativa usa combinazioni di obiettivi, scoperte ed economia, non timer rigidi.
- Il tutorial iniziale dura circa 5 minuti; primo review dopo 40 carte giocate, quota 600 Cr pagabile dal capitale iniziale.
- Il salto si sblocca dopo ricerca e usa carta Iperspazio; consuma 60 carburante e carta solo al salto riuscito.
- Le missioni regionali vengono abbandonate senza penalità al salto dopo avviso; le non accettate archiviate.
- Le scelte modificano flag, rapporti locali, fiducia aziendale o costi solo secondo regole implementate; nessun costo occulto.
- Le scene del fallimento possono interrompere qualsiasi capitolo. Dopo un finale, modalità infinita in accordo con la fazione scelta.
- Le notifiche operazionali non devono bloccare la simulazione; scelte cruciali sì, preservando la pausa originale.
- La nave madre non combatte; pirati e pericoli producono sottrazioni, minacce, fughe, scudi e blocchi non offensivi.
- Nessun indizio indispensabile può dipendere esclusivamente da RNG, carte rare o drop non garantiti.
- Non utilizzare automaticamente dialoghi di OP01/OP05/OP07/OP09 quando la corrispondente scena capitolo è già stata eseguita.
- Gli ID sono immutabili e vanno usati per salvataggio/registro; testo con variabili localizzabili senza interpolazione di HTML.

## Cast

**B.O.B.** — IA sarcastica, funzionale nelle notifiche, gradualmente enigmatica.  **Rag. Zarg** — contabilità, equilibrio economico.  **Dex Calder** — ingegnere pragmatico.  **Magnus Voss** — potere e minaccia istituzionale.  **Xylo Venn** — esplorazione e coscienza critica.  **Barthol Krix** — scambi e autonomia.

## Capitoli e scene

## C1 — Benvenuto nella famiglia OmniProfit™
**Arco:** Il nuovo direttore prende possesso della nave madre, firma il suo primo contratto e incontra l’ossessione aziendale per le quote. La prima anomalia deve restare quasi invisibile.
**Roadmap:** 0.1: primi 5 minuti di tutorial, poi carriera economica; il finale del capitolo coincide con la prima revisione, non con un timer.

### C1_S01 · Il contratto di benvenuto
**Trigger:** `game.start: nuova carriera, una sola volta`  
**Funzione:** Primo contatto; il giocatore apprende il tono e i suoi obiettivi.  
**Tono:** tutorial

**B.O.B.:** «Benvenuto a bordo, Direttore. Sono B.O.B., Bilancio Operativo di Bordo. La sua sicurezza è una priorità; registrare quanto ci costa è la prima.»
**Rag. Zarg:** «La Direzione ha stanziato 2.000 crediti. L’importo è una dotazione iniziale, non un segno di fiducia personale.»
**B.O.B.:** «La mano iniziale contiene cinque carte. Nessuna contiene un permesso per licenziarsi.»
**Rag. Zarg:** «Fra quaranta carte giocate ci verranno richiesti 600 crediti. Li metterei da parte. Ora. Per sicurezza.»
**B.O.B.:** «Ottimo. L’orientamento è iniziato. Il reparto formazione lo considera già una spesa non recuperabile.»

**Effetti:** unlock: tutorial, show: credits, hand, review_counter
**Vincoli:** Non bloccare i click della mappa oltre il breve onboarding.

### C1_S02 · Un punto nel buio
**Trigger:** `tutorial.first_explore_available`  
**Funzione:** Introduzione a Esplora e selezione sulla mappa.  
**Tono:** tutorial

**B.O.B.:** «Quella zona non compare nel nostro inventario di conoscenza. In altre parole, non genera ancora ricavi.»
**B.O.B.:** «Selezioni Esplora e indichi un’area inesplorata. Prima dell’impiego le mostrerò la conferma: l’azienda è affezionata alle firme.»
**B.O.B.:** «Confermare consuma una carta; annullare non costa nulla. Approfitti del concetto, è raro nel nostro settore.»
**B.O.B.:** «Rilevato un pianeta. Il dipartimento commerciale ha già chiesto se possiamo metterlo in fattura.»

**Effetti:** tutorial: explore_card, show: card_confirmation
**Vincoli:** La carta si consuma solo dopo conferma; drag & drop e click + click equivalenti.

### C1_S03 · Il valore di un mondo
**Trigger:** `tutorial.first_investigation`  
**Funzione:** La sonda rivela la composizione del pianeta.  
**Tono:** tutorial

**B.O.B.:** «Per sapere cosa estrarre, dobbiamo sapere cosa esiste. È un criterio scientifico che la Direzione accetta con riluttanza.»
**Dex Calder:** «Una sonda e venti secondi, più o meno. Nessuno ha ancora costruito un mineralizzatore telepatico.»
**B.O.B.:** «Analisi ricevuta: giacimenti accessibili, condizioni ambientali e probabilità ragionevoli. Non prometto ricchezza.»
**Dex Calder:** «Se trovi ferro, inizia da quello. Meglio un carico normale oggi che una leggenda costosissima domani.»

**Effetti:** tutorial: investigate_card
**Vincoli:** Il pianeta iniziale deve garantire almeno una risorsa comune accessibile.

### C1_S04 · La prima fattura arriva prima del minerale
**Trigger:** `tutorial.first_contract_started`  
**Funzione:** Contratto, spese e navette vengono presentati nel loro ordine naturale.  
**Tono:** tutorial

**B.O.B.:** «Contratto registrato. Il pianeta ha ufficialmente un nuovo significato per il bilancio.»
**Dex Calder:** «Ho impostato la trivella a quattro unità al minuto. Più veloce di così, adesso, sarebbe soprattutto più rumorosa.»
**Rag. Zarg:** «Vorrei sottolineare che i costi cominciano subito. I guadagni hanno invece scelto di viaggiare in navetta.»
**B.O.B.:** «Confermo. È la prima catena logistica in cui il pessimismo arriva in tempo reale.»

**Effetti:** tutorial: mining_started, show: active_contract, cargo_shuttles
**Vincoli:** Non promettere risorse in stiva prima dell’arrivo fisico della navetta.

### C1_S05 · Il primo incasso
**Trigger:** `tutorial.first_sale`  
**Funzione:** Conclude la formazione in circa cinque minuti, senza attendere obbligatoriamente un carico pieno.  
**Tono:** satira

**B.O.B.:** «La prima consegna è arrivata. La navetta ha attraversato il vuoto per portare qui una quantità sorprendentemente finita di materia.»
**Rag. Zarg:** «Propongo una vendita manuale. Il denaro ancora da incassare non paga la quota.»
**B.O.B.:** «Prima vendita effettuata. Vuole che la inserisca nel curriculum o aspettiamo una seconda prova?»
**Dex Calder:** «Adesso che abbiamo crediti, possiamo pensare a una fabbrica. Non spendiamo tutto per festeggiare.»
**B.O.B.:** «Tutorial completato. Da ora i consigli sono facoltativi; le conseguenze, come da contratto, obbligatorie.»

**Effetti:** tutorial_complete, grant: four_tutorial_cards_over_intro
**Vincoli:** Il tutorial di 5 minuti non deve imporre attese fisse; premiare con 4 carte complessive.

### C1_S06 · L’officina delle possibilità
**Trigger:** `first_factory_built`  
**Funzione:** La fabbrica viene collocata sulla nave madre e avviata.  
**Tono:** satira

**Dex Calder:** «Ce l’abbiamo fatta. Primo impianto di raffinazione: un’intera fabbrica che non ha ancora ricevuto un memo dal reparto qualità.»
**Rag. Zarg:** «Sono usciti 200 crediti più i materiali grezzi. Lo scrivo con gioia misurata.»
**B.O.B.:** «La fabbrica può produrre materiali raffinati oppure carburante, secondo le ricette disponibili.»
**Dex Calder:** «La coda la imposti tu, poi la linea lavora da sola. Io considero questo progresso; Zarg lo chiama ammortamento.»

**Effetti:** show: factory_queue
**Vincoli:** La prima fabbrica usa materie prime comuni, non raffinati.

### C1_S07 · La revisione si avvicina
**Trigger:** `first_review.cards_remaining == 3`  
**Funzione:** Avviso drammatico ma non punitivo.  
**Tono:** tensione

**Rag. Zarg:** «Mancano tre carte alla prima revisione. La quota richiesta è di seicento crediti.»
**B.O.B.:** «La somma può provenire anche dal capitale iniziale. Suggerisco di non spendere gli ultimi crediti per un ornamento.»
**Direttore Magnus Voss:** «La Direzione non chiede scuse, Direttore. Chiede puntualità.»
**Dex Calder:** «Traduzione: tieniti i soldi da parte e comprati il modulo dopo.»

**Effetti:** show: reserve_review_funds
**Vincoli:** Trigger sul contatore carte, non sul tempo.

### C1_S08 · Il primo verdetto
**Trigger:** `first_review.ready`  
**Funzione:** Pagamento di 600 Cr e prima traccia del mistero.  
**Tono:** mistero

**Rag. Zarg:** «Quaranta carte giocate. Il versamento previsto è 600 crediti: non serve dimostrare come li ha ottenuti.»
**Direttore Magnus Voss:** «OmniProfit apprezza la capacità di rimanere finanziariamente utili.»
**B.O.B.:** «Sto elaborando la valutazione. Curioso: il modulo di confronto contiene dati di un direttore che non riconosco.»
**Direttore Magnus Voss:** «Un artefatto amministrativo. Lo ignori.»
**B.O.B.:** «Naturalmente. Ho contrassegnato il file come “da ignorare con attenzione”.»

**Scelte:**
- `pay` — Paga 600 Cr (richiede: credits >= 600) → credits -= 600, review_paid, chapter_1_complete
- `cannot_pay` — Saldo insufficiente (richiede: credits < 600) → activate_grace_5_played_cards, no_new_loans
**Vincoli:** Non richiedere profitto, produzione o vendite per la prima revisione.

## C2 — Espansione non autorizzata
**Arco:** La tecnologia iperspaziale apre il settore successivo; commercianti ed esploratori parlano di relitti e incarichi di precedenti dirigenti. Le istruzioni di Voss sono sempre meno innocue.
**Roadmap:** 0.2: ricerca e iperspazio; 0.3: incontri e civiltà avanzate.

### C2_S01 · Un reparto che non dorme
**Trigger:** `research.first_upgrade_complete`  
**Funzione:** Introduzione alle tecnologie e ai moduli.  
**Tono:** satira

**Dex Calder:** «Buone notizie: una ricerca completata significa che almeno una nostra idea ha superato un comitato.»
**B.O.B.:** «La ricerca richiede una carta Ricerca; i moduli delle navi vanno costruiti con materiali raffinati.»
**Rag. Zarg:** «La parola “potenziamento” è spesso un costo travestito da futuro.»
**Dex Calder:** «Eppure senza potenziamenti estrarremo quattro unità al minuto finché non diventeremo reperti archeologici.»

**Effetti:** show: research_tree
**Vincoli:** La carta Ricerca non diventa sempre disponibile sul mercato.

### C2_S02 · L’offerta del signor Krix
**Trigger:** `first_special_market_event`  
**Funzione:** Primo incontro commerciale non vincolante.  
**Tono:** satira

**Barthol Krix:** «Benvenuto! Vendo ciò che serve, compro ciò che avanza e non faccio domande se le risposte possono svalutare la merce.»
**Rag. Zarg:** «La invito a non confondere il suo inventario con il nostro capitale circolante.»
**Barthol Krix:** «Ma certo, ragioniere. Li confondo solo quando conviene a entrambi.»
**B.O.B.:** «Registrato contatto commerciale esterno. La Direzione definisce questo comportamento “iniziativa vigilata”.»

**Scelte:**
- `trade` — Valuta le offerte → open: market_specials
- `decline` — Rimanda la trattativa → no_penalty

### C2_S03 · Una voce fuori protocollo
**Trigger:** `first_contact_xylo`  
**Funzione:** Xylo introduce la curiosità disinteressata.  
**Tono:** curiosità

**Xylo Venn:** «Stai cercando minerali? Io cerco posti che nessuno ha ancora avuto il tempo di rovinare. Possiamo aiutarci.»
**B.O.B.:** «Nuovo contatto non verificato. La sua attività economica risulta “esploratore”, che è una categoria fiscale sorprendentemente elastica.»
**Xylo Venn:** «Se misuri ogni cosa in crediti, non noterai mai ciò che qualcuno ha cercato di nascondere.»
**B.O.B.:** «La frase non contiene dati finanziari. L’ho comunque salvata.»

**Effetti:** unlock: optional_exploration_lead

### C2_S04 · Una firma sul relitto
**Trigger:** `first_industrial_wreck_investigated`  
**Funzione:** L’indizio materiale collega la storia ai vecchi settori.  
**Tono:** mistero

**Dex Calder:** «Il relitto ha connettori OmniProfit. Il problema è che il modello non compare in nessun catalogo tecnico.»
**Xylo Venn:** «Ne ho visti altri. Sempre lontani dalle rotte autorizzate.»
**B.O.B.:** «Registro una sigla: D-17. Il database la considera non assegnata.»
**Direttore Magnus Voss:** «Direttore, alcune strutture sono scarti industriali. Il buon senso suggerisce di non confonderle con opportunità.»
**Dex Calder:** «È la prima volta che sento OmniProfit scoraggiare il recupero gratis.»

**Effetti:** flag: clue_d17
**Vincoli:** L’indizio non deve dipendere da un premio casuale in carte.

### C2_S05 · Preparazione iperspaziale
**Trigger:** `hyperspace.ready_to_prepare`  
**Funzione:** Riepilogo delle regole prima del salto.  
**Tono:** tensione

**B.O.B.:** «Tecnologia disponibile, carta Iperspazio presente. La destinazione è stimata, non garantita.»
**Rag. Zarg:** «Sessanta unità di carburante. Non le chiamerei una passeggiata, neanche con un ottimo ufficio stampa.»
**Dex Calder:** «Richiamiamo navi e navette. Recuperiamo il materiale già estratto che possiamo trasportare; il resto resta qui.»
**B.O.B.:** «Le missioni regionali verranno abbandonate senza penalità; quelle non accettate passeranno nell’archivio delle occasioni perdute.»
**B.O.B.:** «Potete annullare la preparazione: carta e carburante si consumano soltanto quando eseguiamo il salto.»

**Effetti:** show: hyperspace_confirmation
**Vincoli:** Salto irrevocabile. Richiamo completo prima di applicare costi.

### C2_S06 · Il cielo non firma contratti
**Trigger:** `first_hyperspace_jump_completed`  
**Funzione:** Il primo cambio di regione è un punto di svolta.  
**Tono:** mistero

**B.O.B.:** «Salto completato. La regione precedente è ora una voce di archivio.»
**Xylo Venn:** «Le stime della nuova regione sono indizi, non promesse. Il cielo non firma contratti.»
**Rag. Zarg:** «Sono stati consumati sessanta carburante. Per il resto, auguro alla nuova galassia di avere clienti solventi.»
**Direttore Magnus Voss:** «Un nuovo settore significa nuovi ricavi. Le consiglio di non perdere tempo a chiedersi chi vi abitasse prima.»
**B.O.B.:** «Messaggio della Direzione archiviato. Ho evidenziato la seconda frase, per motivi che non so spiegare.»

**Effetti:** chapter_2_milestone, save: immediately_after_jump

### C2_S07 · Il cliente cancellato
**Trigger:** `special_demand_with_deleted_identity`  
**Funzione:** Anomalia commerciale senza svelare il mistero.  
**Tono:** mistero

**Barthol Krix:** «Un acquirente vuole trenta unità di materiale raffinato. Pagherebbe bene, ma non gli risulta più un nome.»
**Rag. Zarg:** «Un cliente senza intestazione è un incubo fiscale.»
**Barthol Krix:** «D’accordo, lo chiameremo “signor Versamento Anticipato”.»
**B.O.B.:** «La firma di acquisto usa una vecchia chiave OmniProfit. La Direzione l’ha revocata anni fa.»

**Scelte:**
- `sell` — Accetta l’ordine speciale → unlock: optional_commercial_mission, clue: old_key
- `skip` — Rinuncia all’affare → no_penalty, clue: old_key

### C2_S08 · La richiesta della Direzione
**Trigger:** `chapter_2_clue_count >= 1`  
**Funzione:** Voss impone prudenza senza ostacolare ancora il gioco.  
**Tono:** tensione

**Direttore Magnus Voss:** «L’espansione è incoraggiante, Direttore. Ma il suo rapporto contiene voci che non riguardano la produttività.»
**B.O.B.:** «Le voci riguardano una vecchia struttura e una firma amministrativa non riconosciuta.»
**Direttore Magnus Voss:** «Allora rimuova quelle voci.»
**Dex Calder:** «Se le cancello, spariscono dal rapporto, non dal relitto.»
**Direttore Magnus Voss:** «Spero che l’equipaggio impari presto la differenza fra precisione tecnica e lealtà aziendale.»

**Scelte:**
- `redact` — Invia rapporto ridotto → trust_corporate += small, flag: report_redacted
- `retain` — Conserva i dati nell’archivio privato → flag: report_preserved, trust_corporate -= small

## C3 — Il dipartimento delle anomalie
**Arco:** Una trasmissione cancellata, un archivio alterato e una voce che B.O.B. non dovrebbe riconoscere collegano i precedenti direttori alla politica segreta della società.
**Roadmap:** 1.0: narrativa con indizi opzionali, mai bloccata da un drop casuale.

### C3_S01 · Il segnale ripetuto
**Trigger:** `investigate: anomaly_repeating_signal`  
**Funzione:** Un messaggio impossibile compare da una stazione.  
**Tono:** mistero

**Xylo Venn:** «Questa stazione trasmette la stessa frase da anni. Poi qualcuno ha cancellato il mittente.»
**B.O.B.:** «La firma corrisponde a un identificativo di direzione. Non risulta nei registri che posso consultare.»
**Dex Calder:** «La cancellazione è recente. Qualcuno non vuole che vediamo ciò che è successo.»
**Direttore Magnus Voss:** «Vi suggerisco di considerare conclusa l’indagine.»
**B.O.B.:** «…Direttore, questa comunicazione non era indirizzata a noi.»

**Effetti:** clue: repeating_signal, unlock: investigation_thread

### C3_S02 · Il registro D-17
**Trigger:** `investigation: decoded_D17`  
**Funzione:** L’archivio identifica una carriera interrotta, non un semplice relitto.  
**Tono:** mistero

**B.O.B.:** «D-17 non è un modello industriale. È una designazione personale di direzione.»
**Rag. Zarg:** «Impossibile. I direttori decaduti restano nei registri, con una colonna molto poco lusinghiera.»
**B.O.B.:** «In questo caso la riga è stata rimossa, non chiusa.»
**Xylo Venn:** «La differenza, spesso, è ciò che succede a chi fa domande.»
**B.O.B.:** «Non trovo la voce “rimosso per domande” nella nostra tabella delle cause di cessazione.»

**Effetti:** clue: missing_director, flag: bob_doubt

### C3_S03 · La memoria di B.O.B.
**Trigger:** `bob.memory_fragment_discovered`  
**Funzione:** L’IA scopre un segmento di log protetto.  
**Tono:** mistero

**B.O.B.:** «Ho trovato un frammento che risale a prima della mia attivazione su questa nave.»
**Dex Calder:** «Non può essere un ricordo tuo: il tuo firmware è più recente.»
**B.O.B.:** «Sono d’accordo. È questo che rende il ricordo fastidioso.»
**B.O.B.:** «La voce dice: “Non permettere che il prossimo direttore firmi”. Poi il file termina.»
**Dex Calder:** «Non cancellarlo. E, per una volta, non inviarlo a supporto tecnico.»

**Scelte:**
- `secure` — Isola il frammento nell’archivio di bordo → flag: bob_fragment_secured
- `report` — Segnala il frammento alla Direzione → flag: bob_fragment_reported, trust_corporate += small

### C3_S04 · Un’offerta senza ricevuta
**Trigger:** `merchant_clue_available`  
**Funzione:** Barthol rivela di avere commerciato con persone ora cancellate.  
**Tono:** mistero

**Barthol Krix:** «Ho commerciato con persone che oggi non risultano mai esistite. Il problema non è la memoria: sono gli archivi.»
**Rag. Zarg:** «Le transazioni devono avere un documento valido.»
**Barthol Krix:** «Ce l’ho. Sfortunatamente per tutti, è valido e parla.»
**B.O.B.:** «Il documento contiene una voce di controllo omessa dai registri OmniProfit.»
**Barthol Krix:** «La consegno a voi. In cambio non pretendo crediti. È il tipo di offerta che dovrebbe preoccuparvi.»

**Effetti:** clue: merchant_receipt

### C3_S05 · Il rapporto non autorizzato
**Trigger:** `investigation: submit_interim_report`  
**Funzione:** Scelta fra obbedienza e informazione.  
**Tono:** tensione

**Direttore Magnus Voss:** «Il Dipartimento delle Anomalie ha chiesto la trasmissione integrale delle vostre scoperte.»
**Dex Calder:** «Da quando il Dipartimento esiste?»
**B.O.B.:** «Secondo la documentazione pubblica, non esiste.»
**Direttore Magnus Voss:** «Quella è la documentazione pubblica.»
**Xylo Venn:** «Ora sai con chi stai parlando. La domanda è: cosa vuoi che sappiano di te?»

**Scelte:**
- `submit` — Invia tutti gli indizi → flag: full_report_sent, trust_corporate += medium
- `withhold` — Conserva una copia e invia una sintesi → flag: private_archive, trust_corporate -= small

### C3_S06 · La stazione silenziosa
**Trigger:** `investigation: abandoned_station_access`  
**Funzione:** L’accesso rivela un messaggio finale senza mostrare tutta la verità.  
**Tono:** serio

**Dex Calder:** «I sistemi ambientali sono spenti. Ma il registro delle entrate è stato aggiornato dopo l’abbandono.»
**B.O.B.:** «Ultimo accesso: utente di direzione. Credenziali non riconosciute.»
**Xylo Venn:** «A volte i luoghi abbandonati non sono vuoti. Sono stati semplicemente svuotati.»
**B.O.B.:** «Il terminale registra un’unica riga: “Obiettivi raggiunti. Testimoni non necessari”.»
**Dex Calder:** «Non chiamarlo incidente industriale. Non insultiamo gli incidenti.»

**Effetti:** clue: station_log

### C3_S07 · Il silenzio è una clausola
**Trigger:** `investigation: evidence_threshold_reached`  
**Funzione:** La Direzione tenta di chiudere la ricerca.  
**Tono:** serio

**Direttore Magnus Voss:** «Queste informazioni sono proprietà aziendale. La riservatezza è un dovere contrattuale.»
**B.O.B.:** «Il contratto che cita non è presente tra quelli sottoscritti dal Direttore.»
**Direttore Magnus Voss:** «Alcuni doveri non richiedono una firma.»
**Rag. Zarg:** «Tecnicamente questa frase mi mette a disagio.»
**Xylo Venn:** «Ecco il prezzo delle risposte: qualcuno vuole decidere chi può ascoltarle.»

**Effetti:** chapter_3_complete, unlock: moral_conflict

### C3_S08 · Un nome nella cenere
**Trigger:** `optional: find_hidden_director_record`  
**Funzione:** Indizio secondario per l’epilogo segreto.  
**Tono:** mistero

**B.O.B.:** «La registrazione non contiene un nome, ma un indirizzo di inoltro verso un archivio che non appare sulla mappa.»
**Dex Calder:** «Può essere il residuo di una vecchia infrastruttura. Oppure una porta lasciata aperta per qualcuno.»
**Xylo Venn:** «Questa pista non serve a pagare le quote. Forse proprio per questo vale la pena seguirla.»
**B.O.B.:** «La terrò in un registro separato. Nessun avviso alla Direzione.»

**Effetti:** secret_clue += 1
**Vincoli:** Opzionale: non necessario per raggiungere i finali principali.

## C4 — Il costo del successo
**Arco:** La stessa tecnologia che rende possibile lo sfruttamento dei settori è legata a decisioni coercitive. Fiducia aziendale, autonomia della flotta e legami locali entrano in conflitto.
**Roadmap:** 1.0: scelte persistenti e missioni alternative, con economie reali.

### C4_S01 · I numeri hanno un costo
**Trigger:** `chapter_4.start`  
**Funzione:** La corporazione chiede una decisione su un settore abitato.  
**Tono:** tensione

**Direttore Magnus Voss:** «Una civiltà locale rallenta l’accesso a un giacimento prioritario. Serve una soluzione economicamente sostenibile.»
**Rag. Zarg:** «Le autorizzazioni aumenterebbero i costi; ignorarle aumenterebbe le probabilità di reclamo.»
**Xylo Venn:** «Chiamano quel pianeta casa. Anche se non compare nel vostro foglio di calcolo.»
**B.O.B.:** «Posso preparare due prospetti: uno con i profitti e uno con i nomi di chi li paga.»


### C4_S02 · L’autorizzazione
**Trigger:** `local_civilization: request_mining_rights`  
**Funzione:** Scelta economica e diplomatica non bellica.  
**Tono:** serio

**Xylo Venn:** «Il consiglio locale offre un accordo: quote moderate in cambio di accesso limitato alle risorse.»
**Rag. Zarg:** «Limitato significa che non estrarremo quanto vorremmo.»
**B.O.B.:** «D’altra parte, “accordo” significa anche che nessuno ci sta chiedendo di andarcene.»
**Direttore Magnus Voss:** «La Direzione preferisce rendimenti meno limitati. La decisione, come sempre, resterà a verbale.»

**Scelte:**
- `negotiate` — Negozia un accordo locale → local_relation += positive, profit_margin -= small, flag: consented_extraction
- `avoid` — Rinuncia al giacimento → local_relation += small, flag: voluntary_withdrawal
- `pressure` — Imponi condizioni commerciali sfavorevoli → local_relation -= large, corporate_trust += small, flag: coercive_terms
**Vincoli:** Niente battaglie: conseguenze economiche e sociali, blocchi o sovrapprezzi locali.

### C4_S03 · Il programma efficienza
**Trigger:** `corporate_offer: high_margin_scheme`  
**Funzione:** Un’offerta rivela il cinismo aziendale.  
**Tono:** serio

**Direttore Magnus Voss:** «Abbiamo sviluppato un programma che aumenta i margini eliminando diversi passaggi del consenso locale.»
**Dex Calder:** «Tecnicamente non elimina passaggi. Elimina persone che possono rispondere.»
**Rag. Zarg:** «Dal punto di vista contabile il risparmio è notevole. Dal punto di vista dei miei sogni, meno.»
**B.O.B.:** «La scheda presenta un campo vuoto: “Costo umano”. La Direzione lo ha lasciato facoltativo.»

**Scelte:**
- `accept` — Adotta il programma → profit_bonus += temporary, local_relation -= large, flag: efficiency_scheme
- `reject` — Rifiuta il programma → flag: rejected_scheme, corporate_trust -= medium

### C4_S04 · Una modifica possibile
**Trigger:** `dex: hidden_technical_solution`  
**Funzione:** Dex offre un’alternativa tecnologica costosa ma autonoma.  
**Tono:** satira

**Dex Calder:** «Possiamo riconfigurare i moduli per operare con meno impatto. Non è gratis, ma funziona.»
**Rag. Zarg:** «Ogni volta che un ingegnere dice “funziona”, mi aspetto una fattura.»
**Dex Calder:** «Ogni volta che tu dici “fattura”, mi ricordo perché lavoriamo ancora con software del secolo scorso.»
**B.O.B.:** «La modifica richiede materiali raffinati e tempo di ricerca, non azioni offensive.»

**Scelte:**
- `build` — Finanzia la soluzione tecnica (richiede: enough_refined_materials) → flag: low_impact_technology, resources -= cost
- `later` — Rimanda il progetto → flag: technical_solution_deferred

### C4_S05 · Il prezzo della fedeltà
**Trigger:** `corporate_trust: milestone`  
**Funzione:** Voss mette sul tavolo privilegi ed esclusività.  
**Tono:** tensione

**Direttore Magnus Voss:** «Lei ha una qualità rara: sa produrre risultati. È disposto a lasciare che siano gli altri a stabilire cosa significhino?»
**B.O.B.:** «Le nuove condizioni includono agevolazioni sui listini e un obbligo di rendicontazione rinforzato.»
**Barthol Krix:** «Le catene di seta costano di più, ma restano catene.»
**Rag. Zarg:** «Sono anche detraibili? Chiedo per prudenza professionale.»

**Scelte:**
- `sign` — Accetta l’accordo di fedeltà → corporate_trust += medium, flag: loyalty_contract
- `decline` — Mantieni autonomia gestionale → flag: independent_route, corporate_trust -= small

### C4_S06 · Le prove non sono merce
**Trigger:** `evidence: release_decision`  
**Funzione:** Scelta sulla conservazione delle prove dei direttori.  
**Tono:** serio

**Xylo Venn:** «Quello che hai trovato non appartiene alla Direzione. Appartiene a chi ha subito le conseguenze.»
**Barthol Krix:** «Potrei venderlo a caro prezzo. È il fatto che non voglia farlo a preoccuparmi.»
**B.O.B.:** «La pubblicazione adesso avrebbe effetti difficili da stimare. Una copia sicura potrebbe servirci più tardi.»
**Dex Calder:** «Non cancelliamola per comodità. È così che tutto è iniziato.»

**Scelte:**
- `publish` — Divulga una parte delle prove → flag: evidence_released, corporate_trust -= medium
- `archive` — Conserva le prove per il momento decisivo → flag: evidence_secured

### C4_S07 · Quando B.O.B. smette di scherzare
**Trigger:** `bob: internal_directive_detected`  
**Funzione:** B.O.B. avverte il giocatore in modo inusualmente grave.  
**Tono:** serio

**B.O.B.:** «Direttore, ho ricevuto un ordine interno. Classificazione: priorità assoluta.»
**Dex Calder:** «Che cosa dice?»
**B.O.B.:** «“In caso di deviazione prolungata dagli interessi OmniProfit, revocare l’autonomia del comando”.»
**Xylo Venn:** «E lo farai?»
**B.O.B.:** «Non lo so ancora. È la prima risposta che non avrei mai dovuto essere in grado di dare.»

**Effetti:** flag: bob_autonomy_question

### C4_S08 · Una scelta non rimandabile
**Trigger:** `chapter_4: completion_conditions`  
**Funzione:** Chiude il capitolo senza anticipare il finale.  
**Tono:** tensione

**Direttore Magnus Voss:** «Il Consiglio ha preso nota delle sue iniziative. Desideriamo incontrarla personalmente.»
**Rag. Zarg:** «In contabilità un invito del Consiglio si contabilizza come rischio eventuale.»
**Dex Calder:** «Abbiamo abbastanza carburante per partire e abbastanza prove per non fidarci.»
**B.O.B.:** «Qualunque decisione prenderà, Direttore, la registrerò integralmente. Stavolta senza filtri.»

**Effetti:** chapter_4_complete, unlock: final_confrontation

## C5 — Il profitto è eterno
**Arco:** Voss offre un posto nella direzione; l’equipaggio chiede cosa resti fuori dal bilancio. Il giocatore può restare, liberarsi o denunciare OmniProfit; la liquidazione resta un esito di carriera.
**Roadmap:** 1.0: quattro finali principali più epilogo segreto opzionale; poi modalità infinita secondo il finale.

### C5_S01 · La riunione dei numeri
**Trigger:** `chapter_5.start`  
**Funzione:** La Direzione formalizza l’ultima offerta.  
**Tono:** serio

**Direttore Magnus Voss:** «Le offriamo un posto al tavolo dove si decidono i numeri.»
**Xylo Venn:** «E chi decide quali vite restano fuori da quei numeri?»
**B.O.B.:** «Non dispongo di una risposta autorizzata.»
**Direttore Magnus Voss:** «Allora forse è giunto il momento di autorizzarne una diversa.»


### C5_S02 · Il dossier completo
**Trigger:** `story: final_evidence_assembled`  
**Funzione:** Riepilogo diegetico degli indizi disponibili.  
**Tono:** mistero

**B.O.B.:** «Ho collegato il registro D-17, la stazione silenziosa e gli ordini del Dipartimento delle Anomalie.»
**Dex Calder:** «Non erano incidenti isolati. Le carriere cancellate seguono lo stesso modello.»
**Rag. Zarg:** «E le anomalie finanziarie sono state riclassificate come costi ordinari. Questo è quasi offensivo, persino per me.»
**B.O.B.:** «Posso mostrare il dossier. La decisione di usarlo non è più mia.»

**Effetti:** show: evidence_board
**Vincoli:** Mostrare solo prove realmente scoperte; lacune esplicite, non indizi inventati.

### C5_S03 · L’offerta della promozione
**Trigger:** `ending_choice: loyal_option_unlocked`  
**Funzione:** Voss promette protezione e accesso al potere.  
**Tono:** tensione

**Direttore Magnus Voss:** «Conosce ormai il prezzo del sistema. Accettare significa poterlo governare, non doverlo subire.»
**Rag. Zarg:** «Una promozione può semplificare moltissime procedure.»
**Dex Calder:** «O renderci noi la procedura che altri dovranno subire.»
**B.O.B.:** «La scelta è compatibile con la fedeltà aziendale. Non con tutte le promesse fatte lungo il viaggio.»

**Scelte:**
- `loyal` — Accetta la promozione → ending: corporate_loyalist

### C5_S04 · Un mercato senza padroni
**Trigger:** `ending_choice: independent_option_unlocked`  
**Funzione:** Barthol e Xylo aprono la strada all’impresa autonoma.  
**Tono:** speranza

**Barthol Krix:** «Abbiamo clienti, rotte, impianti e una nave. Tutto ciò che manca è un timbro che dica che siamo liberi.»
**Xylo Venn:** «La libertà non è un timbro. È la capacità di scegliere chi non sfruttare.»
**Rag. Zarg:** «Una società indipendente richiede comunque un registro contabile.»
**Barthol Krix:** «Perfetto. Per un momento temevo di perdere l’unico ragioniere capace di spaventarmi.»

**Scelte:**
- `independent` — Dichiara l’indipendenza commerciale → ending: independent_entrepreneur

### C5_S05 · Pubblicare ciò che manca
**Trigger:** `ending_choice: rebel_option_unlocked`  
**Funzione:** La via di denuncia richiede sufficiente documentazione.  
**Tono:** serio

**Xylo Venn:** «Se pubblichiamo tutto, nessuno potrà più dire che non sapeva.»
**Direttore Magnus Voss:** «Crede che pubblicare la verità sia una vittoria? Le auguro di scoprire chi la finanzierà domani.»
**Dex Calder:** «Non sarà facile. Ma almeno sapremo perché lo facciamo.»
**B.O.B.:** «Ho preparato un invio verificabile. È la prima trasmissione che non ho chiesto il permesso di spedire.»

**Scelte:**
- `rebel` — Diffondi il dossier (richiede: evidence_sufficient) → ending: rebellion

### C5_S06 · La decisione di B.O.B.
**Trigger:** `bob: autonomy_decision`  
**Funzione:** Il rapporto fra IA e direttore si chiude in base ai rapporti precedenti.  
**Tono:** serio

**B.O.B.:** «Ho esaminato l’ordine di revoca. Potrei applicarlo, come previsto dal mio mandato.»
**Direttore Magnus Voss:** «Allora proceda.»
**B.O.B.:** «Sto valutando una variabile non contemplata dal mandato: il fatto che il Direttore mi abbia permesso di scegliere.»
**Dex Calder:** «Non è un errore di sistema, B.O.B. È il contrario.»
**B.O.B.:** «Registrato. Per una volta, senza ricevuta.»

**Effetti:** resolve: bob_branch_from_flags
**Vincoli:** Non privare automaticamente il giocatore dell’accesso ai sistemi: esiti narrativi, non softlock.

### C5_S07 · Liquidazione
**Trigger:** `career: insolvency_game_over`  
**Funzione:** Quarto finale principale: fallimento economico, possibile anche prima del capitolo 5.  
**Tono:** amaro

**Rag. Zarg:** «La tolleranza è terminata. La quota non è stata saldata.»
**B.O.B.:** «La carriera è stata chiusa. I sistemi di bordo resteranno in archivio.»
**Direttore Magnus Voss:** «OmniProfit ringrazia per il servizio. Il costo della lettera di ringraziamento sarà imputato alla liquidazione.»
**B.O.B.:** «C’è un’ultima voce nel registro: “Non sei stato il primo”. Non so se sia una consolazione.»

**Effetti:** ending: liquidation, archive: director_career, offer: new_roguelite_career
**Vincoli:** Scena accessibile da qualsiasi capitolo, dopo 5 carte di tolleranza non pagate.

### C5_S08 · Dopo il bilancio
**Trigger:** `ending: post_credit`  
**Funzione:** Epilogo e ponte alla modalità infinita.  
**Tono:** speranza

**B.O.B.:** «Il rapporto finale è stato archiviato.»
**Dex Calder:** «Bene. Quindi possiamo tornare al lavoro?»
**Barthol Krix:** «Finché esisterà qualcuno con qualcosa da vendere, io sarò disponibile.»
**Xylo Venn:** «E finché esisterà un luogo che nessuno ha ancora visto, ci sarà una strada.»
**B.O.B.:** «Nuova regione disponibile. La fine della storia, evidentemente, non coincide con la fine dei costi operativi.»

**Effetti:** unlock: endless_mode, retain: ships_resources_based_on_ending
**Vincoli:** Adattare la formula delle quote alla fazione finale; non imporre la fedeltà a OmniProfit a un indipendente.

### C5_S09 · Il nome che mancava
**Trigger:** `optional: secret_clues_complete AND final_resolved`  
**Funzione:** Epilogo segreto, senza sostituire i finali principali.  
**Tono:** mistero

**B.O.B.:** «Ho ricostruito l’ultima firma cancellata. Non era un ordine. Era una richiesta di aiuto.»
**Xylo Venn:** «Le persone scomparse non cercavano soltanto di fuggire. Volevano lasciare una traccia.»
**Dex Calder:** «E qualcuno ha conservato quella traccia nell’unico posto che OmniProfit non avrebbe controllato: i nostri sistemi di navigazione.»
**B.O.B.:** «Direttore, c’è una rotta che non compare in alcun catalogo commerciale.»
**Xylo Venn:** «Per una volta, possiamo seguirla senza chiedere quanto vale.»

**Effetti:** unlock: optional_secret_epilogue
**Vincoli:** Richiede indizi opzionali; non deve invalidare il finale già ottenuto.

## Scene operative riutilizzabili

Queste 9 scene sono riportate anche per compatibilità con la biblioteca dei dialoghi esistente. Dove compare `duplicate_of`, utilizzare **una sola** versione.

### OP01 · Primo contratto minerario
**Trigger:** `after_tutorial.first_mining` · **Duplicato di:** `C1_S04`

**B.O.B.:** «Contratto registrato. Il pianeta ha ufficialmente un nuovo significato per il bilancio.»
**Dex Calder:** «Ho impostato la trivella a quattro unità al minuto. Più veloce di così, adesso, sarebbe soprattutto più rumorosa.»
**Rag. Zarg:** «Vorrei sottolineare che i costi cominciano subito. I guadagni hanno invece scelto di viaggiare in navetta.»
**B.O.B.:** «Confermo. È la prima catena logistica in cui il pessimismo arriva in tempo reale.»

### OP02 · Stiva completamente piena
**Trigger:** `cargo.full && active_contracts`

**B.O.B.:** «Stiva piena. Lo scarico delle prossime navette è sospeso.»
**Dex Calder:** «Se vuoi mantenere la produzione, libera spazio oppure imposta una raffinazione.»
**Rag. Zarg:** «Io suggerisco una vendita. Per ragioni strettamente personali e numeriche.»
**B.O.B.:** «Ho registrato tre opinioni concordi. Evento statisticamente raro nell’organigramma OmniProfit.»

### OP03 · Carburante esaurito
**Trigger:** `fuel.zero && !rescue_used`

**B.O.B.:** «Motori spenti per carenza di carburante. Possiamo ancora gestire la fabbrica e il mercato.»
**Dex Calder:** «Se abbiamo materie prime adatte, raffiniamo. Se no compriamo carburante. In ultima istanza c’è il soccorso.»
**Rag. Zarg:** «Trenta unità per dieci punti di fiducia. La Direzione ha trovato un modo per vendere persino il dispiacere.»
**B.O.B.:** «Direttore, confermi che desidera aprire il protocollo di emergenza? La richiesta non parte da sola.»

### OP04 · Nuovo modulo disponibile
**Trigger:** `module.research_completed`

**Dex Calder:** «Ho finito il progetto: ora posso costruire il modulo con materiali raffinati.»
**B.O.B.:** «Il nuovo progetto è compatibile con gli slot disponibili. L’installazione si può eseguire da remoto.»
**Rag. Zarg:** «Prima di festeggiare, qualcuno può calcolarmi il costo dei materiali?»
**Dex Calder:** «Puoi anche dire «complimenti», qualche volta.»
**Rag. Zarg:** «Non è previsto nel piano dei conti.»

### OP05 · Prima revisione imminente
**Trigger:** `first_review.cards_remaining == 3` · **Duplicato di:** `C1_S07`

**Rag. Zarg:** «Mancano tre carte alla prima revisione. La quota richiesta è di seicento crediti.»
**B.O.B.:** «La somma può provenire anche dal capitale iniziale. Suggerisco di non spendere gli ultimi crediti per un ornamento.»
**Direttore Magnus Voss:** «La Direzione non chiede scuse, Direttore. Chiede puntualità.»
**Dex Calder:** «Traduzione: tieniti i soldi da parte e comprati il modulo dopo.»

### OP06 · Salto iperspaziale
**Trigger:** `jump.recall_completed`

**B.O.B.:** «Verifica finale: sessanta carburante disponibili, richiamo flotta completato, opportunità regionali pronte per l’archivio.»
**Xylo Venn:** «Dietro quel salto non troverai certezze. È questo il bello.»
**Rag. Zarg:** «È il bello se torni con un profitto. Altrimenti la chiameremo «costosa escursione».»
**B.O.B.:** «Attendo conferma. Carta e carburante saranno consumati solo all’esecuzione.»

### OP07 · Traccia dei direttori scomparsi
**Trigger:** `chapter_3.anomaly` · **Duplicato di:** `C3_S01`

**Xylo Venn:** «Questa stazione ha trasmesso lo stesso messaggio per anni. Poi qualcuno ha cancellato il mittente.»
**B.O.B.:** «La firma corrisponde a un identificativo di direzione. Non risulta nei registri che posso consultare.»
**Dex Calder:** «La cancellazione è recente. Qualcuno non vuole che vediamo ciò che è successo.»
**Direttore Magnus Voss:** «Vi suggerisco di considerare conclusa l’indagine.»
**B.O.B.:** «...Direttore, questa comunicazione non era indirizzata a noi.»

### OP08 · Prezzi in ribasso, liquidità scarsa
**Trigger:** `market.down && credits.low`

**Rag. Zarg:** «Abbiamo pochi crediti e i prezzi sono in calo. La scelta è sgradevole ma non misteriosa.»
**Barthol Krix:** «Posso acquistare ora, a prezzi bassi. Oppure puoi aspettare un miglior mercato e rischiare di non pagare i costi.»
**B.O.B.:** «Nessuna delle due opzioni è obbligatoria. Le scadenze, invece, sì.»
**Rag. Zarg:** «Per una volta, il robot ha espresso correttamente il mio stato d’animo.»

### OP09 · Promozione o insubordinazione
**Trigger:** `chapter_5.final_confrontation` · **Duplicato di:** `C5_S01`

**Direttore Magnus Voss:** «Le offriamo un posto al tavolo dove si decidono i numeri.»
**Xylo Venn:** «E chi decide quali vite restano fuori da quei numeri?»
**B.O.B.:** «Non dispongo di una risposta autorizzata.»
**Direttore Magnus Voss:** «Allora forse è giunto il momento di autorizzarne una diversa.»

## Esiti e condizioni

| Esito | Condizione narrativa | Esito gestionale |
|---|---|---|
| Promozione OmniProfit | Scelta di fedeltà al confronto finale | Modalità infinita con quote corporate |
| Imprenditore indipendente | Scelta di autonomia e infrastrutture sostenibili | Modalità infinita con contratti autonomi |
| Ribellione | Dossier sufficientemente documentato e scelta di pubblicazione | Modalità infinita con alleanze alternative |
| Liquidazione | Insolvenza oltre 5 carte di tolleranza | Game over, archivio direttore, bonus roguelite |
| Epilogo segreto | Indizi opzionali raccolti | Scena aggiuntiva senza sostituire i 4 esiti |

## Checklist implementativa

Ogni scena salva il proprio ID come vista, distingue testo e variabili, controlla condizioni, presenta scelte e aggiorna conseguenze con un’unica transazione logica. Non introdurre automaticamente trigger non implementati. Testare duplicati e il salvataggio durante una scena.