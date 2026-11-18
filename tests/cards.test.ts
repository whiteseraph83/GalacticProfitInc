import { describe, expect, it } from "vitest";
import { CARD_DEFINITIONS, MANO_INIZIALE } from "../src/domain/cards";

describe("definizioni carte", () => {
  it("la mano iniziale contiene esattamente i 5 codici previsti", () => {
    expect(MANO_INIZIALE).toEqual(["OPS-01", "OPS-02", "IND-01", "IND-02", "RSH-01"]);
  });

  it("OPS-03 (Recupera rottami) esiste ma non e' nella mano iniziale", () => {
    expect(CARD_DEFINITIONS["OPS-03"]).toBeDefined();
    expect(CARD_DEFINITIONS["OPS-03"].inManoIniziale).toBe(false);
  });

  it("ogni carta della mano iniziale e' marcata inManoIniziale", () => {
    for (const code of MANO_INIZIALE) {
      expect(CARD_DEFINITIONS[code].inManoIniziale).toBe(true);
    }
  });
});
