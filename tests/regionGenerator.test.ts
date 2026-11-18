import { describe, expect, it } from "vitest";
import { generaRegione } from "../src/world/regionGenerator";
import { WORLD } from "../src/domain/worldConstants";
import { CIVILTA } from "../src/domain/civilizations";
import { PERICOLI } from "../src/domain/hazards";

describe("generaRegione", () => {
  it("stesso seed produce sempre la stessa regione", () => {
    const a = generaRegione("regione-test");
    const b = generaRegione("regione-test");
    expect(a).toEqual(b);
  });

  it("seed diversi producono regioni diverse", () => {
    const a = generaRegione("regione-uno");
    const b = generaRegione("regione-due");
    expect(a.pianeti.map((p) => p.posizione)).not.toEqual(b.pianeti.map((p) => p.posizione));
  });

  it("genera tra 50 e 100 pianeti", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const regione = generaRegione(seed);
      expect(regione.pianeti.length).toBeGreaterThanOrEqual(WORLD.pianetiMin);
      expect(regione.pianeti.length).toBeLessThanOrEqual(WORLD.pianetiMax);
    }
  });

  it("gli archetipi anomali sono una piccola minoranza (circa 2-5%, su piu' seed)", () => {
    // Un singolo seed puo' oscillare per varianza statistica su ~50-100
    // pianeti: si verifica la media su piu' regioni indipendenti.
    const semi = ["regione-anomali-1", "regione-anomali-2", "regione-anomali-3", "regione-anomali-4", "regione-anomali-5"];
    let totalePianeti = 0;
    let totaleAnomali = 0;
    for (const seme of semi) {
      const regione = generaRegione(seme);
      totalePianeti += regione.pianeti.length;
      totaleAnomali += regione.pianeti.filter((p) => p.archetipo === "anomalo").length;
    }
    expect(totaleAnomali / totalePianeti).toBeLessThan(0.06);
  });

  it("l'area sicura iniziale contiene pianeti scoperti con archetipi comuni", () => {
    const regione = generaRegione("regione-sicura");
    const scoperti = regione.pianeti.filter((p) => p.scoperto);
    expect(scoperti.length).toBeGreaterThanOrEqual(WORLD.areaSicuraPianetiMin);
    for (const pianeta of scoperti) {
      const dist = Math.hypot(
        pianeta.posizione.x - regione.areaSicuraIniziale.centro.x,
        pianeta.posizione.y - regione.areaSicuraIniziale.centro.y,
      );
      expect(dist).toBeLessThanOrEqual(regione.areaSicuraIniziale.raggio);
    }
  });

  it("la stragrande maggioranza dei corpi rispetta la separazione minima", () => {
    const regione = generaRegione("regione-overlap");
    const corpi = [...regione.pianeti, ...regione.campiRelitti];
    let sovrapposizioni = 0;
    for (let i = 0; i < corpi.length; i++) {
      for (let j = i + 1; j < corpi.length; j++) {
        const a = corpi[i];
        const b = corpi[j];
        const dist = Math.hypot(a.posizione.x - b.posizione.x, a.posizione.y - b.posizione.y);
        if (dist < a.raggio + b.raggio) sovrapposizioni += 1;
      }
    }
    // I tentativi di posizionamento falliscono raramente (fallback deterministico
    // dopo N tentativi): tollerata una piccola percentuale di sovrapposizioni.
    expect(sovrapposizioni / corpi.length).toBeLessThan(0.1);
  });

  it("i nomi dei pianeti sono unici", () => {
    const regione = generaRegione("regione-nomi");
    const nomi = new Set(regione.pianeti.map((p) => p.nome));
    expect(nomi.size).toBe(regione.pianeti.length);
  });

  it("genera tra 3 e 6 campi di relitti/asteroidi", () => {
    const regione = generaRegione("regione-relitti");
    expect(regione.campiRelitti.length).toBeGreaterThanOrEqual(WORLD.relittiMin);
    expect(regione.campiRelitti.length).toBeLessThanOrEqual(WORLD.relittiMax);
  });

  it("genera tra 1 e 3 civilta', con relazione iniziale e id unici", () => {
    const regione = generaRegione("regione-civilta");
    expect(regione.civilta.length).toBeGreaterThanOrEqual(CIVILTA.numeroMin);
    expect(regione.civilta.length).toBeLessThanOrEqual(CIVILTA.numeroMax);
    const idUnici = new Set(regione.civilta.map((c) => c.id));
    expect(idUnici.size).toBe(regione.civilta.length);
    for (const civilta of regione.civilta) {
      expect(civilta.relazione).toBe(CIVILTA.relazioneIniziale);
    }
  });

  it("i nomi delle civilta' sono unici", () => {
    const regione = generaRegione("regione-civilta-nomi");
    const nomi = new Set(regione.civilta.map((c) => c.nome));
    expect(nomi.size).toBe(regione.civilta.length);
  });

  it("alcune civilta' hanno una richiesta attiva con quantita' nel range atteso", () => {
    // Su piu' seed, verifica che almeno una richiesta generata rispetti il range.
    let trovata = false;
    for (const seme of ["civilta-richiesta-1", "civilta-richiesta-2", "civilta-richiesta-3", "civilta-richiesta-4"]) {
      const regione = generaRegione(seme);
      for (const civilta of regione.civilta) {
        if (!civilta.richiestaAttiva) continue;
        trovata = true;
        expect(civilta.richiestaAttiva.quantita).toBeGreaterThanOrEqual(CIVILTA.richiestaQuantitaMin);
        expect(civilta.richiestaAttiva.quantita).toBeLessThanOrEqual(CIVILTA.richiestaQuantitaMax);
        expect(civilta.richiestaAttiva.progresso).toBe(0);
      }
    }
    expect(trovata).toBe(true);
  });

  it("genera tra 2 e 4 pericoli regionali, con intensita' nel range atteso", () => {
    const regione = generaRegione("regione-pericoli");
    expect(regione.pericoli.length).toBeGreaterThanOrEqual(PERICOLI.numeroMin);
    expect(regione.pericoli.length).toBeLessThanOrEqual(PERICOLI.numeroMax);
    const idUnici = new Set(regione.pericoli.map((p) => p.id));
    expect(idUnici.size).toBe(regione.pericoli.length);
    for (const pericolo of regione.pericoli) {
      expect(pericolo.intensita).toBeGreaterThanOrEqual(PERICOLI.intensitaMin);
      expect(pericolo.intensita).toBeLessThanOrEqual(PERICOLI.intensitaMax);
      expect(["tempesta", "campoGravitazionale", "radiazioni"]).toContain(pericolo.tipo);
    }
  });
});
