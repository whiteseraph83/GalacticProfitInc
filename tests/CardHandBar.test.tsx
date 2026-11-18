import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CardHandBar } from "../src/ui/CardHandBar";
import { EngineProvider } from "../src/ui/EngineContext";

async function renderCardHandBar(props: Partial<ComponentProps<typeof CardHandBar>> = {}) {
  const onCliccaCarta = vi.fn();
  const onInizioTrascinamento = vi.fn();
  const onFineTrascinamento = vi.fn();
  render(
    <EngineProvider seed="carte-ui-test">
      <CardHandBar
        cartaArmataId={null}
        onCliccaCarta={onCliccaCarta}
        onInizioTrascinamento={onInizioTrascinamento}
        onFineTrascinamento={onFineTrascinamento}
        {...props}
      />
    </EngineProvider>,
  );
  // Il motore si carica in modo asincrono (resume da IndexedDB, Macrostep 5):
  // attende che la mano carte sia effettivamente montata.
  await screen.findByText("Esplora");
  return { onCliccaCarta, onInizioTrascinamento, onFineTrascinamento };
}

describe("CardHandBar", () => {
  it("mostra le 5 carte della mano iniziale", async () => {
    await renderCardHandBar();
    expect(screen.getByText("Esplora")).toBeInTheDocument();
    expect(screen.getByText("Investiga")).toBeInTheDocument();
    expect(screen.getByText("Contratto minerario")).toBeInTheDocument();
    expect(screen.getByText("Fabbrica")).toBeInTheDocument();
    expect(screen.getByText("Ricerca")).toBeInTheDocument();
  });

  it("il click su una carta attivabile chiama onCliccaCarta", async () => {
    const { onCliccaCarta } = await renderCardHandBar();
    fireEvent.click(screen.getByText("Esplora"));
    expect(onCliccaCarta).toHaveBeenCalledTimes(1);
    expect(onCliccaCarta.mock.calls[0][0].code).toBe("OPS-01");
  });

  it("il click sulla carta Ricerca (attivabile dal Macrostep 7) chiama onCliccaCarta", async () => {
    const { onCliccaCarta } = await renderCardHandBar();
    fireEvent.click(screen.getByText("Ricerca"));
    expect(onCliccaCarta).toHaveBeenCalledTimes(1);
    expect(onCliccaCarta.mock.calls[0][0].code).toBe("RSH-01");
  });

  it("le carte con bersaglio sulla mappa sono draggable, Ricerca (bersaglio progettoRicerca, scelto nel pannello) no", async () => {
    await renderCardHandBar();
    const esplora = screen.getByText("Esplora").closest("button");
    const ricerca = screen.getByText("Ricerca").closest("button");
    expect(esplora).toHaveAttribute("draggable", "true");
    expect(ricerca).toHaveAttribute("draggable", "false");
  });
});
