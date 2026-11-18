import { CARD_DEFINITIONS } from "../domain/cards";
import { CARD_EFFECTS } from "../domain/cardEffectsConfig";
import { FABBRICA_COSTO } from "../domain/refineRecipes";
import { HYPERSPACE } from "../domain/hyperspace";
import { generaAnteprimaRegione } from "../world/hyperspacePreview";
import type { BersaglioCarta } from "../simulation/commands";
import type { CardInstance, GameState } from "../domain/types";

export interface DettaglioConferma {
  etichetta: string;
  valore: string;
}

/** Testo del dialogo di conferma (A2): nome carta, bersaglio, effetto,
 * costi, durata, conseguenze irreversibili - mostrato PRIMA di consumare
 * la carta, sia per drag & drop sia per click-carta/click-bersaglio. */
export function dettagliConfermaCarta(carta: CardInstance, bersaglio: BersaglioCarta, stato: GameState): DettaglioConferma[] {
  const def = CARD_DEFINITIONS[carta.code];

  switch (carta.code) {
    case "OPS-01": {
      const punto = bersaglio.punto;
      return [
        { etichetta: "Bersaglio", valore: punto ? `Zona (${Math.round(punto.x)}, ${Math.round(punto.y)})` : "—" },
        { etichetta: "Effetto", valore: `Rivela i corpi entro ${CARD_EFFECTS.esplora.raggioRivelazione} unita'` },
        { etichetta: "Costo", valore: "Nessuno" },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "OPS-02": {
      const pianeta = stato.pianeti.find((p) => p.id === bersaglio.planetId);
      return [
        { etichetta: "Bersaglio", valore: pianeta?.nome ?? "—" },
        { etichetta: "Effetto", valore: "Rivela la risorsa dominante del pianeta" },
        { etichetta: "Durata", valore: `${CARD_EFFECTS.investiga.durataMinSec}-${CARD_EFFECTS.investiga.durataMaxSec} secondi` },
        { etichetta: "Costo", valore: "Nessuno" },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "IND-01": {
      const pianeta = stato.pianeti.find((p) => p.id === bersaglio.planetId);
      return [
        { etichetta: "Bersaglio", valore: pianeta?.nome ?? "—" },
        { etichetta: "Effetto", valore: "Avvia estrazione mineraria continua (nave mineraria dedicata)" },
        { etichetta: "Costo iniziale", valore: `${CARD_EFFECTS.contrattoMinerario.costoIniziale} Cr` },
        { etichetta: "Costo operativo", valore: `${CARD_EFFECTS.contrattoMinerario.costoOperativoAlMinuto} Cr/min` },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "OPS-03": {
      const relitto = stato.campiRelitti.find((r) => r.id === bersaglio.relittoId);
      return [
        { etichetta: "Bersaglio", valore: relitto ? relitto.tipo : "—" },
        { etichetta: "Effetto", valore: "Recupera materiale/crediti dal relitto" },
        { etichetta: "Costo", valore: "Nessuno" },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "IND-02": {
      return [
        { etichetta: "Bersaglio", valore: "Nave madre" },
        { etichetta: "Effetto", valore: "Costruisce la prima fabbrica (una linea di raffinazione)" },
        { etichetta: "Costo", valore: `${FABBRICA_COSTO.crediti} Cr + ${FABBRICA_COSTO.ferro} ferro grezzo (in stiva)` },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "LOG-01": {
      const disponibile = stato.mothership.stivaCarico.carburante ?? 0;
      const spazio = stato.mothership.serbatoioCapacita - stato.mothership.carburante;
      return [
        { etichetta: "Bersaglio", valore: "Nave madre" },
        { etichetta: "Effetto", valore: "Trasferisce carburante dalla stiva al serbatoio" },
        { etichetta: "Quantita'", valore: `${Math.min(disponibile, spazio)} (di ${disponibile} disponibili in stiva)` },
        { etichetta: "Costo", valore: "Nessuno" },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "IPS-01": {
      const anteprima = generaAnteprimaRegione(stato);
      const missioniAbbandonate = stato.missioni.filter((m) => m.stato === "attiva" || m.stato === "disponibile").length;
      const contrattiInterrotti = stato.contrattiMinerari.filter((c) => c.attivo).length;
      return [
        { etichetta: "Nuova regione", valore: `#${anteprima.numeroRegione} - ${anteprima.numeroPianeti} corpi rilevati` },
        { etichetta: "Ricchezza stimata", valore: anteprima.ricchezzaStimata },
        { etichetta: "Campi relitti rilevati", valore: String(anteprima.numeroCampiRelitti) },
        { etichetta: "Costo", valore: `${HYPERSPACE.costoCarburante} carburante + 1 comando Iperspazio` },
        {
          etichetta: "Attenzione",
          valore: `${missioniAbbandonate} missioni e ${contrattiInterrotti} contratti minerari attivi andranno persi/interrotti; il materiale gia' caricato sulle navette verra' trasferito, quello ancora sul pianeta sara' abbandonato`,
        },
        { etichetta: "Reversibile", valore: "No, nessun ritorno alla regione attuale" },
      ];
    }
    case "RSH-01": {
      return [
        { etichetta: "Bersaglio", valore: "Nessuno" },
        { etichetta: "Effetto", valore: `+1 punto ricerca (totale attuale: ${stato.ricerca.puntiRicerca})` },
        { etichetta: "Costo", valore: "Nessuno" },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    case "RAR-02": {
      const pericoliAttivi = stato.pericoli.filter((p) => p.scoperto).length;
      return [
        { etichetta: "Bersaglio", valore: "Nave madre" },
        { etichetta: "Effetto", valore: "Immunita' temporanea a tutti i pericoli regionali" },
        { etichetta: "Durata", valore: `${Math.round(CARD_EFFECTS.fugaDEmergenza.durataImmunitaMs / 60000)} minuti` },
        { etichetta: "Pericoli scoperti nella regione", valore: String(pericoliAttivi) },
        { etichetta: "Costo", valore: "Nessuno" },
        { etichetta: "Reversibile", valore: "No" },
      ];
    }
    default:
      return [{ etichetta: "Effetto", valore: def.descrizione }];
  }
}
