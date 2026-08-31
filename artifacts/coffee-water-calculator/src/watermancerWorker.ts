import {
  solveWatermancerRoutes,
  type WatermancerRouteInputs,
} from './watermancerSolver';
import type { WatermancerSolverResult } from './watermancerPlan';

export type WatermancerWorkerRequest = {
  requestId: number;
  inputs: WatermancerRouteInputs;
};

export type WatermancerWorkerResponse =
  | {
      requestId: number;
      ok: true;
      elapsedMs: number;
      result: WatermancerSolverResult;
    }
  | {
      requestId: number;
      ok: false;
      error: string;
    };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WatermancerWorkerRequest>) => void) | null;
  postMessage: (message: WatermancerWorkerResponse) => void;
};

workerScope.onmessage = (event: MessageEvent<WatermancerWorkerRequest>) => {
  const { requestId, inputs } = event.data;
  const startedAt = performance.now();

  try {
    const result = solveWatermancerRoutes(inputs);
    const response: WatermancerWorkerResponse = {
      requestId,
      ok: true,
      elapsedMs: performance.now() - startedAt,
      result,
    };
    workerScope.postMessage(response);
  } catch (error) {
    const response: WatermancerWorkerResponse = {
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    workerScope.postMessage(response);
  }
};