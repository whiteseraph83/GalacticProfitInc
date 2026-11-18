import type { SeededRng } from "../domain/rng";

// Generatore di nomi procedurali in stile "catalogo corporate OmniProfit":
// sillaba + sillaba + codice catalogo. Non pretende realismo linguistico,
// solo varieta' e un tono sci-fi coerente col resto del gioco.
const SILLABE_A = ["Kel", "Tha", "Vor", "Myr", "Zan", "Es", "Dra", "Nyx", "Sol", "Orin", "Ar", "Vex"];
const SILLABE_B = ["os", "ar", "eth", "ion", "ara", "ux", "ion", "al", "endi", "oth"];

export function generaNomePianeta(rng: SeededRng, existing: Set<string>): string {
  let nome = "";
  let tentativi = 0;
  do {
    const a = rng.pick(SILLABE_A);
    const b = rng.pick(SILLABE_B);
    const catalogo = rng.nextInt(1, 999);
    nome = `${a}${b} ${catalogo}`;
    tentativi += 1;
  } while (existing.has(nome) && tentativi < 50);
  existing.add(nome);
  return nome;
}

// Nomi di civilta' (Macrostep 9): stesso principio procedurale ma con un
// prefisso "istituzionale" in stile satirico-corporate, per distinguerle a
// colpo d'occhio dai nomi dei pianeti.
const PREFISSI_CIVILTA = ["Collettivo", "Enclave", "Consorzio", "Cooperativa", "Sindacato", "Assemblea"];

export function generaNomeCivilta(rng: SeededRng, existing: Set<string>): string {
  let nome = "";
  let tentativi = 0;
  do {
    const prefisso = rng.pick(PREFISSI_CIVILTA);
    const a = rng.pick(SILLABE_A);
    const b = rng.pick(SILLABE_B);
    nome = `${prefisso} di ${a}${b}`;
    tentativi += 1;
  } while (existing.has(nome) && tentativi < 50);
  existing.add(nome);
  return nome;
}
