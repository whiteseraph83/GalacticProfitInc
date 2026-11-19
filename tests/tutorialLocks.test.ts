import { describe, expect, it } from "vitest";
import { creaStatoIniziale } from "../src/domain/initialState";
import { trovaPassoTutorialAttivo } from "../src/domain/tutorialLocks";
import type { GameState } from "../src/domain/types";

// Richiesta utente: "dopo che B.O.B. ha detto di usare il radar si deve
// bloccare e permettermi di farlo... illuminare la carta Radar e rendermi
// impossibile usare le altre", stessa cosa per Investiga e Contratto
// minerario.

function sceneVisteDa(...ids: string[]): (id: string) => boolean {
  const set = new Set(ids);
  return (id: string) => set.has(id);
}

describe("trovaPassoTutorialAttivo", () => {
  it("nessun blocco se nessuna scena guida e' ancora comparsa", () => {
    const stato = creaStatoIniziale("tutorial-lock-nessuno");
    expect(trovaPassoTutorialAttivo(stato, sceneVisteDa("C1_S01"))).toBeNull();
  });

  it("blocca su Radar (OPS-01) appena C1_S02 e' comparsa, finche' nessun pianeta e' sempreVisibile", () => {
    const stato = creaStatoIniziale("tutorial-lock-radar");
    const passo = trovaPassoTutorialAttivo(stato, sceneVisteDa("C1_S01", "C1_S02"));
    expect(passo?.cardCode).toBe("OPS-01");

    const statoConRadar: GameState = { ...stato, pianeti: stato.pianeti.map((p, i) => (i === 0 ? { ...p, sempreVisibile: true } : p)) };
    expect(trovaPassoTutorialAttivo(statoConRadar, sceneVisteDa("C1_S01", "C1_S02"))).toBeNull();
  });

  it("blocca su Investiga (OPS-02) appena C1_S02I e' comparsa, finche' l'investigazione non e' avviata", () => {
    const base = creaStatoIniziale("tutorial-lock-investiga");
    // Radar gia' usato (passo precedente completato), altrimenti resterebbe
    // quello il blocco attivo.
    const stato: GameState = { ...base, pianeti: base.pianeti.map((p, i) => (i === 0 ? { ...p, sempreVisibile: true } : p)) };
    const sceneVista = sceneVisteDa("C1_S01", "C1_S02", "C1_S02I");
    const passo = trovaPassoTutorialAttivo(stato, sceneVista);
    expect(passo?.cardCode).toBe("OPS-02");

    const statoInvestigazioneAvviata: GameState = {
      ...stato,
      pianeti: stato.pianeti.map((p, i) => (i === 0 ? { ...p, investigazioneCompletataAlMs: 1000 } : p)),
    };
    expect(trovaPassoTutorialAttivo(statoInvestigazioneAvviata, sceneVista)).toBeNull();
  });

  it("blocca su Contratto minerario (IND-01) appena C1_S03I e' comparsa, finche' nessun contratto e' attivo", () => {
    const base = creaStatoIniziale("tutorial-lock-contratto");
    const stato: GameState = {
      ...base,
      pianeti: base.pianeti.map((p, i) => (i === 0 ? { ...p, sempreVisibile: true, investigato: true } : p)),
    };
    const sceneVista = sceneVisteDa("C1_S01", "C1_S02", "C1_S02I", "C1_S03", "C1_S03I");
    const passo = trovaPassoTutorialAttivo(stato, sceneVista);
    expect(passo?.cardCode).toBe("IND-01");

    const statoConContratto: GameState = {
      ...stato,
      contrattiMinerari: [
        {
          id: "c-1",
          pianetaId: stato.pianeti[0].id,
          naveMinerariaId: stato.naviMinerarie[0].id,
          risorsa: "ferro",
          giacimentoResiduo: 100,
          estrazioneAlMinuto: 4,
          depositoAccumulato: 0,
          priorita: 1,
          ultimaAssegnazioneMs: 0,
          attivo: true,
        },
      ],
    };
    expect(trovaPassoTutorialAttivo(statoConContratto, sceneVista)).toBeNull();
  });

  it("i passi successivi non si attivano finche' quello precedente non e' stato completato", () => {
    const stato = creaStatoIniziale("tutorial-lock-ordine");
    // Tutte e tre le scene guida gia' comparse, ma Radar non e' ancora stato usato.
    const sceneVista = sceneVisteDa("C1_S01", "C1_S02", "C1_S02I", "C1_S03", "C1_S03I");
    const passo = trovaPassoTutorialAttivo(stato, sceneVista);
    expect(passo?.cardCode).toBe("OPS-01");
  });
});
