import {
  createWorld,
  addEntity,
  addComponent,
  query,
  type World,
} from "bitecs";
import type { PatchData } from "./PatchData";
// import type { SimulationSnapshot } from "../shared/SimulationSnapshot";

const Position: {
  x: Float32Array<ArrayBufferLike>;
  y: Float32Array<ArrayBufferLike>;
} = {
  x: new Float32Array(0),
  y: new Float32Array(0),
};

const Velocity: {
  x: Float32Array<ArrayBufferLike>;
  y: Float32Array<ArrayBufferLike>;
} = {
  x: new Float32Array(0),
  y: new Float32Array(0),
};

function movementSystem(world: World, width: number, height: number): void {
  const agents = query(world, [Position, Velocity]);

  for (let i = 0; i < agents.length; i++) {
    const entity = agents[i];

    Position.x[entity] += Velocity.x[entity];
    Position.y[entity] += Velocity.y[entity];

    if (Position.x[entity] <= 0 || Position.x[entity] >= width) {
      Velocity.x[entity] *= -1;
    }

    if (Position.y[entity] <= 0 || Position.y[entity] >= height) {
      Velocity.y[entity] *= -1;
    }

    Position.x[entity] = Math.max(0, Math.min(width, Position.x[entity]));
    Position.y[entity] = Math.max(0, Math.min(height, Position.y[entity]));
  }
}

function patchSystem(world: World, patches: PatchData): void {
  for (let i = 0; i < patches.values.length; i++) {
    patches.values[i] *= 0.94;
  }

  const agents = query(world, [Position]);

  for (let i = 0; i < agents.length; i++) {
    const entity = agents[i];

    const patchX = Math.floor(Position.x[entity] / patches.cellSize);
    const patchY = Math.floor(Position.y[entity] / patches.cellSize);

    if (
      patchX < 0 ||
      patchX >= patches.width ||
      patchY < 0 ||
      patchY >= patches.height
    ) {
      continue;
    }

    const patchIndex = patchY * patches.width + patchX;
    patches.values[patchIndex] = Math.min(1, patches.values[patchIndex] + 0.08);
  }
}

export class SimulationEngine {
  private world: World;
  private patches: PatchData;

  private width: number;
  private height: number;

  private positionBuffer: SharedArrayBuffer;
  private velocityBuffer: SharedArrayBuffer;

  private patchBuffer: SharedArrayBuffer;

  constructor(count: number, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.world = createWorld();

    this.positionBuffer = new SharedArrayBuffer(
      count * 2 * Float32Array.BYTES_PER_ELEMENT
    );

    this.velocityBuffer = new SharedArrayBuffer(
      count * 2 * Float32Array.BYTES_PER_ELEMENT
    );

    const sharedPositions = new Float32Array(this.positionBuffer);
    const sharedVelocities = new Float32Array(this.velocityBuffer);

    Position.x = sharedPositions.subarray(0, count);
    Position.y = sharedPositions.subarray(count, count * 2);

    Velocity.x = sharedVelocities.subarray(0, count);
    Velocity.y = sharedVelocities.subarray(count, count * 2);

    const cellSize = 4;
    const patchWidth = Math.floor(width / cellSize);
    const patchHeight = Math.floor(height / cellSize);

    this.patchBuffer = new SharedArrayBuffer(
      patchWidth * patchHeight * Float32Array.BYTES_PER_ELEMENT
    );

    this.patches = {
      width: patchWidth,
      height: patchHeight,
      cellSize,
      values: new Float32Array(this.patchBuffer),
    };

    this.initializeAgents(count);
  }

  private initializeAgents(count: number): void {
    for (let i = 0; i < count; i++) {
      const entity = addEntity(this.world);

      addComponent(this.world, entity, Position);
      addComponent(this.world, entity, Velocity);

      Position.x[entity] = Math.random() * this.width;
      Position.y[entity] = Math.random() * this.height;

      Velocity.x[entity] = (Math.random() - 0.5) * 2;
      Velocity.y[entity] = (Math.random() - 0.5) * 2;
    }
  }

  update(): void {
    movementSystem(this.world, this.width, this.height);
    patchSystem(this.world, this.patches);
  }

  getSharedBuffers() {
    return {
      agentCount: query(this.world, [Position]).length,
      positionBuffer: this.positionBuffer,
      patchBuffer: this.patchBuffer,

      patchWidth: this.patches.width,
      patchHeight: this.patches.height,
      patchCellSize: this.patches.cellSize,
    };
  }
}