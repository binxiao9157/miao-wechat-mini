import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/httpAdapter', () => ({
  get: vi.fn(async () => {
    throw new Error('network down');
  }),
  request: vi.fn(),
}));

describe('VolcanoService polling lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects promptly when video polling is aborted during retry wait', async () => {
    const { VolcanoService } = await import('../volcanoService');
    const { get } = await import('../../utils/httpAdapter');
    const controller = new AbortController();

    const polling = VolcanoService.pollTaskResult('task-1', undefined, controller.signal);
    await vi.waitFor(() => {
      expect(get).toHaveBeenCalled();
    });

    controller.abort();
    const result = await Promise.race([
      polling.then(
        () => 'resolved',
        (error: Error) => error.message,
      ),
      new Promise(resolve => setTimeout(() => resolve('pending'), 50)),
    ]);

    expect(result).toBe('任务轮询已中止');
  });

  it('rejects promptly when image polling is aborted during retry wait', async () => {
    const { VolcanoService } = await import('../volcanoService');
    const { get } = await import('../../utils/httpAdapter');
    const controller = new AbortController();

    const polling = VolcanoService.pollImageResult('img-task-1', undefined, controller.signal);
    await vi.waitFor(() => {
      expect(get).toHaveBeenCalled();
    });

    controller.abort();
    const result = await Promise.race([
      polling.then(
        () => 'resolved',
        (error: Error) => error.message,
      ),
      new Promise(resolve => setTimeout(() => resolve('pending'), 50)),
    ]);

    expect(result).toBe('任务中止');
  });
});
