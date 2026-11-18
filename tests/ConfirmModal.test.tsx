import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmModal } from "../src/ui/components/ConfirmModal";

const dettagli = [{ etichetta: "Effetto", valore: "Test" }];

describe("ConfirmModal", () => {
  it("non renderizza nulla quando chiuso", () => {
    const { container } = render(
      <ConfirmModal aperto={false} titolo="Titolo" dettagli={dettagli} onConferma={vi.fn()} onAnnulla={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("Annulla chiude senza chiamare onConferma", () => {
    const onConferma = vi.fn();
    const onAnnulla = vi.fn();
    render(<ConfirmModal aperto titolo="Titolo" dettagli={dettagli} onConferma={onConferma} onAnnulla={onAnnulla} />);

    fireEvent.click(screen.getByText("Annulla"));
    expect(onConferma).not.toHaveBeenCalled();
    expect(onAnnulla).toHaveBeenCalledTimes(1);
  });

  it("Esc chiude senza chiamare onConferma", () => {
    const onConferma = vi.fn();
    const onAnnulla = vi.fn();
    render(<ConfirmModal aperto titolo="Titolo" dettagli={dettagli} onConferma={onConferma} onAnnulla={onAnnulla} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onConferma).not.toHaveBeenCalled();
    expect(onAnnulla).toHaveBeenCalledTimes(1);
  });

  it("il doppio click su Conferma invoca onConferma una sola volta", () => {
    const onConferma = vi.fn();
    render(<ConfirmModal aperto titolo="Titolo" dettagli={dettagli} onConferma={onConferma} onAnnulla={vi.fn()} />);

    const bottone = screen.getByText("Conferma");
    fireEvent.click(bottone);
    fireEvent.click(bottone);
    expect(onConferma).toHaveBeenCalledTimes(1);
  });
});
