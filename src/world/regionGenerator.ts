import { SeededRng } from "../domain/rng";
import { ARCHETIPI_COMUNI, PLANET_ARCHETYPES } from "../domain/planetArchetypes";
import { WORLD } from "../domain/worldConstants";
import { CIVILTA, RISORSE_GREZZE } from "../domain/civilizations";
import { PERICOLI } from "../domain/hazards";
import type {
  Civilta,
  Planet,
  PlanetArchetype,
  RegionalHazard,
  RegioneSpaziale,
  TipoPericolo,
  Vector2,
  WreckField,
  WreckFieldType,
} from "../domain/types";
import { jitterColor } from "./colorUtils";
import { generaNomeCivilta, generaNomePianeta } from "./nameGenerator";

const PESO_TOTALE_ARCHETIPI = Object.values(PLANET_ARCHETYPES).reduce((somma, def) => somma + def.peso, 0);

/** Archetipi comuni la cui risorsa dominante e' il ferro (richiesta utente:
 * "il primo pianeta deve contenere il ferro come risorsa", cosi' che il
 * tutorial possa guidare in modo affidabile verso Investiga + Contratto
 * minerario su quel pianeta specifico fin dall'inizio partita). */
const ARCHETIPI_FERRO: PlanetArchetype[] = Object.values(PLANET_ARCHETYPES)
  .filter((d) => d.comune && d.risorsaDominante === "ferro")
  .map((d) => d.archetipo);

function scegliArchetipo(rng: SeededRng, soloComuni: boolean): PlanetArchetype {
  if (soloComuni) return rng.pick(ARCHETIPI_COMUNI);

  let soglia = rng.nextFloat(0, PESO_TOTALE_ARCHETIPI);
  for (const def of Object.values(PLANET_ARCHETYPES)) {
    soglia -= def.peso;
    if (soglia <= 0) return def.archetipo;
  }
  return "roccioso";
}

interface CorpoPiazzato {
  posizione: Vector2;
  raggio: number;
}

function distanza(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Richiesta utente: "i pianeti devono essere sparsi in tutta l'intera
 * mappa... non tutti vicini alla nave madre" — un sistema stellare (cluster)
 * o un corpo sparso liberamente potevano capitare per puro caso proprio
 * intorno all'area sicura iniziale, affollandola ben oltre i 2-3 pianeti
 * previsti li'. Questo wrapper ricampiona (entro un limite di tentativi,
 * per restare deterministico) finche' il candidato non cade fuori dal
 * cerchio dell'area sicura, cosi' tutto il resto della generazione
 * (cluster, pianeti sparsi, relitti, civilta', pericoli) resta escluso da
 * quella zona per costruzione invece che per fortuna statistica. */
function campionaFuoriAreaSicura(centro: Vector2, raggioEsclusione: number, campiona: () => Vector2): () => Vector2 {
  return () => {
    let candidato = campiona();
    for (let tentativo = 0; tentativo < 30 && distanza(candidato, centro) <= raggioEsclusione; tentativo++) {
      candidato = campiona();
    }
    return candidato;
  };
}

function posizioneValida(pos: Vector2, raggio: number, piazzati: CorpoPiazzato[]): boolean {
  for (const corpo of piazzati) {
    const minDistanza = raggio + corpo.raggio + WORLD.separazioneMinimaPadding;
    if (distanza(pos, corpo.posizione) < minDistanza) return false;
  }
  return true;
}

function posizionaConRitentativi(raggio: number, piazzati: CorpoPiazzato[], campiona: () => Vector2): Vector2 {
  let candidato = campiona();
  for (let tentativo = 0; tentativo < WORLD.tentativiPosizionamento; tentativo++) {
    if (posizioneValida(candidato, raggio, piazzati)) return candidato;
    candidato = campiona();
  }
  // Nessuna posizione libera trovata entro i tentativi: si accetta comunque
  // l'ultimo candidato per restare deterministici (nessun loop illimitato).
  return candidato;
}

export function generaRegione(seed: string): RegioneSpaziale {
  const rng = new SeededRng(`${seed}|regione`);
  const nomiUsati = new Set<string>();
  const piazzati: CorpoPiazzato[] = [];
  const pianeti: Planet[] = [];

  const centroAreaSicura: Vector2 = { x: 0, y: 0 };
  const areaSicuraIniziale = { centro: centroAreaSicura, raggio: WORLD.areaSicuraRaggio };

  const totalePianeti = rng.nextInt(WORLD.pianetiMin, WORLD.pianetiMax);

  // --- Area sicura iniziale: garantisce risorse comuni raggiungibili subito. ---
  const pianetiAreaSicura = rng.nextInt(WORLD.areaSicuraPianetiMin, WORLD.areaSicuraPianetiMax);
  for (let i = 0; i < pianetiAreaSicura; i++) {
    // Il primo pianeta dell'area sicura e' sempre un archetipo a ferro: e'
    // quello su cui il tutorial guida Investiga + Contratto minerario come
    // primi passi obbligati (richiesta utente), quindi deve essere
    // affidabile e non dipendere dall'esito casuale della generazione.
    const archetipo = i === 0 ? rng.pick(ARCHETIPI_FERRO) : scegliArchetipo(rng, true);
    const def = PLANET_ARCHETYPES[archetipo];
    const raggio = rng.nextFloat(def.raggioMin, def.raggioMax);
    const posizione = posizionaConRitentativi(raggio, piazzati, () => {
      const angolo = rng.nextFloat(0, Math.PI * 2);
      // Richiesta utente: non piu' subito a ridosso della nave madre (prima
      // il raggio minimo era 60, troppo vicino al punto di partenza) —
      // ora parte circa a meta' del raggio sensori e arriva fino al bordo.
      const distanzaCentro = rng.nextFloat(WORLD.areaSicuraRaggio * 0.45, WORLD.areaSicuraRaggio * 0.92);
      return { x: Math.cos(angolo) * distanzaCentro, y: Math.sin(angolo) * distanzaCentro };
    });
    piazzati.push({ posizione, raggio });
    pianeti.push(creaPianeta(rng, archetipo, posizione, raggio, nomiUsati, centroAreaSicura, areaSicuraIniziale.raggio));
  }

  // --- Pianeta "a portata di Radar": garantisce che il primo utilizzo del
  // comando Radar (C1_S02 nella sceneggiatura introduttiva) riveli subito
  // un pianeta vicino invece di uno a caso ovunque nella regione (richiesta
  // utente: "deve essere poco fuori dal cerchio del radar della nave
  // madre"). Non ancora scoperto per costruzione (e' oltre areaSicuraRaggio). ---
  {
    const archetipo = scegliArchetipo(rng, true);
    const def = PLANET_ARCHETYPES[archetipo];
    const raggio = rng.nextFloat(def.raggioMin, def.raggioMax);
    const posizione = posizionaConRitentativi(raggio, piazzati, () => {
      const angolo = rng.nextFloat(0, Math.PI * 2);
      const distanzaCentro = rng.nextFloat(WORLD.areaSicuraRaggio * 1.05, WORLD.areaSicuraRaggio * 1.4);
      return { x: Math.cos(angolo) * distanzaCentro, y: Math.sin(angolo) * distanzaCentro };
    });
    piazzati.push({ posizione, raggio });
    pianeti.push(creaPianeta(rng, archetipo, posizione, raggio, nomiUsati, centroAreaSicura, areaSicuraIniziale.raggio));
  }

  // --- Sistemi stellari riconoscibili (cluster): il centro non deve mai
  // cadere a ridosso dell'area sicura, altrimenti l'intero cluster (fino a
  // sistemaRaggioCluster di raggio) finirebbe per affollarla. ---
  const numSistemi = rng.nextInt(WORLD.sistemiStellariMin, WORLD.sistemiStellariMax);
  const centriSistemi: Vector2[] = [];
  const campionaCentroSistema = campionaFuoriAreaSicura(
    centroAreaSicura,
    WORLD.areaSicuraRaggio + WORLD.sistemaRaggioCluster,
    () => ({
      x: rng.nextFloat(-WORLD.estensioneRegioneMeta * 0.85, WORLD.estensioneRegioneMeta * 0.85),
      y: rng.nextFloat(-WORLD.estensioneRegioneMeta * 0.85, WORLD.estensioneRegioneMeta * 0.85),
    }),
  );
  for (let i = 0; i < numSistemi; i++) {
    centriSistemi.push(campionaCentroSistema());
  }

  // --- Resto dei pianeti: in parte in cluster, in parte sparsi liberamente,
  // sempre fuori dall'area sicura (richiesta utente: "sparsi in tutta
  // l'intera mappa... non tutti vicini alla nave madre"). ---
  while (pianeti.length < totalePianeti) {
    const archetipo = scegliArchetipo(rng, false);
    const def = PLANET_ARCHETYPES[archetipo];
    const raggio = rng.nextFloat(def.raggioMin, def.raggioMax);

    const inCluster = centriSistemi.length > 0 && rng.next() < WORLD.probabilitaAppartenenzaCluster;
    const posizione = posizionaConRitentativi(
      raggio,
      piazzati,
      campionaFuoriAreaSicura(centroAreaSicura, WORLD.areaSicuraRaggio, () => {
        if (inCluster) {
          const centro = rng.pick(centriSistemi);
          const angolo = rng.nextFloat(0, Math.PI * 2);
          const distanzaCentro = rng.nextFloat(0, WORLD.sistemaRaggioCluster);
          return { x: centro.x + Math.cos(angolo) * distanzaCentro, y: centro.y + Math.sin(angolo) * distanzaCentro };
        }
        return {
          x: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
          y: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
        };
      }),
    );

    piazzati.push({ posizione, raggio });
    pianeti.push(creaPianeta(rng, archetipo, posizione, raggio, nomiUsati, centroAreaSicura, areaSicuraIniziale.raggio));
  }

  // --- Relitti e campi di asteroidi (gestiti da Recupera rottami, non da contratto). ---
  const numRelitti = rng.nextInt(WORLD.relittiMin, WORLD.relittiMax);
  const campiRelitti: WreckField[] = [];
  for (let i = 0; i < numRelitti; i++) {
    const raggio = rng.nextFloat(WORLD.relittiRaggioMin, WORLD.relittiRaggioMax);
    const posizione = posizionaConRitentativi(
      raggio,
      piazzati,
      campionaFuoriAreaSicura(centroAreaSicura, WORLD.areaSicuraRaggio, () => ({
        x: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
        y: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
      })),
    );
    piazzati.push({ posizione, raggio });
    const tipo: WreckFieldType = rng.next() < 0.6 ? "relitto" : "campoAsteroidi";
    campiRelitti.push({
      id: `wreck-${i}`,
      tipo,
      posizione,
      raggio,
      scoperto: distanza(posizione, centroAreaSicura) <= areaSicuraIniziale.raggio,
      recuperato: false,
    });
  }

  // --- Civilta' locali (B9, Macrostep 9). ---
  const nomiCivilta = new Set<string>();
  const numCivilta = rng.nextInt(CIVILTA.numeroMin, CIVILTA.numeroMax);
  const civilta: Civilta[] = [];
  for (let i = 0; i < numCivilta; i++) {
    const raggio = rng.nextFloat(CIVILTA.raggioMin, CIVILTA.raggioMax);
    const posizione = posizionaConRitentativi(raggio, piazzati, () => ({
      x: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
      y: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
    }));
    piazzati.push({ posizione, raggio });

    const haRichiesta = rng.next() < 0.7;
    const nuovaCivilta: Civilta = {
      id: `civilta-${i}`,
      nome: generaNomeCivilta(rng, nomiCivilta),
      posizione,
      raggio,
      scoperta: distanza(posizione, centroAreaSicura) <= areaSicuraIniziale.raggio,
      relazione: CIVILTA.relazioneIniziale,
      richiestaAttiva: haRichiesta ? creaRichiestaCivilta(rng) : null,
    };
    civilta.push(nuovaCivilta);
  }

  // --- Pericoli regionali: tempeste, campi gravitazionali, radiazioni. ---
  const numPericoli = rng.nextInt(PERICOLI.numeroMin, PERICOLI.numeroMax);
  const tipiPericolo: TipoPericolo[] = ["tempesta", "campoGravitazionale", "radiazioni"];
  const pericoli: RegionalHazard[] = [];
  for (let i = 0; i < numPericoli; i++) {
    const raggio = rng.nextFloat(PERICOLI.raggioMin, PERICOLI.raggioMax);
    const posizione = posizionaConRitentativi(raggio, piazzati, () => ({
      x: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
      y: rng.nextFloat(-WORLD.estensioneRegioneMeta, WORLD.estensioneRegioneMeta),
    }));
    piazzati.push({ posizione, raggio });
    pericoli.push({
      id: `pericolo-${i}`,
      tipo: rng.pick(tipiPericolo),
      posizione,
      raggio,
      scoperto: distanza(posizione, centroAreaSicura) <= areaSicuraIniziale.raggio,
      intensita: rng.nextFloat(PERICOLI.intensitaMin, PERICOLI.intensitaMax),
    });
  }

  return { seedRegione: seed, pianeti, campiRelitti, areaSicuraIniziale, civilta, pericoli };
}

function creaRichiestaCivilta(rng: SeededRng): NonNullable<Civilta["richiestaAttiva"]> {
  const risorsa = rng.pick(RISORSE_GREZZE);
  const quantita = rng.nextInt(CIVILTA.richiestaQuantitaMin, CIVILTA.richiestaQuantitaMax);
  return {
    risorsa,
    quantita,
    progresso: 0,
    ricompensaRelazione: CIVILTA.richiestaRicompensaRelazione,
    ricompensaCrediti: Math.round(quantita * CIVILTA.richiestaRicompensaCreditiPerUnita),
  };
}

function creaPianeta(
  rng: SeededRng,
  archetipo: PlanetArchetype,
  posizione: Vector2,
  raggio: number,
  nomiUsati: Set<string>,
  centroAreaSicura: Vector2,
  areaSicuraRaggio: number,
): Planet {
  const def = PLANET_ARCHETYPES[archetipo];
  const id = `planet-${nomiUsati.size}-${Math.round(posizione.x)}-${Math.round(posizione.y)}`;
  return {
    id,
    nome: generaNomePianeta(rng, nomiUsati),
    archetipo,
    posizione,
    raggio,
    visualProfile: {
      tintColor: jitterColor(rng, def.coloreBase, 18),
      haloColor: jitterColor(rng, def.haloColore, 14),
      haloIntensity: archetipo === "anomalo" ? rng.nextFloat(0.65, 1) : rng.nextFloat(0.35, 0.8),
      atmosfera: def.haAtmosfera,
      nuvolosita: def.haAtmosfera ? rng.nextFloat(0.2, 0.8) : 0,
      velocitaRotazione: rng.nextFloat(0.015, 0.05),
      variantiTexture: rng.nextInt(0, 2),
    },
    scoperto: distanza(posizione, centroAreaSicura) <= areaSicuraRaggio,
    investigato: false,
    investigazioneCompletataAlMs: null,
    sempreVisibile: false,
    risorsaDominante: def.risorsaDominante,
    // Giacimento finito (B1): gli archetipi non comuni sono piu' rari ma
    // leggermente piu' ricchi per singolo pianeta, a bilanciare in futuro.
    giacimentoTotale: def.comune ? rng.nextFloat(400, 900) : rng.nextFloat(250, 600),
  };
}
