export type MainToWorkerMessage =
  | {
      type: "init";
      count: number;
      width: number;
      height: number;
    }
  | {
      type: "start";
    }
  | {
      type: "stop";
    }
  | {
      type: "reset";
    };

export type WorkerToMainMessage =
  | {
      type: "sharedBuffers";
      agentCount: number;
      positionBuffer: SharedArrayBuffer;
      patchBuffer: SharedArrayBuffer;

      patchWidth: number;
      patchHeight: number;
      patchCellSize: number;
    }
  | {
      type: "frame";
    };