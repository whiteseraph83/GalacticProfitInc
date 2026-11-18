import { useGameState } from "../useEngine";

/** Registro notifiche (sola lettura): il feedback sonoro per le nuove
 * notifiche resta un effetto collaterale montato sempre in `AppShell`, non
 * qui, perche' deve suonare anche quando questo pannello non e' aperto
 * (vedi AppShell.tsx). */
export function NotificationLogPanel() {
  const state = useGameState();

  return (
    <section aria-label="Registro notifiche">
      <h2>Registro notifiche</h2>
      <ul className="notification-log">
        {state.notifiche
          .slice()
          .reverse()
          .map((n) => (
            <li key={n.id} className={`notification-log__item notification-log__item--${n.livello}`}>
              <span className="notification-log__time">{Math.floor(n.timestampSimMs / 1000)}s</span>
              <span>{n.testo}</span>
            </li>
          ))}
        {state.notifiche.length === 0 && <li className="notification-log__empty">Nessun evento ancora.</li>}
      </ul>
    </section>
  );
}
