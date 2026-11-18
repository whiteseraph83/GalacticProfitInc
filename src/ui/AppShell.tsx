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
import { CARD_DEFINITIONS } from "../domain/cards";
import type { CardDefinition } from "../domain/types";
import { CardActionFlash } from "./components/CardActionFlash";
import { NarrativeToast } from "./components/NarrativeToast";
import { useNpcChatter } from "./hooks/useNpcChatter";
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
  const chiacchiericcio = useNpcChatter(state);

  const pianetiScoperti = useMemo(() => state.pianeti.filter((p) => p.scoperto), [state.pianeti]);
  const relittiScoperti = useMemo(() => state.campiRelitti.filter((r) => r.scoperto), [state.campiRelitti]);
  const pianetaSelezionato = pianetiScoperti.find((p) => p.id === state.pianetaSelezionatoId) ?? null;

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

  const modalitaBersaglioCarta = cartaArmata
    ? { bersagliPianetaValidi, accettaPuntoMappa: CARD_DEFINITIONS[cartaArmata.code].bersaglio === "zonaMappa" }
    : null;

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
  // avanza a sub-step fissi indipendenti dal frame (A3).
  useEffect(() => {
    let frameId: number;
    let lastTs: number | null = null;
    const loop = (ts: number) => {
      if (lastTs !== null) {
        engine.update(ts - lastTs);
      }
      lastTs = ts;
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [engine]);

  const togglePause = () => engine.dispatch({ id: nextCommandId("pause"), type: "ui/togglePause" });
  const selezionaPianeta = (id: string) => {
    engine.dispatch({ id: nextCommandId("select"), type: "ui/selectPlanet", payload: { planetId: id } });
    setPannelloPianetaChiuso(false);
  };
  const muoviNaveMadre = (destinazione: { x: number; y: number }) =>
    engine.dispatch({ id: nextCommandId("move"), type: "ui/moveMothership", payload: { destinazione } });

  function proponiAzioneCarta(carta: CardInstance, bersaglio: BersaglioCarta) {
    const risultato = validaGiocaCarta(state, carta.instanceId, bersaglio);
    if (!risultato.ok) return; // bersaglio non valido: nessun effetto, nessuna carta consumata
    setPropostaCarta({ carta, bersaglio });
  }

  const onCliccaCarta = (carta: CardInstance) => {
    const def = CARD_DEFINITIONS[carta.code];
    if (def.bersaglio === "nave" || def.bersaglio === "nessuno") {
      // Nessun bersaglio da scegliere sulla mappa: propone subito la conferma.
      proponiAzioneCarta(carta, {});
      return;
    }
    if (def.bersaglio === "progettoRicerca" || def.bersaglio === "civiltaScoperta") {
      // Il bersaglio (tecnologia o civilta') si sceglie nel pannello
      // dedicato (Ricerca / Civilta'), non sulla mappa: qui il click apre
      // solo il tooltip (gestito da CardHandBar), nessuna modalita' di
      // selezione da armare.
      return;
    }
    setCartaSelezionataClick((prev) => (prev?.instanceId === carta.instanceId ? null : carta));
  };

  const onBersaglioPianetaCarta = (planetId: string) => {
    if (!cartaArmata) return;
    proponiAzioneCarta(cartaArmata, { planetId });
  };
  const onBersaglioMappaCarta = (punto: Vector2) => {
    if (!cartaArmata) return;
    proponiAzioneCarta(cartaArmata, { punto });
  };
  const onDropCartaSuPianeta = (cardInstanceId: string, planetId: string) => {
    const carta = state.manoCarte.find((c) => c.instanceId === cardInstanceId);
    if (carta) proponiAzioneCarta(carta, { planetId });
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
      <TopBar onTogglePause={togglePause} />
      <RevisionBanner />
      <div className="app-shell__body">
        <aside className="app-shell__side-panel app-shell__side-panel--left">
          <NarrativePanel />
          <EventsPanel />
          <CivilizationsPanel />
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
              Mercato carte
            </button>
            <button type="button" className="btn" onClick={() => setOverlayAperto("ricerca")}>
              Ricerca
            </button>
            <button type="button" className="btn" onClick={() => setOverlayAperto("notifiche")}>
              Notifiche
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
            mothershipPosizione={state.mothership.posizione}
            mothershipOrientamento={state.mothership.orientamento}
            mothershipPercorso={state.mothership.percorso}
            pianetaSelezionatoId={state.pianetaSelezionatoId}
            onSelezionaPianeta={selezionaPianeta}
            onMuoviNaveMadre={muoviNaveMadre}
            modalitaBersaglioCarta={modalitaBersaglioCarta}
            onBersaglioPianetaCarta={onBersaglioPianetaCarta}
            onBersaglioMappaCarta={onBersaglioMappaCarta}
            onDropCartaSuPianeta={onDropCartaSuPianeta}
            onDropCartaSuMappa={onDropCartaSuMappa}
          />
        </div>

        <aside className="app-shell__side-panel">
          <ManagementPanel />
        </aside>
      </div>
      <CardHandBar
        cartaArmataId={cartaArmata?.instanceId ?? null}
        onCliccaCarta={onCliccaCarta}
        onInizioTrascinamento={setCartaInTrascinamento}
        onFineTrascinamento={() => setCartaInTrascinamento(null)}
      />

      {propostaCarta && (
        <ConfirmModal
          aperto
          titolo={`Gioca: ${CARD_DEFINITIONS[propostaCarta.carta.code].nome}`}
          dettagli={dettagliConfermaCarta(propostaCarta.carta, propostaCarta.bersaglio, state)}
          testoConferma="Gioca carta"
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
          <MarketPanel />
        </OverlayPanel>
      )}
      {overlayAperto === "mercatoCarte" && (
        <OverlayPanel ariaLabel="Mercato carte" onChiudi={() => setOverlayAperto(null)}>
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
          <SettingsPanel onNuovaPartita={() => setOverlayAperto(null)} />
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
        />
      )}
    </div>
  );
}
