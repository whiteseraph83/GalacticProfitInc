import type { PlanetArchetype, RawResourceType } from "./types";

/**
 * Metadati per archetipo (A5/B4): colore base, range dimensioni, risorsa
 * dominante tipica, peso di generazione e se l'archetipo ha atmosfera.
 * Gli archetipi "comuni" sono quelli raggiungibili nell'area sicura
 * iniziale; "anomalo" e' il ~2-3% di elementi rari/speciali.
 */
export interface PlanetArchetypeDef {
  archetipo: PlanetArchetype;
  nomeVisualizzato: string;
  coloreBase: number;
  haloColore: number;
  raggioMin: number;
  raggioMax: number;
  haAtmosfera: boolean;
  risorsaDominante: RawResourceType;
  peso: number;
  comune: boolean;
}

export const PLANET_ARCHETYPES: Record<PlanetArchetype, PlanetArchetypeDef> = {
  roccioso: {
    archetipo: "roccioso",
    nomeVisualizzato: "Roccioso",
    coloreBase: 0x9c8468,
    haloColore: 0xc9b38c,
    raggioMin: 16,
    raggioMax: 30,
    haAtmosfera: false,
    risorsaDominante: "ferro",
    peso: 22,
    comune: true,
  },
  desertico: {
    archetipo: "desertico",
    nomeVisualizzato: "Desertico",
    coloreBase: 0xc98b4a,
    haloColore: 0xe8b26b,
    raggioMin: 18,
    raggioMax: 32,
    haAtmosfera: true,
    risorsaDominante: "ferro",
    peso: 14,
    comune: true,
  },
  ghiacciato: {
    archetipo: "ghiacciato",
    nomeVisualizzato: "Ghiacciato",
    coloreBase: 0xaed4e8,
    haloColore: 0xdff3ff,
    raggioMin: 16,
    raggioMax: 28,
    haAtmosfera: true,
    risorsaDominante: "cristalliSilicio",
    peso: 14,
    comune: true,
  },
  oceanico: {
    archetipo: "oceanico",
    nomeVisualizzato: "Oceanico",
    coloreBase: 0x2f6fa8,
    haloColore: 0x5fb3e6,
    raggioMin: 18,
    raggioMax: 30,
    haAtmosfera: true,
    risorsaDominante: "cristalliSilicio",
    peso: 10,
    comune: true,
  },
  terrestre: {
    archetipo: "terrestre",
    nomeVisualizzato: "Terreno",
    coloreBase: 0x3f7a4e,
    haloColore: 0x79c98f,
    raggioMin: 18,
    raggioMax: 32,
    haAtmosfera: true,
    risorsaDominante: "titanioStellare",
    peso: 10,
    comune: true,
  },
  vulcanico: {
    archetipo: "vulcanico",
    nomeVisualizzato: "Vulcanico",
    coloreBase: 0x4a3028,
    haloColore: 0xff6a2e,
    raggioMin: 16,
    raggioMax: 28,
    haAtmosfera: false,
    risorsaDominante: "titanioStellare",
    peso: 10,
    comune: true,
  },
  gassoso: {
    archetipo: "gassoso",
    nomeVisualizzato: "Gassoso",
    coloreBase: 0xc9a06a,
    haloColore: 0xe8c89a,
    raggioMin: 30,
    raggioMax: 48,
    haAtmosfera: true,
    risorsaDominante: "iridioQuantico",
    peso: 8,
    comune: false,
  },
  cristallino: {
    archetipo: "cristallino",
    nomeVisualizzato: "Cristallino",
    coloreBase: 0x8a5fc9,
    haloColore: 0xc9a0ff,
    raggioMin: 16,
    raggioMax: 26,
    haAtmosfera: false,
    risorsaDominante: "iridioQuantico",
    peso: 6,
    comune: false,
  },
  anomalo: {
    archetipo: "anomalo",
    nomeVisualizzato: "Anomalo",
    coloreBase: 0x6a2e9c,
    haloColore: 0xff4ecb,
    raggioMin: 14,
    raggioMax: 26,
    haAtmosfera: false,
    risorsaDominante: "materiaEsotica",
    peso: 3,
    comune: false,
  },
};

export const ARCHETIPI_COMUNI: PlanetArchetype[] = Object.values(PLANET_ARCHETYPES)
  .filter((d) => d.comune)
  .map((d) => d.archetipo);
