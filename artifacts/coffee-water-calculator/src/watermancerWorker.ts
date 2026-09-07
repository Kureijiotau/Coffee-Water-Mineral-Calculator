import {
  findBestWatermancerMatch,
  solveWatermancerRoutes,
  type WatermancerBestMatchCandidate,
  type WatermancerRouteInputs,
} from './watermancerSolver';
import type { WatermancerSolverResult } from './watermancerPlan';

export type WatermancerWorkerRequest =
  | {
      requestId: number;
      operation: 'solve';
      inputs: WatermancerRouteInputs;
    }
  | {
      requestId: number;
      operation: 'best-match';
      inputs: WatermancerRouteInputs;
    };

export type WatermancerWorkerResponse =
  | {
      requestId: number;
      operation: 'solve';
      ok: true;
      elapsedMs: number;
      result: WatermancerSolverResult;
    }
  | {
      requestId: number;
      operation: 'best-match';
      ok: true;
      elapsedMs: number;
      winner: WatermancerBestMatchCandidate | null;
    }
  | {
      requestId: number;
      operation: WatermancerWorkerRequest['operation'];
      ok: false;
      error: string;
    };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WatermancerWorkerRequest>) => void) | null;
  postMessage: (message: WatermancerWorkerResponse) => void;
};

workerScope.onmessage = (event: MessageEvent<WatermancerWorkerRequest>) => {
  const { requestId, operation, inputs } = event.data;
  const startedAt = performance.now();

  try {
    const response: WatermancerWorkerResponse = operation === 'best-match'
      ? {
          requestId,
          operation,
          ok: true,
          elapsedMs: performance.now() - startedAt,
          winner: findBestWatermancerMatch(inputs).winner ?? null,
        }
      : {
          requestId,
          operation,
          ok: true,
          elapsedMs: performance.now() - startedAt,
          result: solveWatermancerRoutes(inputs),
        };
    workerScope.postMessage(response);
  } catch (error) {
    const response: WatermancerWorkerResponse = {
      requestId,
      operation,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    workerScope.postMessage(response);
  }
};