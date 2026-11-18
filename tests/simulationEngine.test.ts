import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../src/simulation/engine";
import { WORLD } from "../src/domain/worldConstants";

describe("SimulationEngine - orologio di simulazione", () => {
  it("avanza il tempo simulato indipendentemente dal numero di frame", () => {
    const engineA = new SimulationEngine("seed-a");
    const engineB = new SimulationEngine("seed-a");

    // Stesso tempo totale, suddiviso in modo diverso tra i frame.
    engineA.update(1000);
    for (let i = 0; i < 10; i++) engineB.update(100);

    expect(engineA.getState().tempoSimulatoMs).toBe(engineB.getState().tempoSimulatoMs);
  });

  it("non avanza il tempo mentre e' in pausa", () => {
    const engine = new SimulationEngine("seed-pausa");
    engine.dispatch({ id: "p1", type: "ui/togglePause" });
    expect(engine.getState().inPausa).toBe(true);

    engine.update(5000);
    expect(engine.getState().tempoSimulatoMs).toBe(0);
  });

  it("riprende ad avanzare dopo la ripresa dalla pausa", () => {
    const engine = new SimulationEngine("seed-ripresa");
    engine.dispatch({ id: "p1", type: "ui/togglePause" });
    engine.update(5000);
    engine.dispatch({ id: "p2", type: "ui/togglePause" });
    engine.update(500);
    expect(engine.getState().tempoSimulatoMs).toBe(500);
  });

  it("limita il recupero per singola chiamata (nessun loop patologico in background)", () => {
    const engine = new SimulationEngine("seed-catchup");
    engine.update(10_000_000);
    expect(engine.getState().tempoSimulatoMs).toBeLessThanOrEqual(2000);
  });
});

describe("SimulationEngine - command bus", () => {
  it("applica un comando valido esattamente una volta", () => {
    const engine = new SimulationEngine("seed-cmd");
    const risultato = engine.dispatch({
      id: "move-1",
      type: "ui/moveMothership",
      payload: { destinazione: { x: 100, y: 0 } },
    });
    expect(risultato.ok).toBe(true);
    expect(engine.getState().mothership.percorso.length).toBeGreaterThan(0);
    expect(engine.getState().mothership.percorso.at(-1)).toEqual({ x: 100, y: 0 });
  });

  it("rifiuta un comando duplicato (stesso id) senza ulteriori effetti", () => {
    const engine = new SimulationEngine("seed-cmd-dup");
    engine.dispatch({ id: "dup-1", type: "ui/togglePause" });
    expect(engine.getState().inPausa).toBe(true);

    const secondo = engine.dispatch({ id: "dup-1", type: "ui/togglePause" });
    expect(secondo.ok).toBe(false);
    // Lo stato non e' stato alterato una seconda volta: resta in pausa.
    expect(engine.getState().inPausa).toBe(true);
  });

  it("rifiuta una destinazione non valida senza mutare lo stato", () => {
    const engine = new SimulationEngine("seed-cmd-invalid");
    const prima = engine.getState().mothership.percorso;
    const risultato = engine.dispatch({
      id: "move-invalid",
      type: "ui/moveMothership",
      payload: { destinazione: { x: Number.NaN, y: 0 } },
    });
    expect(risultato.ok).toBe(false);
    expect(engine.getState().mothership.percorso).toBe(prima);
  });

  it("muove la nave madre verso la destinazione accelerando e si ferma esattamente all'arrivo", () => {
    const engine = new SimulationEngine("seed-move");
    engine.dispatch({ id: "move-1", type: "ui/moveMothership", payload: { destinazione: { x: 600, y: 0 } } });

    engine.update(300);
    const dopoPrimoStep = engine.getState().mothership;
    expect(dopoPrimoStep.velocita).toBeGreaterThan(0);
    expect(dopoPrimoStep.posizione.x).toBeGreaterThan(0);
    expect(dopoPrimoStep.percorso.length).toBeGreaterThan(0);

    for (let i = 0; i < 400 && engine.getState().mothership.percorso.length > 0; i++) {
      engine.update(100);
    }

    const finale = engine.getState().mothership;
    expect(finale.percorso).toHaveLength(0);
    expect(finale.velocita).toBe(0);
    // Tolleranza pari all'epsilon di arrivo usato dal motore per
    // considerare raggiunto un waypoint (evita micro-step residui infiniti).
    expect(Math.abs(finale.posizione.x - 600)).toBeLessThan(3);
    expect(Math.abs(finale.posizione.y)).toBeLessThan(1);
  });

  it("consuma carburante proporzionalmente alla distanza percorsa", () => {
    const engine = new SimulationEngine("seed-fuel");
    const carburanteIniziale = engine.getState().mothership.carburante;
    engine.dispatch({ id: "move-1", type: "ui/moveMothership", payload: { destinazione: { x: 200, y: 0 } } });
    for (let i = 0; i < 400 && engine.getState().mothership.percorso.length > 0; i++) {
      engine.update(100);
    }
    expect(engine.getState().mothership.carburante).toBeLessThan(carburanteIniziale);
  });

  it("rifiuta il movimento se il carburante e' gia' a zero", () => {
    const engine = new SimulationEngine("seed-nofuel");
    // Svuota il carburante muovendo ripetutamente finche' non si esaurisce.
    for (let i = 0; i < 50; i++) {
      engine.dispatch({ id: `move-drain-${i}`, type: "ui/moveMothership", payload: { destinazione: { x: 9000, y: 0 } } });
      engine.update(2000);
      if (engine.getState().mothership.carburante <= 0) break;
    }
    expect(engine.getState().mothership.carburante).toBe(0);

    const risultato = engine.dispatch({ id: "move-after-empty", type: "ui/moveMothership", payload: { destinazione: { x: 0, y: 0 } } });
    expect(risultato.ok).toBe(false);
  });

  it("genera una notifica per ogni comando applicato con successo", () => {
    const engine = new SimulationEngine("seed-notif");
    expect(engine.getState().notifiche).toHaveLength(0);
    engine.dispatch({ id: "p1", type: "ui/togglePause" });
    expect(engine.getState().notifiche).toHaveLength(1);
  });

  it("riprendendo da un salvataggio con notifiche gia' presenti, i nuovi id non duplicano quelli esistenti", () => {
    // Bug reale osservato in verifica manuale (Macrostep 9): un contatore
    // module-level azzerato a ogni reload produceva id "notif-1"/"notif-2"
    // duplicati nel resume di una partita gia' avanzata (chiavi React non
    // uniche). Il contatore deve ripartire dal massimo id gia' presente.
    const primaSessione = new SimulationEngine("seed-notif-resume");
    primaSessione.dispatch({ id: "p1", type: "ui/togglePause" });
    primaSessione.dispatch({ id: "p2", type: "ui/togglePause" });
    const statoSalvato = primaSessione.getState();
    expect(statoSalvato.notifiche.map((n) => n.id)).toEqual(["notif-1", "notif-2"]);

    const secondaSessione = new SimulationEngine("seed-notif-resume", statoSalvato);
    secondaSessione.dispatch({ id: "p3", type: "ui/togglePause" });
    const idTutteLeNotifiche = secondaSessione.getState().notifiche.map((n) => n.id);
    expect(idTutteLeNotifiche).toEqual(["notif-1", "notif-2", "notif-3"]);
    expect(new Set(idTutteLeNotifiche).size).toBe(idTutteLeNotifiche.length);
  });

  it("caricaStato ricalcola il contatore dal nuovo stato caricato", () => {
    const engine = new SimulationEngine("seed-notif-carica-stato");
    engine.dispatch({ id: "p1", type: "ui/togglePause" });
    const statoImportato = { ...engine.getState(), notifiche: [{ id: "notif-7", timestampSimMs: 0, testo: "importata", livello: "info" as const }] };
    engine.caricaStato(statoImportato);
    engine.dispatch({ id: "p2", type: "ui/togglePause" });
    const idTutteLeNotifiche = engine.getState().notifiche.map((n) => n.id);
    expect(idTutteLeNotifiche).toEqual(["notif-7", "notif-8"]);
  });
});

describe("SimulationEngine - nebbia di guerra", () => {
  it("scopre un pianeta quando la nave madre entra nel suo raggio di visibilita'", () => {
    const engine = new SimulationEngine("seed-fog");
    const nonScoperto = engine.getState().pianeti.find((p) => !p.scoperto);
    expect(nonScoperto).toBeDefined();
    if (!nonScoperto) return;

    engine.dispatch({
      id: "move-fog",
      type: "ui/moveMothership",
      payload: { destinazione: nonScoperto.posizione },
    });
    // update() limita il recupero per singola chiamata (anti-background-loop):
    // simuliamo piu' chiamate successive, come farebbe il loop a frame della UI.
    for (let i = 0; i < 200; i++) {
      engine.update(500);
      if (engine.getState().pianeti.find((p) => p.id === nonScoperto.id)?.scoperto) break;
    }

    const aggiornato = engine.getState().pianeti.find((p) => p.id === nonScoperto.id);
    expect(aggiornato?.scoperto).toBe(true);
  });

  it("non permette di selezionare un pianeta non ancora scoperto", () => {
    const engine = new SimulationEngine("seed-fog-select");
    const nonScoperto = engine.getState().pianeti.find((p) => !p.scoperto);
    expect(nonScoperto).toBeDefined();
    if (!nonScoperto) return;

    const risultato = engine.dispatch({
      id: "select-hidden",
      type: "ui/selectPlanet",
      payload: { planetId: nonScoperto.id },
    });
    expect(risultato.ok).toBe(false);
    expect(engine.getState().pianetaSelezionatoId).toBeNull();
  });

  it("la scoperta e' permanente anche se la nave madre si allontana di nuovo", () => {
    const engine = new SimulationEngine("seed-fog-permanente");
    const pianeta = engine.getState().pianeti.find((p) => p.scoperto);
    expect(pianeta).toBeDefined();
    if (!pianeta) return;

    engine.dispatch({
      id: "move-away",
      type: "ui/moveMothership",
      payload: { destinazione: { x: WORLD.estensioneRegioneMeta * 2, y: WORLD.estensioneRegioneMeta * 2 } },
    });
    engine.update(5000);

    const ancoraScoperto = engine.getState().pianeti.find((p) => p.id === pianeta.id);
    expect(ancoraScoperto?.scoperto).toBe(true);
  });
});

describe("SimulationEngine - soccorso carburante", () => {
  it("aggiunge carburante e riduce la fiducia, senza superare la capacita' del serbatoio", () => {
    const engine = new SimulationEngine("seed-soccorso");
    const prima = engine.getState();
    const risultato = engine.dispatch({ id: "soccorso-1", type: "ui/soccorsoCarburante" });

    expect(risultato.ok).toBe(true);
    const dopo = engine.getState();
    expect(dopo.mothership.carburante).toBe(Math.min(dopo.mothership.serbatoioCapacita, prima.mothership.carburante + 30));
    expect(dopo.review.fiducia).toBe(prima.review.fiducia - 10);
    expect(dopo.review.soccorsoCarburanteUsato).toBe(true);
  });

  it("non e' utilizzabile due volte nella stessa carriera", () => {
    const engine = new SimulationEngine("seed-soccorso-doppio");
    engine.dispatch({ id: "soccorso-1", type: "ui/soccorsoCarburante" });
    const fiduciaDopoPrimo = engine.getState().review.fiducia;

    const secondo = engine.dispatch({ id: "soccorso-2", type: "ui/soccorsoCarburante" });
    expect(secondo.ok).toBe(false);
    expect(engine.getState().review.fiducia).toBe(fiduciaDopoPrimo);
  });

  it("non fa superare la capacita' del serbatoio", () => {
    const engine = new SimulationEngine("seed-soccorso-pieno");
    // Il serbatoio parte gia' quasi pieno (120/150): +30 lo farebbe sforare.
    engine.dispatch({ id: "soccorso-1", type: "ui/soccorsoCarburante" });
    const stato = engine.getState();
    expect(stato.mothership.carburante).toBeLessThanOrEqual(stato.mothership.serbatoioCapacita);
  });
});

describe("SimulationEngine - carte giocabili (ui/giocaCarta)", () => {
  it("gioca Radar (ex Esplora): consuma la carta esattamente una volta", () => {
    const engine = new SimulationEngine("seed-carte-esplora");
    const carta = engine.getState().manoCarte.find((c) => c.code === "OPS-01");
    expect(carta).toBeDefined();
    if (!carta) return;

    const risultato = engine.dispatch({
      id: "gioca-esplora-1",
      type: "ui/giocaCarta",
      payload: { cardInstanceId: carta.instanceId, bersaglio: {} },
    });
    expect(risultato.ok).toBe(true);
    expect(engine.getState().manoCarte.find((c) => c.instanceId === carta.instanceId)).toBeUndefined();
    expect(engine.getState().review.carteGiocateTotali).toBe(1);

    // Doppio dispatch dello stesso id: nessun secondo consumo/incremento.
    const secondo = engine.dispatch({
      id: "gioca-esplora-1",
      type: "ui/giocaCarta",
      payload: { cardInstanceId: carta.instanceId, bersaglio: {} },
    });
    expect(secondo.ok).toBe(false);
    expect(engine.getState().review.carteGiocateTotali).toBe(1);
  });

  it("rifiuta un bersaglio non valido senza consumare la carta ne' contare l'azione", () => {
    const engine = new SimulationEngine("seed-carte-invalid-target");
    const carta = engine.getState().manoCarte.find((c) => c.code === "OPS-02");
    const nonScoperto = engine.getState().pianeti.find((p) => !p.scoperto);
    expect(carta).toBeDefined();
    expect(nonScoperto).toBeDefined();
    if (!carta || !nonScoperto) return;

    const risultato = engine.dispatch({
      id: "gioca-investiga-invalid",
      type: "ui/giocaCarta",
      payload: { cardInstanceId: carta.instanceId, bersaglio: { planetId: nonScoperto.id } },
    });
    expect(risultato.ok).toBe(false);
    expect(engine.getState().manoCarte.find((c) => c.instanceId === carta.instanceId)).toBeDefined();
    expect(engine.getState().review.carteGiocateTotali).toBe(0);
  });

  it("Ricerca genera 1 punto ricerca invece di avviare subito un progetto", () => {
    const engine = new SimulationEngine("seed-carte-non-attivabili");
    const ricerca = engine.getState().manoCarte.find((c) => c.code === "RSH-01");
    expect(ricerca).toBeDefined();
    if (!ricerca) return;

    const puntiPrima = engine.getState().ricerca.puntiRicerca;
    const risultatoRicerca = engine.dispatch({
      id: "gioca-ricerca",
      type: "ui/giocaCarta",
      payload: { cardInstanceId: ricerca.instanceId, bersaglio: {} },
    });
    expect(risultatoRicerca.ok).toBe(true);
    expect(engine.getState().ricerca.puntiRicerca).toBe(puntiPrima + 1);
    expect(engine.getState().ricerca.progettiAttivi).toHaveLength(0);
    expect(engine.getState().manoCarte).toHaveLength(4);
  });

  it("costruisce la fabbrica con la carta Fabbrica e poi avvia/completa una raffinazione via comando libero", () => {
    const engine = new SimulationEngine("seed-fabbrica-engine");
    // Dota la nave di ferro sufficiente simulando una consegna gia' avvenuta
    // (la logistica di estrazione/navette e' testata a parte): qui si
    // verifica solo il wiring carta -> fabbrica -> coda -> produzione.
    const statoConFerro = { ...engine.getState(), mothership: { ...engine.getState().mothership, stivaCarico: { ferro: 80 } } };
    // @ts-expect-error accesso diretto solo per predisporre il fixture di test
    engine.state = statoConFerro;

    const fabbrica = engine.getState().manoCarte.find((c) => c.code === "IND-02")!;
    const risultato = engine.dispatch({ id: "gioca-fabbrica", type: "ui/giocaCarta", payload: { cardInstanceId: fabbrica.instanceId, bersaglio: {} } });
    expect(risultato.ok).toBe(true);
    expect(engine.getState().fabbrica.costruita).toBe(true);

    const accoda = engine.dispatch({ id: "accoda-1", type: "ui/accodaRaffinazione", payload: { ricettaId: "raffina-ferro" } });
    expect(accoda.ok).toBe(true);
    expect(engine.getState().fabbrica.coda).toHaveLength(1);

    for (let i = 0; i < 2000 && engine.getState().fabbrica.coda.length > 0; i++) {
      engine.update(1000);
    }
    expect(engine.getState().fabbrica.coda).toHaveLength(0);
    expect(engine.getState().mothership.stivaCarico.ferroRaffinato).toBeGreaterThan(0);
  });

  it("la carta speciale Esplora assegna una nuova carta allo scadere del conto alla rovescia (mano non piena)", () => {
    const engine = new SimulationEngine("seed-carte-passive");
    // Svuota uno slot giocando Radar (ex Esplora), cosi' c'e' spazio per avviare un'esplorazione.
    const radar = engine.getState().manoCarte.find((c) => c.code === "OPS-01")!;
    engine.dispatch({ id: "libera-slot", type: "ui/giocaCarta", payload: { cardInstanceId: radar.instanceId, bersaglio: {} } });
    expect(engine.getState().manoCarte).toHaveLength(4);

    const risultatoAvvio = engine.dispatch({ id: "avvia-esplora", type: "ui/avviaEsplorazione" });
    expect(risultatoAvvio.ok).toBe(true);
    expect(engine.getState().esplorazione.completataAlMs).not.toBeNull();

    for (let i = 0; i < 400 && engine.getState().esplorazione.completataAlMs !== null; i++) {
      engine.update(2000);
    }
    expect(engine.getState().manoCarte).toHaveLength(5);
    expect(engine.getState().esplorazione.completataAlMs).toBeNull();
  });
});
