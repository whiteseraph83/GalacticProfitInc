import type { Vector2 } from "../domain/types";

export interface Ostacolo {
  posizione: Vector2;
  raggio: number;
}

function distanzaPuntoSegmento(p: Vector2, a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lunghezzaQuadra = dx * dx + dy * dy;
  if (lunghezzaQuadra === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lunghezzaQuadra;
  t = Math.max(0, Math.min(1, t));
  const proiezioneX = a.x + t * dx;
  const proiezioneY = a.y + t * dy;
  return Math.hypot(p.x - proiezioneX, p.y - proiezioneY);
}

function calcolaWaypointBypass(a: Vector2, b: Vector2, ostacolo: Ostacolo): Vector2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lunghezza = Math.hypot(dx, dy) || 1;
  const ux = dx / lunghezza;
  const uy = dy / lunghezza;
  // Perpendicolare al segmento.
  const px = -uy;
  const py = ux;

  // Proiezione del centro dell'ostacolo sul segmento (clampata).
  let t = ((ostacolo.posizione.x - a.x) * ux + (ostacolo.posizione.y - a.y) * uy) / lunghezza;
  t = Math.max(0.15, Math.min(0.85, t));
  const footX = a.x + ux * lunghezza * t;
  const footY = a.y + uy * lunghezza * t;

  // Il bypass va dal lato opposto a dove si trova il centro dell'ostacolo
  // rispetto al segmento, cosi' la deviazione e' minima.
  const cross = dx * (ostacolo.posizione.y - a.y) - dy * (ostacolo.posizione.x - a.x);
  const segno = cross >= 0 ? -1 : 1;
  const margineSicurezza = ostacolo.raggio * 1.25;

  return { x: footX + px * margineSicurezza * segno, y: footY + py * margineSicurezza * segno };
}

function segmentoLibero(a: Vector2, b: Vector2, ostacoli: Ostacolo[], margine: number): boolean {
  return ostacoli.every((o) => distanzaPuntoSegmento(o.posizione, a, b) >= o.raggio + margine);
}

/**
 * Elimina i waypoint intermedi non piu' necessari ("string pulling"): se si
 * puo' saltare direttamente da un punto a un altro piu' avanti nel percorso
 * senza attraversare nessun ostacolo, i punti in mezzo si rimuovono. Senza
 * questo passaggio, su campi di ostacoli affollati lungo la rotta diretta
 * (piu' pianeti scoperti vicini tra loro) il percorso risultava spezzato in
 * molti brevi segmenti consecutivi — visivamente "a zig-zag" anche quando
 * ogni singolo bypass era corretto, perche' i bypass non si ricombinavano
 * mai tra loro.
 */
function semplificaPercorso(percorso: Vector2[], ostacoli: Ostacolo[], margine: number): Vector2[] {
  const risultato = [...percorso];
  let cambiato = true;
  while (cambiato) {
    cambiato = false;
    for (let i = 0; i < risultato.length - 2; i++) {
      if (!segmentoLibero(risultato[i], risultato[i + 2], ostacoli, margine)) continue;
      risultato.splice(i + 1, 1);
      cambiato = true;
      break;
    }
  }
  return risultato;
}

/**
 * Calcola un percorso spezzato che aggira gli ostacoli noti (pianeti
 * scoperti) tra partenza e destinazione. Ritorna solo i waypoint da
 * raggiungere (la partenza non e' inclusa). Semplice ma deterministico:
 * non garantisce l'ottimo globale su campi di ostacoli densi, ma evita le
 * collisioni visibili piu' comuni entro un numero limitato di iterazioni,
 * poi semplifica il risultato (vedi `semplificaPercorso`).
 */
export function calcolaPercorso(partenza: Vector2, destinazione: Vector2, ostacoli: Ostacolo[], margine: number): Vector2[] {
  let percorso: Vector2[] = [partenza, destinazione];
  const MAX_ITERAZIONI = 10;

  for (let iterazione = 0; iterazione < MAX_ITERAZIONI; iterazione++) {
    let modificato = false;

    for (let i = 0; i < percorso.length - 1; i++) {
      const a = percorso[i];
      const b = percorso[i + 1];

      for (const ostacolo of ostacoli) {
        const raggioEffettivo = ostacolo.raggio + margine;
        if (distanzaPuntoSegmento(ostacolo.posizione, a, b) >= raggioEffettivo) continue;

        const waypoint = calcolaWaypointBypass(a, b, { posizione: ostacolo.posizione, raggio: raggioEffettivo });
        percorso = [...percorso.slice(0, i + 1), waypoint, ...percorso.slice(i + 1)];
        modificato = true;
        break;
      }
      if (modificato) break;
    }

    if (!modificato) break;
  }

  percorso = semplificaPercorso(percorso, ostacoli, margine);
  return percorso.slice(1);
}
