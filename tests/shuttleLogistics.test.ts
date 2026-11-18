import { describe, expect, it } from "vitest";
import { creaStatoIniziale, BALANCE } from "../src/domain/initialState";
import { integraEstrazione, integraNavette } from "../src/simulation/logistics";
import type { GameState, MiningContract } from "../src/domain/types";

// Il Macrostep 2 implementa l'intera logistica di estrazione/navette, ma la
// carta che avvia un contratto (IND-01) arriva solo al Macrostep 3: qui si
// costruisce uno stato di test con un contratto gia' attivo, esattamente
// come fara' in futuro il motore una volta applicato il comando della
// carta. Le funzioni sono pure (stato -> nuovo stato), quindi del tutto
// testabili senza passare dalla UI.

function creaStatoConContratto(overrides: Partial<MiningContract> = {}): GameState {
  const stato = creaStatoIniziale("logistica-test");
  const pianeta = stato.pianeti.find((p) => p.scoperto);
  if (!pianeta) throw new Error("nessun pianeta scoperto nello stato di test");
  const naveMineraria = stato.naviMinerarie[0];

  const contratto: MiningContract = {
    id: "contratto-test",
    pianetaId: pianeta.id,
    naveMinerariaId: naveMineraria.id,
    risorsa: pianeta.risorsaDominante,
    giacimentoResiduo: 1000,
    estrazioneAlMinuto: naveMineraria.estrazioneBaseAlMinuto,
    depositoAccumulato: 0,
    priorita: 1,
    ultimaAssegnazioneMs: 0,
    attivo: true,
    ...overrides,
  };

  return { ...stato, contrattiMinerari: [contratto] };
}

describe("integraEstrazione", () => {
  it("estrae materiale proporzionalmente al tempo trascorso", () => {
    const stato = creaStatoConContratto();
    const aggiornato = integraEstrazione(stato, 60_000); // 1 minuto
    const contratto = aggiornato.contrattiMinerari[0];
    expect(contratto.depositoAccumulato).toBeCloseTo(contratto.estrazioneAlMinuto, 5);
    expect(contratto.giacimentoResiduo).toBeCloseTo(1000 - contratto.estrazioneAlMinuto, 5);
  });

  it("sospende l'estrazione quando il buffer di deposito e' pieno", () => {
    const stato = creaStatoConContratto({ depositoAccumulato: BALANCE.capacitaNavetta });
    const aggiornato = integraEstrazione(stato, 60_000);
    expect(aggiornato.contrattiMinerari[0].depositoAccumulato).toBe(BALANCE.capacitaNavetta);
  });

  it("non estrae oltre il giacimento residuo", () => {
    const stato = creaStatoConContratto({ giacimentoResiduo: 1 });
    const aggiornato = integraEstrazione(stato, 600_000); // 10 minuti, ben oltre il necessario
    expect(aggiornato.contrattiMinerari[0].giacimentoResiduo).toBe(0);
    expect(aggiornato.contrattiMinerari[0].depositoAccumulato).toBe(1);
  });

  it("non modifica lo stato se non ci sono contratti", () => {
    const stato = creaStatoIniziale("senza-contratti");
    const aggiornato = integraEstrazione(stato, 60_000);
    expect(aggiornato).toBe(stato);
  });
});

describe("integraNavette", () => {
  it("assegna una navetta libera al contratto con materiale disponibile e la fa viaggiare", () => {
    let stato = creaStatoConContratto({ depositoAccumulato: 20 });
    for (let i = 0; i < 2000 && stato.navette.every((n) => n.stato === "libera"); i++) {
      stato = integraNavette(stato, 100);
    }
    const assegnata = stato.navette.find((n) => n.contrattoAssegnatoId === "contratto-test");
    expect(assegnata).toBeDefined();
    expect(assegnata?.stato).not.toBe("libera");
  });

  it("carica, torna, scarica nella stiva della nave madre senza perdere ne' duplicare materiale", () => {
    let stato = creaStatoConContratto({ depositoAccumulato: BALANCE.capacitaNavetta });
    const pianeta = stato.pianeti.find((p) => p.id === stato.contrattiMinerari[0].pianetaId)!;
    // Nave madre lontana dal pianeta, cosi' il viaggio di andata/ritorno e' misurabile.
    stato = { ...stato, mothership: { ...stato.mothership, posizione: { x: pianeta.posizione.x + 400, y: pianeta.posizione.y } } };

    let iterazioni = 0;
    while (stato.contrattiMinerari[0].depositoAccumulato > 0 || stato.navette.some((n) => n.stato !== "libera")) {
      stato = integraNavette(stato, 100);
      stato = { ...stato, tempoSimulatoMs: stato.tempoSimulatoMs + 100 };
      iterazioni += 1;
      if (iterazioni > 20000) break;
    }

    const navette = stato.navette;
    expect(navette.every((n) => n.stato === "libera")).toBe(true);
    const cargoResiduoNavette = navette.reduce(
      (somma, n) => somma + Object.values(n.caricoAttuale).reduce((a, b) => a + (b ?? 0), 0),
      0,
    );
    expect(cargoResiduoNavette).toBe(0);

    const risorsa = stato.contrattiMinerari[0].risorsa;
    expect(stato.mothership.stivaCarico[risorsa]).toBe(BALANCE.capacitaNavetta);
  });

  it("se la stiva della nave madre e' piena il carico resta fisicamente nella navetta (nessuna perdita silenziosa)", () => {
    let stato = creaStatoConContratto({ depositoAccumulato: BALANCE.capacitaNavetta });
    stato = {
      ...stato,
      mothership: {
        ...stato.mothership,
        stivaCarico: { ferro: stato.mothership.stivaCapacita }, // stiva gia' completamente piena
      },
    };
    const pianeta = stato.pianeti.find((p) => p.id === stato.contrattiMinerari[0].pianetaId)!;
    stato = { ...stato, mothership: { ...stato.mothership, posizione: pianeta.posizione } };

    for (let i = 0; i < 2000; i++) stato = integraNavette(stato, 100);

    const cargoTotaleNavette = stato.navette.reduce(
      (somma, n) => somma + Object.values(n.caricoAttuale).reduce((a, b) => a + (b ?? 0), 0),
      0,
    );
    // Il materiale caricato dalla navetta non e' andato perso: e' ancora a bordo.
    expect(cargoTotaleNavette).toBeGreaterThan(0);
    expect(stato.navette.some((n) => n.stato === "indisponibile" || n.stato === "scarico")).toBe(true);
    // La stiva della nave madre non ha superato la propria capacita'.
    const stivaTotale = Object.values(stato.mothership.stivaCarico).reduce((a, b) => a + (b ?? 0), 0);
    expect(stivaTotale).toBeLessThanOrEqual(stato.mothership.stivaCapacita);
  });

  it("non modifica lo stato se non ci sono navette libere ne' in movimento", () => {
    const stato = creaStatoIniziale("senza-navette-attive");
    const aggiornato = integraNavette(stato, 100);
    expect(aggiornato).toBe(stato);
  });
});
