import { describe, expect, it } from "vitest";
import { SimulationEngine } from "../src/simulation/engine";

describe("Game Over per mancato pagamento della quota", () => {
  it("giocare una carta mentre la quota e' dovuta consuma una carta di tolleranza", () => {
    const engine = new SimulationEngine("seed-gameover-consuma");
    // @ts-expect-error accesso diretto solo per predisporre il fixture di test
    engine.state = { ...engine.state, review: { ...engine.state.review, statoRevisione: "dovuta", carteTolleranzaResidue: 5 } };

    const esplora = engine.getState().manoCarte.find((c) => c.code === "OPS-01")!;
    engine.dispatch({ id: "gioca-1", type: "ui/giocaCarta", payload: { cardInstanceId: esplora.instanceId, bersaglio: { punto: { x: 1, y: 1 } } } });

    expect(engine.getState().review.carteTolleranzaResidue).toBe(4);
    expect(engine.getState().review.statoRevisione).toBe("inTolleranza");
    expect(engine.getState().gameOver).toBeNull();
  });

  it("termina la partita quando la tolleranza arriva a zero senza pagamento", () => {
    const engine = new SimulationEngine("seed-gameover-zero");
    // @ts-expect-error accesso diretto solo per predisporre il fixture di test
    engine.state = { ...engine.state, review: { ...engine.state.review, statoRevisione: "inTolleranza", carteTolleranzaResidue: 1 } };

    const esplora = engine.getState().manoCarte.find((c) => c.code === "OPS-01")!;
    engine.dispatch({ id: "gioca-ultima", type: "ui/giocaCarta", payload: { cardInstanceId: esplora.instanceId, bersaglio: { punto: { x: 1, y: 1 } } } });

    expect(engine.getState().review.carteTolleranzaResidue).toBe(0);
    expect(engine.getState().gameOver).not.toBeNull();
  });

  it("blocca tutti i comandi (tranne pausa) dopo il Game Over", () => {
    const engine = new SimulationEngine("seed-gameover-blocco");
    // @ts-expect-error accesso diretto solo per predisporre il fixture di test
    engine.state = { ...engine.state, gameOver: { motivo: "test" } };

    const risultato = engine.dispatch({ id: "move-dopo-gameover", type: "ui/moveMothership", payload: { destinazione: { x: 10, y: 10 } } });
    expect(risultato.ok).toBe(false);

    const pausa = engine.dispatch({ id: "pausa-dopo-gameover", type: "ui/togglePause" });
    expect(pausa.ok).toBe(true);
  });

  it("update() non avanza il tempo dopo il Game Over", () => {
    const engine = new SimulationEngine("seed-gameover-freeze");
    const tempoPrima = engine.getState().tempoSimulatoMs;
    // @ts-expect-error accesso diretto solo per predisporre il fixture di test
    engine.state = { ...engine.state, gameOver: { motivo: "test" } };
    engine.update(5000);
    expect(engine.getState().tempoSimulatoMs).toBe(tempoPrima);
  });
});
