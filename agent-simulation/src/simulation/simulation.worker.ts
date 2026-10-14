import { SimulationEngine } from "./SimulationEngine";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "../shared/SimulationMessages";

let simulation: SimulationEngine | null = null;
let running = false;
let intervalId: number | null = null;

let simulationWidth = 0;
let simulationHeight = 0;
let simulationCount = 0;

function sendSharedBuffers(): void {
  if (!simulation) return;

  const buffers = simulation.getSharedBuffers();

  const message: WorkerToMainMessage = {
    type: "sharedBuffers",
    ...buffers,
  };

  self.postMessage(message);
}

function step(): void {
  if (!simulation || !running) return;

  simulation.update();

  const message: WorkerToMainMessage = {
    type: "frame",
  };

  self.postMessage(message);
}

function startLoop(): void {
  if (intervalId !== null) return;

  intervalId = self.setInterval(() => {
    step();
  }, 16);
}

self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  const message = event.data;

  if (message.type === "init") {
    simulationWidth = message.width;
    simulationHeight = message.height;
    simulationCount = message.count;

    simulation = new SimulationEngine(
      simulationCount,
      simulationWidth,
      simulationHeight
    );

    sendSharedBuffers();
    startLoop();
  }

  if (message.type === "start") {
    running = true;
  }

  if (message.type === "stop") {
    running = false;
  }

  if (message.type === "reset") {
    simulation = new SimulationEngine(
      simulationCount,
      simulationWidth,
      simulationHeight
    );

    sendSharedBuffers();
  }
};