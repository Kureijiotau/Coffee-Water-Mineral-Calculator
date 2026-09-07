import type {
  WatermancerBestMatchCandidate,
  WatermancerRouteInputs,
} from './watermancerSolver';
import type { WatermancerSolverResult } from './watermancerPlan';
import type {
  WatermancerWorkerRequest,
  WatermancerWorkerResponse,
} from './watermancerWorker';

export type WatermancerWorkerSolveResult = {
  requestId: number;
  elapsedMs: number;
  result: WatermancerSolverResult;
};

export type WatermancerWorkerBestMatchResult = {
  requestId: number;
  elapsedMs: number;
  winner: WatermancerBestMatchCandidate | null;
};

export type WatermancerWorkerClient = {
  solve: (inputs: WatermancerRouteInputs) => Promise<WatermancerWorkerSolveResult>;
  findBestMatch: (inputs: WatermancerRouteInputs) => Promise<WatermancerWorkerBestMatchResult>;
  dispose: () => void;
};

export function createWatermancerWorkerClient(
  onWorkerError?: (error: Error) => void,
): WatermancerWorkerClient {
  const worker = new Worker(
    new URL('./watermancerWorker.ts', import.meta.url),
    { type: 'module' },
  );
  let nextRequestId = 0;
  type PendingRequest =
    | {
        operation: 'solve';
        resolve: (value: WatermancerWorkerSolveResult) => void;
        reject: (error: Error) => void;
      }
    | {
        operation: 'best-match';
        resolve: (value: WatermancerWorkerBestMatchResult) => void;
        reject: (error: Error) => void;
      };
  const pending = new Map<number, PendingRequest>();

  const rejectAll = (error: Error, notify = true): void => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
    if (notify) onWorkerError?.(error);
  };

  worker.onmessage = (event: MessageEvent<WatermancerWorkerResponse>) => {
    const response = event.data;
    const request = pending.get(response.requestId);
    if (!request) return;
    pending.delete(response.requestId);

    if (!response.ok) {
      request.reject(new Error(response.error));
      return;
    }

    if (request.operation !== response.operation) {
      request.reject(new Error('Watermancer worker returned the wrong operation.'));
      return;
    }
    if (request.operation === 'best-match' && response.operation === 'best-match') {
      request.resolve({
        requestId: response.requestId,
        elapsedMs: response.elapsedMs,
        winner: response.winner,
      });
      return;
    }
    if (request.operation === 'solve' && response.operation === 'solve') {
      // A worker can finish an older request after a newer request was sent.
      // Resolve it for instrumentation, but callers must only commit the latest.
      request.resolve({
        requestId: response.requestId,
        elapsedMs: response.elapsedMs,
        result: response.result,
      });
    }
  };

  worker.onerror = event => {
    worker.terminate();
    rejectAll(new Error(event.message || 'Watermancer worker failed.'));
  };

  const supersedePending = (): void => {
    const supersededError = new Error('Watermancer solve superseded.');
    for (const [pendingRequestId, request] of pending) {
      pending.delete(pendingRequestId);
      request.reject(supersededError);
    }
  };

  return {
    solve: inputs => {
      supersedePending();
      const requestId = ++nextRequestId;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { operation: 'solve', resolve, reject });
        const message: WatermancerWorkerRequest = { requestId, operation: 'solve', inputs };
        try {
          worker.postMessage(message);
        } catch (error) {
          pending.delete(requestId);
          const workerError = error instanceof Error
            ? error
            : new Error(String(error));
          onWorkerError?.(workerError);
          reject(workerError);
        }
      });
    },
    findBestMatch: inputs => {
      supersedePending();
      const requestId = ++nextRequestId;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { operation: 'best-match', resolve, reject });
        const message: WatermancerWorkerRequest = { requestId, operation: 'best-match', inputs };
        try {
          worker.postMessage(message);
        } catch (error) {
          pending.delete(requestId);
          const workerError = error instanceof Error
            ? error
            : new Error(String(error));
          onWorkerError?.(workerError);
          reject(workerError);
        }
      });
    },
    dispose: () => {
      worker.terminate();
      rejectAll(new Error('Watermancer worker disposed.'), false);
    },
  };
}

export function isLatestWatermancerWorkerRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}