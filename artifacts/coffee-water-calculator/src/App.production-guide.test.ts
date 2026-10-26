import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Watermancer Guide production visibility', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('renders the Guide tab when the app is built for production', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    vi.stubEnv('PROD', true);

    const { default: App } = await import('./App');
    const markup = renderToStaticMarkup(createElement(App));

    expect(markup).toContain('data-testid="tab-watermancer-guide"');
    expect(markup).toContain('Watermancer Guide');
  }, 15_000);
});
