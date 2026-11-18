import { FleetPanel } from "./FleetPanel";
import { FabbricaPanel } from "./FabbricaPanel";
import { ResearchDashboardPanel } from "./ResearchDashboardPanel";
import { ModulesPanel } from "./ModulesPanel";

/**
 * Pannello gestionale laterale destro: stato della flotta, moduli,
 * fabbrica e una dashboard Ricerca in sola lettura (tecnologie completate).
 * Avviare nuove ricerche, Mercato carte, Comandi, Audio, Salvataggio e
 * Registro notifiche sono stati spostati in overlay dedicati (bottoniera
 * sulla mappa), su richiesta esplicita, per liberare la barra laterale.
 */
export function ManagementPanel() {
  return (
    <section aria-label="Pannello gestionale">
      <FleetPanel />
      <ModulesPanel />
      <FabbricaPanel />
      <ResearchDashboardPanel />
    </section>
  );
}
