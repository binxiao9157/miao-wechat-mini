import { describe, expect, it, vi } from 'vitest';

describe('app config startup routing', () => {
  it('starts from welcome so cached sessions can bootstrap before login', async () => {
    vi.stubGlobal('defineAppConfig', (config: any) => config);

    const { default: appConfig } = await import('./app.config');

    expect(appConfig.pages?.[0]).toBe('pages/welcome/index');
    expect(appConfig.pages).toContain('pages/login/index');
  });
});
