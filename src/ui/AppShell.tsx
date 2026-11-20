import { useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./TopBar";
import { CardHandBar } from "./CardHandBar";
import { PlanetPanel } from "./panels/PlanetPanel";
import { ManagementPanel } from "./panels/ManagementPanel";
import { MarketPanel } from "./panels/MarketPanel";
import { MissionsPanel } from "./panels/MissionsPanel";
import { CivilizationsPanel } from "./panels/CivilizationsPanel";
import { EventsPanel } from "./panels/EventsPanel";
import { CardMarketPanel } from "./panels/CardMarketPanel";
import { NotificationLogPanel } from "./panels/NotificationLogPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { ResearchPanel } from "./panels/ResearchPanel";
import { EventoCriticoModal } from "./components/EventoCriticoModal";
import { EVENTO_DEFINITIONS } from "../domain/events";
import { PixiMapView, type PixiMapViewHandle } from "../render/PixiMapView";
import { useEngine, useGameState } from "./useEngine";
import { useAutosave } from "./useAutosave";
import { CARD_DEFINITIONS } from "../domain/cards";
import type { CardDefinition, ResourceType } from "../domain/types";
import { CardActionFlash } from "./components/CardActionFlash";
import { NarrativeToast } from "./components/NarrativeToast";
import { useNpcChatter } from "./hooks/useNpcChatter";
import { trovaPassoTutorialAttivo } from "../domain/tutorialLocks";
import { validaGiocaCarta } from "../simulation/cardEffects";
import { dettagliConfermaCarta } from "./cardConfirmDetails";
import { ConfirmModal } from "./components/ConfirmModal";
import { RevisionBanner } from "./RevisionBanner";
import { GameOverOverlay } from "./GameOverOverlay";
import { TutorialPanel } from "./TutorialPanel";
import { NarrativePanel } from "./panels/NarrativePanel";
import { EndingOverlay } from "./EndingOverlay";
import { OverlayPanel } from "./components/OverlayPanel";
import { audioEngine } from "../audio/audioEngine";
import type { BersaglioCarta } from "../simulation/commands";
import type { CardInstance, NotificationEntry, Vector2 } from "../domain/types";
import "./AppShell.css";

let commandCounter = 0;
function nextCommandId(prefix: string): string {
  commandCounter += 1;
  return `${prefix}-${commandCounter}`;
}

export function AppShell() {
  const engine = useEngine();
  const state = useGameState();
  const mapRef = useRef<PixiMapViewHandle>(null);
  // Richiesta utente: il gioco non si salvava, perche' l'autosave viveva
  // dentro SavePanel (montato solo a overlay Impostazioni aperto) e quindi
  // smetteva di girare non appena l'utente lo chiudeva. Qui in AppShell,
  // sempre montato, gira per tutta la durata della partita.
  const ultimoSalvataggio = useAutosave(engine);
  const chiacchiericcio = useNpcChatter(state);

  // Richiesta utente: nel Mercato non mostrare righe per materiali mai
  // posseduti (stessa logica "si sblocca alla prima unita' in stiva" dei
  // contatori minerali in TopBar) — riduce il disordine iniziale della
  // lista a soli i materiali gia' incontrati in partita.
  const [risorseMaiPossedute, setRisorseMaiPossedute] = useState<Set<ResourceType>>(new Set());
  const risorseMaiPosseduteRef = useRef(risorseMaiPossedute);
  useEffect(() => {
    const nuove = (Object.keys(state.mothership.stivaCarico) as ResourceType[]).filter(
      (r) => !risorseMaiPosseduteRef.current.has(r) && (state.mothership.stivaCarico[r] ?? 0) > 0,
    );
    if (nuove.length === 0) return;
    const aggiornato = new Set(risorseMaiPosseduteRef.current);
    for (const r of nuove) aggiornato.add(r);
    risorseMaiPosseduteRef.current = aggiornato;
    setRisorseMaiPossedute(aggiornato);
  }, [state.mothership.stivaCarico]);
  // Richiesta utente: "se non posso usare un comando... devi dirmi cosa
  // manca" — finora un comando non attivabile (requisiti mancanti) veniva
  // semplicemente ignorato al click, senza alcun messaggio. Il motivo di
  // rifiuto gia' calcolato da validaGiocaCarta/validaSaltoIperspaziale viene
  // mostrato dentro il tooltip della carta stessa (richiesta utente: un
  // banner fisso al centro si sovrapponeva al tooltip della carta cliccata),
  // quindi serve sapere anche a quale carta appartiene.
  const [avvisoRequisito, setAvvisoRequisito] = useState<{ id: number; testo: string; cardInstanceId: string } | null>(null);
  const avvisoRequisitoIdRef = useRef(0);
  useEffect(() => {
    if (!avvisoRequisito) return;
    const timer = window.setTimeout(() => setAvvisoRequisito(null), 4000);
    return () => window.clearTimeout(timer);
  }, [avvisoRequisito]);

  const [dialogoAutoAvanza, setDialogoAutoAvanza] = useState(false);
  // Bottone ">>>" per debug/test (richiesta utente): avanza a raffica
  // attraverso tutti i dialoghi in coda, incluse le scene successive che si
  // caricano man mano che la coda si svuota, finche' non ne resta piu'
  // nessuno. Si autodisattiva da solo quando non c'e' piu' nulla da saltare.
  const [saltaVeloceAttivo, setSaltaVeloceAttivo] = useState(false);
  const dialogoAttuale = chiacchiericcio.attuale;
  // Richiesta utente: dopo che il tutorial ha chiesto esplicitamente di
  // usare Radar/Investiga/Contratto minerario, solo quel comando resta
  // utilizzabile finche' non viene usato davvero (vedi tutorialLocks.ts).
  const passoTutorialAttivo = trovaPassoTutorialAttivo(state, chiacchiericcio.sceneVista);
  // `chiacchiericcio.chiudi` e' una funzione nuova a ogni render di
  // AppShell (il game loop fa ri-renderizzare spesso): tenuta in un ref
  // cosi' l'effetto sotto non si cancella/riarma a ogni render, altrimenti
  // il timer da 20ms non arrivava quasi mai a scattare e l'avanzamento
  // procedeva a scatti invece che a raffica.
  const chiudiDialogoRef = useRef(chiacchiericcio.chiudi);
  useEffect(() => {
    chiudiDialogoRef.current = chiacchiericcio.chiudi;
  }, [chiacchiericcio.chiudi]);
  useEffect(() => {
    if (!saltaVeloceAttivo) return;
    if (!dialogoAttuale) {
      // Coda momentaneamente vuota: puo' essere la fine davvero, oppure solo
      // l'istante tra una scena scriptata e la successiva che sta per
      // caricarsi (vedi useNpcChatter). Si aspetta un attimo prima di
      // considerarla la fine, altrimenti lo stop scattava quasi sempre a
      // meta' di scene lunghe su piu' righe, fermando il salto in anticipo.
      const timer = window.setTimeout(() => setSaltaVeloceAttivo(false), 300);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => chiudiDialogoRef.current(), 20);
    return () => window.clearTimeout(timer);
  }, [saltaVeloceAttivo, dialogoAttuale]);

  const pianetiScoperti = useMemo(() => state.pianeti.filter((p) => p.scoperto), [state.pianeti]);
  const relittiScoperti = useMemo(() => state.campiRelitti.filter((r) => r.scoperto), [state.campiRelitti]);
  const pianetaSelezionato = pianetiScoperti.find((p) => p.id === state.pianetaSelezionatoId) ?? null;
  const [relittoSelezionatoId, setRelittoSelezionatoId] = useState<string | null>(null);

  // --- Selezione/trascinamento carta (click-carta oppure drag & drop) -------
  const [cartaSelezionataClick, setCartaSelezionataClick] = useState<CardInstance | null>(null);
  const [cartaInTrascinamento, setCartaInTrascinamento] = useState<CardInstance | null>(null);
  const cartaArmata = cartaInTrascinamento ?? cartaSelezionataClick;

  // --- Proposta in attesa di conferma (A2: valida -> conferma -> applica) ---
  const [propostaCarta, setPropostaCarta] = useState<{ carta: CardInstance; bersaglio: BersaglioCarta } | null>(null);

  // --- Finale della campagna narrativa (Macrostep 10): dismissibile, stato locale. ---
  const [finaleChiuso, setFinaleChiuso] = useState(false);

  // --- Overlay centrati sul gioco (bottoniera Missioni/Mercato/Mercato
  // carte/Registro notifiche/Impostazioni, dettagli pianeta alla
  // selezione): vivevano prima fissi nella barra laterale, spostati qui su
  // richiesta per lasciare la mappa piu' libera. ---
  const [overlayAperto, setOverlayAperto] = useState<
    "missioni" | "mercato" | "mercatoCarte" | "notifiche" | "impostazioni" | "ricerca" | null
  >(null);
  const [pannelloPianetaChiuso, setPannelloPianetaChiuso] = useState(false);

  // Richiesta utente: su mobile le due barre laterali devono stare chiuse
  // di default e aprirsi solo tramite un bottone, lasciando la mappa libera
  // al centro. Su desktop questo stato resta inutilizzato (le barre sono
  // sempre visibili via CSS, vedi AppShell.css).
  const [drawerMobileAperto, setDrawerMobileAperto] = useState<"sinistra" | "destra" | null>(null);

  // Feedback sonoro per nuove notifiche (B11: "feedback UI"): montato qui
  // (non nel pannello Registro notifiche, ora un overlay su richiesta) cosi'
  // suona anche quando l'overlay non e' aperto.
  const ultimaNotificaVistaRef = useRef<string | null>(null);
  useEffect(() => {
    const ultima: NotificationEntry | undefined = state.notifiche.at(-1);
    if (!ultima || ultima.id === ultimaNotificaVistaRef.current) return;
    const primaVolta = ultimaNotificaVistaRef.current === null;
    ultimaNotificaVistaRef.current = ultima.id;
    if (primaVolta) return; // non suonare per lo storico gia' presente al montaggio
    const tipo = ultima.livello === "critico" ? "notificaCritica" : ultima.livello === "attenzione" ? "notificaAttenzione" : "notificaInfo";
    audioEngine.suonaEffetto(tipo);
  }, [state.notifiche]);

  const bersagliPianetaValidi = useMemo(() => {
    const insieme = new Set<string>();
    if (!cartaArmata) return insieme;
    const def = CARD_DEFINITIONS[cartaArmata.code];
    if (def.bersaglio !== "pianetaScoperto" && def.bersaglio !== "pianetaInvestigato") return insieme;
    for (const pianeta of pianetiScoperti) {
      if (validaGiocaCarta(state, cartaArmata.instanceId, { planetId: pianeta.id }).ok) insieme.add(pianeta.id);
    }
    return insieme;
  }, [cartaArmata, pianetiScoperti, state]);

  const bersagliRelittoValidi = useMemo(() => {
    const insieme = new Set<string>();
    if (!cartaArmata) return insieme;
    const def = CARD_DEFINITIONS[cartaArmata.code];
    if (def.bersaglio !== "relitto") return insieme;
    for (const relitto of relittiScoperti) {
      if (validaGiocaCarta(state, cartaArmata.instanceId, { relittoId: relitto.id }).ok) insieme.add(relitto.id);
    }
    return insieme;
  }, [cartaArmata, relittiScoperti, state]);

  // accettaPuntoMappa era usato solo da Esplora/Radar (bersaglio "zonaMappa"),
  // rimosso dal tipo bersaglio perche' Radar e' ora automatico (richiesta
  // utente): nessuna carta clicca piu' un punto libero della mappa.
  const modalitaBersaglioCarta = cartaArmata ? { bersagliPianetaValidi, bersagliRelittoValidi, accettaPuntoMappa: false } : null;

  // Esc annulla la selezione-carta attiva (A4), non tocca una conferma gia' aperta
  // (quella la gestisce ConfirmModal stesso).
  useEffect(() => {
    if (!cartaSelezionataClick || propostaCarta) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartaSelezionataClick(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cartaSelezionataClick, propostaCarta]);

  // Loop di simulazione: la UI gira a frame rate variabile, il motore
  // avanza a sub-step fissi indipendenti dal frame (A3). requestAnimationFrame
  // da solo NON basta a fermare la simulazione quando la finestra perde il
  // focus (es. Alt-Tab): i browser lo throttlano solo per una scheda
  // nascosta, non per una visibile ma senza focus (richiesta utente: "il
  // gioco continua anche se non sei con il focus sul browser") — quindi si
  // controlla esplicitamente document.hasFocus()/visibilityState e si salta
  // l'update quando non si e' in primo piano, azzerando lastTs cosi' alla
  // ripresa non si applica un unico balzo temporale enorme.
  useEffect(() => {
    let frameId: number;
    let lastTs: number | null = null;
    const inPrimoPiano = () => document.hasFocus() && document.visibilityState === "visible";
    const loop = (ts: number) => {
      if (!inPrimoPiano()) {
        lastTs = null;
      } else {
        if (lastTs !== null) {
          engine.update(ts - lastTs);
        }
        lastTs = ts;
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [engine]);

  const selezionaPianeta = (id: string) => {
    engine.dispatch({ id: nextCommandId("select"), type: "ui/selectPlanet", payload: { planetId: id } });
    setPannelloPianetaChiuso(false);
  };
  // Selezione del relitto/campo asteroidi (richiesta utente: "deve essere
  // cliccabile"): solo evidenziazione sulla mappa, non richiede un comando
  // dedicato nel motore (nessun effetto di gioco, solo stato UI locale).
  const selezionaRelitto = (id: string) => {
    setRelittoSelezionatoId((prev) => (prev === id ? null : id));
  };
  const muoviNaveMadre = (destinazione: { x: number; y: number }) =>
    engine.dispatch({ id: nextCommandId("move"), type: "ui/moveMothership", payload: { destinazione } });

  function proponiAzioneCarta(carta: CardInstance, bersaglio: BersaglioCarta) {
    // Difesa in profondita' (A2): CardHandBar gia' blocca il click/drag
    // delle carte non indicate durante un passo guidato, ma qui si rifiuta
    // comunque qualunque altro comando arrivasse per altra via.
    if (passoTutorialAttivo && carta.code !== passoTutorialAttivo.cardCode) {
      avvisoRequisitoIdRef.current += 1;
      setAvvisoRequisito({
        id: avvisoRequisitoIdRef.current,
        testo: `Segui prima il tutorial: usa ${CARD_DEFINITIONS[passoTutorialAttivo.cardCode].nome}.`,
        cardInstanceId: carta.instanceId,
      });
      return;
    }
    const risultato = validaGiocaCarta(state, carta.instanceId, bersaglio);
    if (!risultato.ok) {
      // Bersaglio/requisiti non validi: nessun effetto, nessuna carta
      // consumata, ma l'utente deve sapere perche' (richiesta utente).
      avvisoRequisitoIdRef.current += 1;
      setAvvisoRequisito({
        id: avvisoRequisitoIdRef.current,
        testo: risultato.motivo ?? "comando non utilizzabile al momento",
        cardInstanceId: carta.instanceId,
      });
      return;
    }
    setPropostaCarta({ carta, bersaglio });
  }

  const onCliccaCarta = (carta: CardInstance) => {
    const def = CARD_DEFINITIONS[carta.code];
    if (def.bersaglio === "nave" || def.bersaglio === "nessuno") {
      // Nessun bersaglio da scegliere sulla mappa: propone subito la conferma.
      proponiAzioneCarta(carta, {});
      return;
    }
    if (def.bersaglio === "civiltaScoperta") {
      // Il bersaglio (civilta') si sceglie nel pannello dedicato, non sulla
      // mappa: qui il click apre solo il tooltip (gestito da CardHandBar),
      // nessuna modalita' di selezione da armare.
      return;
    }
    setCartaSelezionataClick((prev) => (prev?.instanceId === carta.instanceId ? null : carta));
  };

  const onBersaglioPianetaCarta = (planetId: string) => {
    if (!cartaArmata) return;
    proponiAzioneCarta(cartaArmata, { planetId });
  };
  const onBersaglioRelittoCarta = (relittoId: string) => {
    if (!cartaArmata) return;
    proponiAzioneCarta(cartaArmata, { relittoId });
  };
  const onBersaglioMappaCarta = (punto: Vector2) => {
    if (!cartaArmata) return;
    proponiAzioneCarta(cartaArmata, { punto });
  };
  const onDropCartaSuPianeta = (cardInstanceId: string, planetId: string) => {
    const carta = state.manoCarte.find((c) => c.instanceId === cardInstanceId);
    if (carta) proponiAzioneCarta(carta, { planetId });
  };
  const onDropCartaSuRelitto = (cardInstanceId: string, relittoId: string) => {
    const carta = state.manoCarte.find((c) => c.instanceId === cardInstanceId);
    if (carta) proponiAzioneCarta(carta, { relittoId });
  };
  const onDropCartaSuMappa = (cardInstanceId: string, punto: Vector2) => {
    const carta = state.manoCarte.find((c) => c.instanceId === cardInstanceId);
    if (carta) proponiAzioneCarta(carta, { punto });
  };

  const [animazioneCarta, setAnimazioneCarta] = useState<{ id: number; categoria: CardDefinition["categoria"] } | null>(null);

  const confermaCarta = () => {
    if (!propostaCarta) return;
    const def = CARD_DEFINITIONS[propostaCarta.carta.code];
    // Feedback sonoro + grafico dell'azione (B11, richiesta utente: "crea
    // animazione grafica per ogni azione... ad ogni azione di carte crea un
    // sound appropriato"), sincronizzati allo stesso punto di applicazione.
    const suonoPerCategoria: Record<CardDefinition["categoria"], "cartaOperazioni" | "cartaIndustria" | "cartaRicerca" | "cartaLogistica"> = {
      operazioni: "cartaOperazioni",
      industria: "cartaIndustria",
      ricerca: "cartaRicerca",
      logistica: "cartaLogistica",
    };
    audioEngine.suonaEffetto(suonoPerCategoria[def.categoria]);
    setAnimazioneCarta({ id: Date.now(), categoria: def.categoria });
    engine.dispatch({
      id: nextCommandId("carta"),
      type: "ui/giocaCarta",
      payload: { cardInstanceId: propostaCarta.carta.instanceId, bersaglio: propostaCarta.bersaglio },
    });
    setPropostaCarta(null);
    setCartaSelezionataClick(null);
  };
  const annullaCarta = () => setPropostaCarta(null);

  // Evento critico attivo (B9: "critici sospendono solo quando
  // necessario"): mostrato con una modale dedicata che richiede sempre una
  // scelta esplicita, mai ignorabile come gli eventi ordinari.
  const eventoCritico = state.eventi.attivi
    .map((e) => ({ attivo: e, def: EVENTO_DEFINITIONS[e.definizioneId] }))
    .find((e) => e.def?.critico);
  const sceltaEventoCritico = (scelteId: string) => {
    if (!eventoCritico) return;
    engine.dispatch({ id: nextCommandId("evento-critico"), type: "ui/sceltaEvento", payload: { eventoId: eventoCritico.attivo.id, scelteId } });
  };

  return (
    <div className="app-shell">
      <TopBar />
      <RevisionBanner />
      <div className="app-shell__main">
        {/* Richiesta utente: su mobile le sidebar si aprono con un bottone,
         * posizionato in una barra sopra la mappa (qui) e una sotto (vedi in
         * fondo a questo blocco), lasciando la mappa libera al centro.
         * Su desktop queste barre restano nascoste via CSS. */}
        <div className="app-shell__mobile-bar app-shell__mobile-bar--top">
          <button
            type="button"
            className="btn btn-small app-shell__mobile-toggle"
            aria-expanded={drawerMobileAperto === "sinistra"}
            onClick={() => setDrawerMobileAperto((prev) => (prev === "sinistra" ? null : "sinistra"))}
          >
            ☰ Eventi
          </button>
        </div>

        <div className="app-shell__body">
          {drawerMobileAperto && (
            <div className="app-shell__drawer-backdrop" onClick={() => setDrawerMobileAperto(null)} />
          )}
          <aside
            className={`app-shell__side-panel app-shell__side-panel--left ${
              drawerMobileAperto === "sinistra" ? "app-shell__side-panel--aperto" : ""
            }`}
          >
            <button
              type="button"
              className="app-shell__side-panel-close"
              aria-label="Chiudi pannello"
              onClick={() => setDrawerMobileAperto(null)}
            >
              ✕
            </button>
            <NarrativePanel />
            <MissionsPanel compatta />
            <EventsPanel />
            <CivilizationsPanel />
            <NotificationLogPanel limite={10} onVediTutte={() => setOverlayAperto("notifiche")} />
          </aside>

          <div className="app-shell__map">
          <span className="map-placeholder-badge">
            Regione {state.numeroRegione}: {pianetiScoperti.length}/{state.pianeti.length} pianeti scoperti
          </span>
          {cartaArmata && (
            <span className="map-target-badge">
              Seleziona un bersaglio per {CARD_DEFINITIONS[cartaArmata.code].nome} (Esc per annullare)
            </span>
          )}
          <div className="map-floating-controls">
            <button type="button" className="btn" onClick={() => setOverlayAperto("missioni")}>
              Missioni
            </button>
            <button type="button" className="btn" onClick={() => setOverlayAperto("mercato")}>
              Mercato
            </button>
            <button type="button" className="btn" onClick={() => setOverlayAperto("mercatoCarte")}>
              Catalogo comandi
            </button>
            <button type="button" className="btn" onClick={() => setOverlayAperto("ricerca")}>
              Ricerca
            </button>
            <button type="button" className="btn" onClick={() => setOverlayAperto("impostazioni")}>
              Impostazioni
            </button>
          </div>
          <TutorialPanel />
          <PixiMapView
            ref={mapRef}
            pianetiScoperti={pianetiScoperti}
            relittiScoperti={relittiScoperti}
            tempoSimulatoMs={state.tempoSimulatoMs}
            contrattiMinerari={state.contrattiMinerari}
            mothershipPosizione={state.mothership.posizione}
            mothershipOrientamento={state.mothership.orientamento}
            mothershipPercorso={state.mothership.percorso}
            navette={state.navette}
            pianetaSelezionatoId={state.pianetaSelezionatoId}
            onSelezionaPianeta={selezionaPianeta}
            relittoSelezionatoId={relittoSelezionatoId}
            onSelezionaRelitto={selezionaRelitto}
            onMuoviNaveMadre={muoviNaveMadre}
            modalitaBersaglioCarta={modalitaBersaglioCarta}
            onBersaglioPianetaCarta={onBersaglioPianetaCarta}
            onBersaglioRelittoCarta={onBersaglioRelittoCarta}
            onBersaglioMappaCarta={onBersaglioMappaCarta}
            onDropCartaSuPianeta={onDropCartaSuPianeta}
            onDropCartaSuRelitto={onDropCartaSuRelitto}
            onDropCartaSuMappa={onDropCartaSuMappa}
          />
          </div>

          <aside
            className={`app-shell__side-panel ${
              drawerMobileAperto === "destra" ? "app-shell__side-panel--aperto" : ""
            }`}
          >
            <button
              type="button"
              className="app-shell__side-panel-close"
              aria-label="Chiudi pannello"
              onClick={() => setDrawerMobileAperto(null)}
            >
              ✕
            </button>
            <ManagementPanel />
          </aside>
        </div>

        <div className="app-shell__mobile-bar app-shell__mobile-bar--bottom">
          <button
            type="button"
            className="btn btn-small app-shell__mobile-toggle"
            aria-expanded={drawerMobileAperto === "destra"}
            onClick={() => setDrawerMobileAperto((prev) => (prev === "destra" ? null : "destra"))}
          >
            ⚙ Gestione
          </button>
        </div>
      </div>
      <CardHandBar
        cartaArmataId={cartaArmata?.instanceId ?? null}
        onCliccaCarta={onCliccaCarta}
        onInizioTrascinamento={setCartaInTrascinamento}
        onFineTrascinamento={() => setCartaInTrascinamento(null)}
        cartaSbloccataCode={passoTutorialAttivo?.cardCode ?? null}
        erroreCarta={avvisoRequisito}
      />

      {propostaCarta && (
        <ConfirmModal
          aperto
          titolo={`Usa comando: ${CARD_DEFINITIONS[propostaCarta.carta.code].nome}`}
          dettagli={dettagliConfermaCarta(propostaCarta.carta, propostaCarta.bersaglio, state)}
          testoConferma="Usa comando"
          onConferma={confermaCarta}
          onAnnulla={annullaCarta}
        />
      )}
      {overlayAperto === "missioni" && (
        <OverlayPanel ariaLabel="Missioni" onChiudi={() => setOverlayAperto(null)}>
          <MissionsPanel />
        </OverlayPanel>
      )}
      {overlayAperto === "mercato" && (
        <OverlayPanel ariaLabel="Mercato" onChiudi={() => setOverlayAperto(null)}>
          <MarketPanel risorseMaiPossedute={risorseMaiPossedute} />
        </OverlayPanel>
      )}
      {overlayAperto === "mercatoCarte" && (
        <OverlayPanel ariaLabel="Catalogo comandi" onChiudi={() => setOverlayAperto(null)}>
          <CardMarketPanel />
        </OverlayPanel>
      )}
      {overlayAperto === "ricerca" && (
        <OverlayPanel ariaLabel="Ricerca" onChiudi={() => setOverlayAperto(null)}>
          <ResearchPanel />
        </OverlayPanel>
      )}
      {overlayAperto === "notifiche" && (
        <OverlayPanel ariaLabel="Registro notifiche" onChiudi={() => setOverlayAperto(null)}>
          <NotificationLogPanel />
        </OverlayPanel>
      )}
      {overlayAperto === "impostazioni" && (
        <OverlayPanel ariaLabel="Impostazioni" onChiudi={() => setOverlayAperto(null)}>
          <SettingsPanel onNuovaPartita={() => setOverlayAperto(null)} ultimoSalvataggio={ultimoSalvataggio} />
        </OverlayPanel>
      )}
      {pianetaSelezionato && !pannelloPianetaChiuso && (
        <OverlayPanel ariaLabel="Dettagli corpo selezionato" onChiudi={() => setPannelloPianetaChiuso(true)}>
          <PlanetPanel pianeta={pianetaSelezionato} />
        </OverlayPanel>
      )}
      {eventoCritico?.def && (
        <EventoCriticoModal
          titolo={eventoCritico.def.titolo}
          descrizione={eventoCritico.def.descrizione}
          scelte={eventoCritico.def.scelte}
          onScelta={sceltaEventoCritico}
        />
      )}
      <EndingOverlay chiuso={finaleChiuso} onChiudi={() => setFinaleChiuso(true)} />
      <GameOverOverlay />
      {animazioneCarta && <CardActionFlash key={animazioneCarta.id} categoria={animazioneCarta.categoria} onFine={() => setAnimazioneCarta(null)} />}
      {chiacchiericcio.attuale && (
        <NarrativeToast
          key={chiacchiericcio.attuale.id}
          speaker={chiacchiericcio.attuale.speaker}
          text={chiacchiericcio.attuale.text}
          onChiudi={chiacchiericcio.chiudi}
          autoAvanza={dialogoAutoAvanza}
          onToggleAutoAvanza={() => setDialogoAutoAvanza((v) => !v)}
          onSaltaTutto={() => setSaltaVeloceAttivo(true)}
        />
      )}
    </div>
  );
}
