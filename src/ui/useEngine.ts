import { useContext, useSyncExternalStore } from "react";
import type { GameState } from "../domain/types";
import { EngineContext } from "./engineContextDef";
import type { SimulationEngine } from "../simulation/engine";

export function useEngine(): SimulationEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error("useEngine deve essere usato dentro <EngineProvider>");
  return engine;
}

export function useGameState(): GameState {
  const engine = useEngine();
  return useSyncExternalStore(
    (onStoreChange) => engine.subscribe(onStoreChange),
    () => engine.getState(),
  );
}
