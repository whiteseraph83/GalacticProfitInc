import { createContext } from "react";
import type { SimulationEngine } from "../simulation/engine";

export const EngineContext = createContext<SimulationEngine | null>(null);
