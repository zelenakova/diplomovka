export type SimulationSnapshot = {
  agentCount: number;
  x: Float32Array<ArrayBufferLike>;
  y: Float32Array<ArrayBufferLike>;

  patchWidth: number;
  patchHeight: number;
  patchCellSize: number;
  patchValues: Float32Array<ArrayBufferLike>;
  patchColors: Uint32Array;
};