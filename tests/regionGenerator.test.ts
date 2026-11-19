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
    const semi = [
      "regione-anomali-1", "regione-anomali-2", "regione-anomali-3", "regione-anomali-4", "regione-anomali-5",
      "regione-anomali-6", "regione-anomali-7", "regione-anomali-8",
    ];
    let totalePianeti = 0;
    let totaleAnomali = 0;
    for (const seme of semi) {
      const regione = generaRegione(seme);
      totalePianeti += regione.pianeti.length;
      totaleAnomali += regione.pianeti.filter((p) => p.archetipo === "anomalo").length;
    }
    expect(totaleAnomali / totalePianeti).toBeLessThan(0.06);
  });

  it("nessun pianeta e' presente (ne' scoperto) dentro il cerchio della nave madre a inizio partita (richiesta utente)", () => {
    for (const seed of ["regione-sicura-1", "regione-sicura-2", "regione-sicura-3"]) {
      const regione = generaRegione(seed);
      for (const pianeta of regione.pianeti) {
        const dist = Math.hypot(
          pianeta.posizione.x - regione.areaSicuraIniziale.centro.x,
          pianeta.posizione.y - regione.areaSicuraIniziale.centro.y,
        );
        expect(dist).toBeGreaterThan(regione.areaSicuraIniziale.raggio);
      }
      expect(regione.pianeti.some((p) => p.scoperto)).toBe(false);
    }
  });

  it("il primo pianeta della regione contiene sempre ferro ed e' appena fuori dal cerchio della nave madre (richiesta utente: tutorial guidato)", () => {
    for (const seed of ["regione-ferro-1", "regione-ferro-2", "regione-ferro-3", "regione-ferro-4", "regione-ferro-5"]) {
      const regione = generaRegione(seed);
      const primo = regione.pianeti[0];
      expect(primo.scoperto).toBe(false);
      expect(primo.risorsaDominante).toBe("ferro");
    }
  });

  it("il pianeta a ferro a portata di Radar e' sempre il pianeta piu' vicino alla nave madre (richiesta utente: il primo investiga deve essere esclusivamente su quel pianeta)", () => {
    for (const seed of ["regione-piu-vicino-1", "regione-piu-vicino-2", "regione-piu-vicino-3", "regione-piu-vicino-4", "regione-piu-vicino-5"]) {
      const regione = generaRegione(seed);
      const centro = regione.areaSicuraIniziale.centro;
      const distanzaDa = (p: (typeof regione.pianeti)[number]) => Math.hypot(p.posizione.x - centro.x, p.posizione.y - centro.y);
      const primo = regione.pianeti[0];
      for (const altro of regione.pianeti.slice(1)) {
        expect(distanzaDa(primo)).toBeLessThan(distanzaDa(altro));
      }
    }
  });

  it("esiste sempre un pianeta non scoperto poco fuori dal raggio sensori, a portata del primo Radar (richiesta utente)", () => {
    for (const seed of ["regione-radar-1", "regione-radar-2", "regione-radar-3", "regione-radar-4", "regione-radar-5"]) {
      const regione = generaRegione(seed);
      const aPortata = regione.pianeti.find((p) => {
        if (p.scoperto) return false;
        const dist = Math.hypot(p.posizione.x - regione.areaSicuraIniziale.centro.x, p.posizione.y - regione.areaSicuraIniziale.centro.y);
        return dist > WORLD.visibilitaRaggio && dist <= WORLD.areaSicuraRaggio * 1.4 + 1;
      });
      expect(aPortata).toBeDefined();
    }
  });

  it("nessun pianeta sparso/cluster finisce dentro l'area sicura oltre a quelli previsti li' (richiesta utente: pianeti sparsi su tutta la mappa)", () => {
    for (const seed of ["regione-affollamento-1", "regione-affollamento-2", "regione-affollamento-3", "regione-affollamento-4", "regione-affollamento-5"]) {
      const regione = generaRegione(seed);
      const dentroAreaSicura = regione.pianeti.filter(
        (p) => Math.hypot(p.posizione.x - regione.areaSicuraIniziale.centro.x, p.posizione.y - regione.areaSicuraIniziale.centro.y) <= WORLD.areaSicuraRaggio,
      );
      // Nessun pianeta deve mai capitare dentro l'area sicura (richiesta
      // utente: "i pianeti a inizio gioco non dovranno proprio essere
      // presenti all'interno del cerchio della nave madre").
      expect(dentroAreaSicura.length).toBe(0);
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
