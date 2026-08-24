import type { WatermancerRouteInputs } from './App';
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

export type WatermancerWorkerClient = {
  solve: (inputs: WatermancerRouteInputs) => Promise<WatermancerWorkerSolveResult>;
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
  const pending = new Map<
    number,
    {
      resolve: (value: WatermancerWorkerSolveResult) => void;
      reject: (error: Error) => void;
    }
  >();

  const rejectAll = (error: Error): void => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
    onWorkerError?.(error);
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

    // A worker can finish an older request after a newer request was sent.
    // Resolve it for instrumentation, but callers must only commit the latest.
    request.resolve({
      requestId: response.requestId,
      elapsedMs: response.elapsedMs,
      result: response.result,
    });
  };

  worker.onerror = event => {
    rejectAll(new Error(event.message || 'Watermancer worker failed.'));
  };

  return {
    solve: inputs => {
      const supersededError = new Error('Watermancer solve superseded.');
      for (const [pendingRequestId, request] of pending) {
        pending.delete(pendingRequestId);
        request.reject(supersededError);
      }
      const requestId = ++nextRequestId;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        const message: WatermancerWorkerRequest = { requestId, inputs };
        worker.postMessage(message);
      });
    },
    dispose: () => {
      worker.terminate();
      rejectAll(new Error('Watermancer worker disposed.'));
    },
  };
}

export function isLatestWatermancerWorkerRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}