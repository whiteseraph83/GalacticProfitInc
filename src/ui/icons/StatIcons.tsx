// Icone minimali per le statistiche in TopBar (richiesta utente): SVG
// inline, nessun asset esterno, colorate con `currentColor` cosi' seguono
// il colore testo/accento impostato dal chiamante via CSS.

export function IconCrediti() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.2c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.8c0 2.4-5 1.4-5 3.8 0 1.1 1.1 1.8 2.5 1.8s2.5-.9 2.5-2" />
    </svg>
  );
}

export function IconCarburante() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3c3 3.2 5 6.6 5 9.5a5 5 0 1 1-10 0C7 9.6 9 6.2 12 3Z" />
      <path d="M12 9.5c1.3 1.4 2 2.6 2 3.8a2 2 0 1 1-4 0c0-1.2.7-2.4 2-3.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconQuota() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="1.8" />
      <path d="M9 3.5V3a1.5 1.5 0 0 1 3 0M9 3.5V3a1.5 1.5 0 0 0 3 0" />
      <path d="M8.5 11.5l2.2 2.2 4.3-4.6M8.5 16.5h7" />
    </svg>
  );
}

export function IconFiducia() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3.5 5 6v6c0 4.4 2.9 7.6 7 8.5 4.1-.9 7-4.1 7-8.5V6l-7-2.5Z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </svg>
  );
}

/** Icona generica "frammento di minerale grezzo", condivisa da tutte le
 * risorse base (richiesta utente: contatori per ferro e gli altri minerali
 * man mano che vengono scoperti) — il colore (via `currentColor`, impostato
 * dal chiamante) distingue a colpo d'occhio una risorsa dall'altra. */
export function IconMinerale() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 2.5 19.5 8l-2 11.5h-11L4.5 8Z" strokeLinejoin="round" />
      <path d="M12 2.5v5M8 19.5l2-6.5-3-3M16 19.5l-2-6.5 3-3M9 13h6" strokeLinejoin="round" />
    </svg>
  );
}
