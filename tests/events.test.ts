import { describe, expect, it } from "vitest";
import { creaStatoIniziale, validaStato } from "../src/domain/initialState";
import { EVENTI_CONFIG, EVENTO_DEFINITIONS } from "../src/domain/events";
import { SeededRng } from "../src/domain/rng";
import {
  applicaIgnoraEvento,
  applicaSceltaEvento,
  integraGenerazioneEventi,
  validaIgnoraEvento,
  validaSceltaEvento,
} from "../src/simulation/events";
import type { EventoAttivo, GameState } from "../src/domain/types";

describe("integraGenerazioneEventi", () => {
  it("non genera eventi prima della soglia", () => {
    const base = creaStatoIniziale("eventi-presto");
    const stato: GameState = { ...base, eventi: { ...base.eventi, carteGiocateDallUltimo: base.eventi.sogliaProssimo - 1 } };
    const { stato: dopo, notifiche } = integraGenerazioneEventi(stato, new SeededRng("rng-eventi-1"));
    expect(dopo).toBe(stato);
    expect(notifiche).toHaveLength(0);
  });

  it("genera un evento al raggiungimento della soglia, azzerando il contatore", () => {
    const base = creaStatoIniziale("eventi-soglia");
    const stato: GameState = { ...base, eventi: { ...base.eventi, carteGiocateDallUltimo: base.eventi.sogliaProssimo } };
    const { stato: dopo, notifiche } = integraGenerazioneEventi(stato, new SeededRng("rng-eventi-2"));
    expect(dopo.eventi.attivi).toHaveLength(1);
    expect(dopo.eventi.carteGiocateDallUltimo).toBe(0);
    expect(dopo.eventi.sogliaProssimo).toBeGreaterThanOrEqual(EVENTI_CONFIG.sogliaCarteMin);
    expect(dopo.eventi.sogliaProssimo).toBeLessThanOrEqual(EVENTI_CONFIG.sogliaCarteMax);
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("non supera il numero massimo di eventi attivi contemporanei", () => {
    const base = creaStatoIniziale("eventi-max");
    const attiviPieni: EventoAttivo[] = Array.from({ length: EVENTI_CONFIG.attiviMax }, (_, i) => ({
      id: `evento-pieno-${i}`,
      definizioneId: "EVT-AZ-01",
      creatoAlMs: 0,
    }));
    const stato: GameState = { ...base, eventi: { attivi: attiviPieni, carteGiocateDallUltimo: base.eventi.sogliaProssimo, sogliaProssimo: base.eventi.sogliaProssimo } };
    const { stato: dopo } = integraGenerazioneEventi(stato, new SeededRng("rng-eventi-3"));
    expect(dopo.eventi.attivi).toHaveLength(EVENTI_CONFIG.attiviMax);
  });
});

describe("validaSceltaEvento / applicaSceltaEvento", () => {
  function statoConEvento(seed: string, definizioneId: string): GameState {
    const base = creaStatoIniziale(seed);
    const evento: EventoAttivo = { id: "evento-test", definizioneId, creatoAlMs: 0 };
    return { ...base, eventi: { ...base.eventi, attivi: [evento] } };
  }

  it("rifiuta un evento non attivo", () => {
    const stato = creaStatoIniziale("scelta-no-evento");
    expect(validaSceltaEvento(stato, "non-esiste", "qualsiasi").ok).toBe(false);
  });

  it("rifiuta una scelta non valida per l'evento", () => {
    const stato = statoConEvento("scelta-non-valida", "EVT-AZ-01");
    expect(validaSceltaEvento(stato, "evento-test", "scelta-inesistente").ok).toBe(false);
  });

  it("applica l'effetto crediti e rimuove l'evento dagli attivi", () => {
    const stato = statoConEvento("scelta-crediti", "EVT-AZ-02");
    expect(validaSceltaEvento(stato, "evento-test", "reinvesti").ok).toBe(true);
    const { stato: dopo, notifiche } = applicaSceltaEvento(stato, "evento-test", "reinvesti", new SeededRng("rng-scelta-1"));
    expect(dopo.crediti).toBe(stato.crediti + 150);
    expect(dopo.eventi.attivi).toHaveLength(0);
    expect(notifiche.length).toBeGreaterThan(0);
  });

  it("applica l'effetto fiducia (negativo incluso)", () => {
    const stato = statoConEvento("scelta-fiducia", "EVT-AZ-01");
    const { stato: dopo } = applicaSceltaEvento(stato, "evento-test", "nascondi", new SeededRng("rng-scelta-2"));
    expect(dopo.crediti).toBe(stato.crediti + 100);
    expect(dopo.review.fiducia).toBe(stato.review.fiducia - 10);
  });

  it("applica relazioneCivilta alla civilta' scoperta piu' vicina", () => {
    const base = statoConEvento("scelta-relazione", "EVT-DI-02");
    const stato: GameState = {
      ...base,
      civilta: [{ id: "civ-1", nome: "Test", posizione: { x: 0, y: 0 }, raggio: 50, scoperta: true, relazione: 30, richiestaAttiva: null }],
    };
    const { stato: dopo } = applicaSceltaEvento(stato, "evento-test", "media", new SeededRng("rng-scelta-3"));
    expect(dopo.civilta[0].relazione).toBe(36);
  });

  it("cargoRubato sottrae la percentuale indicata da ogni risorsa in stiva", () => {
    const base = statoConEvento("scelta-cargo", "EVT-PIR-01");
    const stato: GameState = { ...base, mothership: { ...base.mothership, stivaCarico: { ferro: 100 } } };
    const { stato: dopo } = applicaSceltaEvento(stato, "evento-test", "rifiuta", new SeededRng("rng-scelta-4"));
    expect(dopo.mothership.stivaCarico.ferro).toBe(85); // 15% rubato
  });

  it("naveMinerariaDistrutta (evento critico) rimuove una nave e i suoi contratti/moduli", () => {
    const base = statoConEvento("scelta-critico", "EVT-PIR-02");
    const nave = base.naviMinerarie[0];
    const stato: GameState = {
      ...base,
      contrattiMinerari: [
        {
          id: "contratto-x",
          pianetaId: base.pianeti[0].id,
          naveMinerariaId: nave.id,
          risorsa: "ferro",
          giacimentoResiduo: 50,
          estrazioneAlMinuto: 4,
          depositoAccumulato: 0,
          priorita: 1,
          ultimaAssegnazioneMs: 0,
          attivo: true,
        },
      ],
      moduli: [{ instanceId: "modulo-x", definizioneId: "MOD-PERFORATORE", naveMinerariaId: nave.id }],
    };
    const { stato: dopo } = applicaSceltaEvento(stato, "evento-test", "tentaFuga", new SeededRng("rng-scelta-5"));
    expect(dopo.naviMinerarie.find((n) => n.id === nave.id)).toBeUndefined();
    expect(dopo.contrattiMinerari).toHaveLength(0);
    expect(dopo.moduli[0].naveMinerariaId).toBeNull();
  });

  it("l'evento critico e' effettivamente marcato critico nella definizione", () => {
    expect(EVENTO_DEFINITIONS["EVT-PIR-02"].critico).toBe(true);
    expect(EVENTO_DEFINITIONS["EVT-AZ-01"].critico).toBe(false);
  });
});

describe("validaIgnoraEvento / applicaIgnoraEvento", () => {
  it("accetta di ignorare un evento ordinario", () => {
    const base = creaStatoIniziale("ignora-ordinario");
    const evento: EventoAttivo = { id: "evento-ignora", definizioneId: "EVT-AZ-01", creatoAlMs: 0 };
    const stato: GameState = { ...base, eventi: { ...base.eventi, attivi: [evento] } };
    expect(validaIgnoraEvento(stato, "evento-ignora").ok).toBe(true);
    const dopo = applicaIgnoraEvento(stato, "evento-ignora");
    expect(dopo.eventi.attivi).toHaveLength(0);
  });

  it("rifiuta di ignorare un evento critico: richiede sempre una scelta esplicita", () => {
    const base = creaStatoIniziale("ignora-critico");
    const evento: EventoAttivo = { id: "evento-critico", definizioneId: "EVT-PIR-02", creatoAlMs: 0 };
    const stato: GameState = { ...base, eventi: { ...base.eventi, attivi: [evento] } };
    expect(validaIgnoraEvento(stato, "evento-critico").ok).toBe(false);
  });
});

describe("eventi commerciali unici (EVT-COM-01/02)", () => {
  it("non vengono generati prima del capitolo 2", () => {
    const base = creaStatoIniziale("com-prima-capitolo-2");
    const stato: GameState = { ...base, eventi: { ...base.eventi, carteGiocateDallUltimo: base.eventi.sogliaProssimo } };
    // 50 generazioni successive con seed diversi: mai EVT-COM-01/02 prima del capitolo 2.
    for (let i = 0; i < 50; i += 1) {
      const { stato: dopo } = integraGenerazioneEventi(stato, new SeededRng(`com-seed-${i}`));
      const def = dopo.eventi.attivi[0]?.definizioneId;
      expect(def).not.toBe("EVT-COM-01");
      expect(def).not.toBe("EVT-COM-02");
    }
  });

  it("EVT-COM-02 non viene generato prima che EVT-COM-01 sia gia' comparso", () => {
    const base = creaStatoIniziale("com-ordine");
    const stato: GameState = {
      ...base,
      campagna: { ...base.campagna, capitoloCorrente: "CAP-2" },
      eventi: { ...base.eventi, carteGiocateDallUltimo: base.eventi.sogliaProssimo },
    };
    for (let i = 0; i < 50; i += 1) {
      const { stato: dopo } = integraGenerazioneEventi(stato, new SeededRng(`com-ordine-seed-${i}`));
      expect(dopo.eventi.attivi[0]?.definizioneId).not.toBe("EVT-COM-02");
    }
  });

  it("registra l'id in campagna.eventiMercatoSpeciali quando EVT-COM-01 viene generato, e non lo ripete", () => {
    const base = creaStatoIniziale("com-registrato");
    let stato: GameState = {
      ...base,
      campagna: { ...base.campagna, capitoloCorrente: "CAP-2" },
      eventi: { ...base.eventi, carteGiocateDallUltimo: base.eventi.sogliaProssimo },
    };
    let visto = false;
    for (let i = 0; i < 200 && !visto; i += 1) {
      const { stato: dopo } = integraGenerazioneEventi(stato, new SeededRng(`com-registrato-seed-${i}`));
      if (dopo.eventi.attivi.some((e) => e.definizioneId === "EVT-COM-01")) {
        expect(dopo.campagna.eventiMercatoSpeciali).toContain("EVT-COM-01");
        visto = true;
      }
      stato = { ...dopo, eventi: { ...dopo.eventi, attivi: [], carteGiocateDallUltimo: dopo.eventi.sogliaProssimo } };
    }
    expect(visto).toBe(true);

    // Una volta registrato, non deve mai piu' essere scelto dal pool casuale.
    for (let i = 0; i < 50; i += 1) {
      const { stato: dopo } = integraGenerazioneEventi(stato, new SeededRng(`com-no-repeat-${i}`));
      expect(dopo.eventi.attivi.some((e) => e.definizioneId === "EVT-COM-01")).toBe(false);
    }
  });
});

describe("stato iniziale con eventi", () => {
  it("resta valido secondo validaStato", () => {
    expect(validaStato(creaStatoIniziale("eventi-stato-valido"))).toEqual([]);
  });
});
