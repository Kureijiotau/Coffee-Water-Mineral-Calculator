import { expect, test } from '@playwright/test';

type WorkerProbe = Window & {
  __watermancerWorkerDelivered?: number;
  __watermancerWorkerRequests?: number;
};

test('keeps automatic ion readings tied to the latest rapid water-volume edit', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;

    class DelayedWorker {
      private readonly worker: Worker;
      private messageHandler: ((event: MessageEvent) => void) | null = null;
      private errorHandler: ((event: ErrorEvent) => void) | null = null;

      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        this.worker = new NativeWorker(scriptURL, options);
        this.worker.onmessage = event => {
          const probe = window as WorkerProbe;
          const requestId = event.data?.requestId;
          if (requestId === 1) {
            window.setTimeout(() => {
              probe.__watermancerWorkerDelivered = (probe.__watermancerWorkerDelivered ?? 0) + 1;
              this.messageHandler?.(event);
            }, 1_000);
            return;
          }
          probe.__watermancerWorkerDelivered = (probe.__watermancerWorkerDelivered ?? 0) + 1;
          this.messageHandler?.(event);
        };
        this.worker.onerror = event => this.errorHandler?.(event);
      }

      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        this.messageHandler = handler;
      }

      get onmessage(): ((event: MessageEvent) => void) | null {
        return this.messageHandler;
      }

      set onerror(handler: ((event: ErrorEvent) => void) | null) {
        this.errorHandler = handler;
      }

      get onerror(): ((event: ErrorEvent) => void) | null {
        return this.errorHandler;
      }

      postMessage(message: unknown, transfer?: Transferable[]): void {
        const probe = window as WorkerProbe;
        if (typeof message === 'object' && message !== null && 'requestId' in message) {
          probe.__watermancerWorkerRequests = (probe.__watermancerWorkerRequests ?? 0) + 1;
        }
        this.worker.postMessage(message, transfer ?? []);
      }

      terminate(): void {
        this.worker.terminate();
      }
    }

    window.Worker = DelayedWorker as unknown as typeof Worker;
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Show waters' }).click();
  await page.getByRole('button', { name: 'Add water source' }).click();

  const waterName = page.getByPlaceholder('Water name (e.g. Solán de Cabras)');
  const waterEntry = waterName.locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " space-y-3 ")][1]',
  );
  const waterVolume = waterEntry.locator('input[placeholder="0"]').first();
  const calciumInput = waterEntry.locator('label[title="Calcium"] + input');
  await waterName.fill('Rapid edit water');
  await waterVolume.fill('1000');
  await calciumInput.fill('100');

  await page.getByRole('button', { name: 'Watermancer' }).click();
  await expect(page.getByText('Precision Auto-match')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    (window as WorkerProbe).__watermancerWorkerRequests ?? 0
  ))).toBeGreaterThanOrEqual(1);

  await waterVolume.fill('250');
  await waterVolume.fill('500');
  await expect(waterVolume).toHaveValue('500');

  await expect.poll(() => page.evaluate(() => (
    (window as WorkerProbe).__watermancerWorkerDelivered ?? 0
  ))).toBeGreaterThanOrEqual(1);

  const calciumRow = page.locator('[data-watermancer-ion-row="calcium"]');
  await expect(calciumRow.locator(':scope > span').last()).toHaveText(/^50\s*\//);
});