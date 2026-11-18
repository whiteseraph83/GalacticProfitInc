import { useGameState } from "../useEngine";

export interface NotificationLogPanelProps {
  /** Se presente, mostra solo le ultime N notifiche invece del registro
   * completo (richiesta utente: "le ultime 10 notifiche stiano anche nella
   * sidebar sinistra"). */
  limite?: number;
  /** Se presente insieme a `limite`, mostra un bottone "Vedi tutte" che
   * richiama il pannello completo (overlay dedicato). */
  onVediTutte?: () => void;
}

/** Registro notifiche (sola lettura): il feedback sonoro per le nuove
 * notifiche resta un effetto collaterale montato sempre in `AppShell`, non
 * qui, perche' deve suonare anche quando questo pannello non e' aperto
 * (vedi AppShell.tsx). Usato sia come versione compatta in sidebar (con
 * `limite`/`onVediTutte`) sia come pannello completo nell'overlay. */
export function NotificationLogPanel({ limite, onVediTutte }: NotificationLogPanelProps = {}) {
  const state = useGameState();
  const elenco = state.notifiche.slice().reverse();
  const mostrate = limite !== undefined ? elenco.slice(0, limite) : elenco;

  return (
    <section aria-label="Registro notifiche">
      <h2>Registro notifiche</h2>
      <ul className="notification-log">
        {mostrate.map((n) => (
          <li key={n.id} className={`notification-log__item notification-log__item--${n.livello}`}>
            <span className="notification-log__time">{Math.floor(n.timestampSimMs / 1000)}s</span>
            <span>{n.testo}</span>
          </li>
        ))}
        {elenco.length === 0 && <li className="notification-log__empty">Nessun evento ancora.</li>}
      </ul>
      {onVediTutte && elenco.length > 0 && (
        <button type="button" className="btn btn-small" onClick={onVediTutte}>
          Vedi tutte
        </button>
      )}
    </section>
  );
}
