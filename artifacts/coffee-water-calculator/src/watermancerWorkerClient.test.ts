import { beforeEach, describe, expect, it } from 'vitest';
import type { WatermancerRouteInputs } from './watermancerSolver';
import type { WatermancerWorkerRequest, WatermancerWorkerResponse } from './watermancerWorker';
import { createWatermancerWorkerClient } from './watermancerWorkerClient';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<WatermancerWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: WatermancerWorkerRequest[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: WatermancerWorkerRequest): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }
}

Object.defineProperty(globalThis, 'Worker', {
  value: FakeWorker,
  configurable: true,
  writable: true,
});

const inputs = {} as WatermancerRouteInputs;

describe('watermancer worker client', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
  });

  it('routes best-match sweeps through the worker protocol', async () => {
    const client = createWatermancerWorkerClient();
    const worker = FakeWorker.instances[0];
    const pending = client.findBestMatch(inputs);
    const request = worker.messages[0];

    expect(request.operation).toBe('best-match');
    worker.onmessage?.({
      data: {
        requestId: request.requestId,
        operation: 'best-match',
        ok: true,
        elapsedMs: 12,
        winner: null,
      },
    } as MessageEvent<WatermancerWorkerResponse>);

    await expect(pending).resolves.toEqual({
      requestId: request.requestId,
      elapsedMs: 12,
      winner: null,
    });
  });

  it('terminates a failed worker and rejects pending work', async () => {
    const errors: Error[] = [];
    const client = createWatermancerWorkerClient(error => errors.push(error));
    const worker = FakeWorker.instances[0];
    const pending = client.solve(inputs);

    worker.onerror?.({ message: 'worker crashed' } as ErrorEvent);

    await expect(pending).rejects.toThrow('worker crashed');
    expect(worker.terminated).toBe(true);
    expect(errors).toHaveLength(1);
  });
});