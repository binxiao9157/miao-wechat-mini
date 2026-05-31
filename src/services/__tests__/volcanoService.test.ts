import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/httpAdapter', () => ({
  get: vi.fn(async () => {
    throw new Error('network down');
  }),
  request: vi.fn(async () => ({ data: { id: 'task-json' } })),
}));

vi.mock('../../utils/uploadAdapter', () => ({
  uploadFile: vi.fn(async () => ({ id: 'task-file' })),
}));

describe('VolcanoService polling lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('submits first and last frame metadata for four-stage JSON video tasks', async () => {
    const { VolcanoService, ACTION_PROMPTS } = await import('../volcanoService');
    const { request } = await import('../../utils/httpAdapter');

    const result = await VolcanoService.submitTask('https://cdn.example.com/first.png', {
      prompt: ACTION_PROMPTS.v2_wait.prompt,
      duration: ACTION_PROMPTS.v2_wait.duration,
      firstFrame: 'https://cdn.example.com/first.png',
      lastFrame: 'https://cdn.example.com/last.png',
      hasLastFrame: true,
    });

    expect(result.id).toBe('task-json');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/ai/tasks',
      method: 'POST',
      data: expect.objectContaining({
        image_base64: 'https://cdn.example.com/first.png',
        first_frame: 'https://cdn.example.com/first.png',
        last_frame: 'https://cdn.example.com/last.png',
        has_last_frame: true,
        prompt: ACTION_PROMPTS.v2_wait.prompt,
        parameters: expect.objectContaining({
          duration: ACTION_PROMPTS.v2_wait.duration,
        }),
      }),
    }));
  });

  it('submits optional last frame metadata through file uploads', async () => {
    const { VolcanoService, ACTION_PROMPTS } = await import('../volcanoService');
    const { uploadFile } = await import('../../utils/uploadAdapter');

    const result = await VolcanoService.submitTask('wxfile://first.png', {
      prompt: ACTION_PROMPTS.v3_return.prompt,
      duration: ACTION_PROMPTS.v3_return.duration,
      lastFrame: 'https://cdn.example.com/last.png',
      hasLastFrame: true,
    });

    expect(result.id).toBe('task-file');
    expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/ai/tasks-file',
      filePath: 'wxfile://first.png',
      formData: expect.objectContaining({
        prompt: ACTION_PROMPTS.v3_return.prompt,
        duration: String(ACTION_PROMPTS.v3_return.duration),
        last_frame: 'https://cdn.example.com/last.png',
        has_last_frame: 'true',
      }),
    }));
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
