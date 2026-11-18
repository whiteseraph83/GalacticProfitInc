import { EngineProvider } from "./ui/EngineContext";
import { AppShell } from "./ui/AppShell";

const SEED_PARTITA_DEMO = "galactic-profit-demo-seed";

export default function App() {
  return (
    <EngineProvider seed={SEED_PARTITA_DEMO}>
      <AppShell />
    </EngineProvider>
  );
}
