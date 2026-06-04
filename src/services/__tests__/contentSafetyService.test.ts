import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkMediaContent, checkTextContent } from '../contentSafetyService';
import { post } from '../../utils/httpAdapter';
import { uploadFile } from '../../utils/uploadAdapter';

vi.mock('../../utils/httpAdapter', () => ({
  post: vi.fn(),
}));

vi.mock('../../utils/uploadAdapter', () => ({
  uploadFile: vi.fn(),
}));

describe('contentSafetyService', () => {
  beforeEach(() => {
    vi.mocked(post).mockReset();
    vi.mocked(uploadFile).mockReset();
  });

  it('submits text to the server-side security check endpoint', async () => {
    vi.mocked(post).mockResolvedValue({ data: { passed: true } } as any);

    await checkTextContent('这是一条日记', 'diary');

    expect(post).toHaveBeenCalledWith('/api/v1/security/text', {
      content: '这是一条日记',
      scene: 'diary',
    }, { timeout: 30000 });
  });

  it('rejects unsafe text with a user-facing message', async () => {
    vi.mocked(post).mockResolvedValue({ data: { passed: false, message: '内容不合规' } } as any);

    await expect(checkTextContent('bad', 'comment')).rejects.toThrow('内容不合规');
  });

  it('allows local text publishing when the text safety endpoint is temporarily unavailable', async () => {
    const error: any = new Error('HTTP 404');
    error.response = { status: 404, data: { error: 'not found' } };
    vi.mocked(post).mockRejectedValue(error);

    await expect(checkTextContent('今天很开心', 'diary')).resolves.toBeUndefined();
  });

  it('keeps auth failures blocking instead of silently bypassing safety checks', async () => {
    const error: any = new Error('登录已过期，请重新登录');
    error.response = { status: 401, data: { error: 'unauthorized' } };
    vi.mocked(post).mockRejectedValue(error);

    await expect(checkTextContent('今天很开心', 'diary')).rejects.toThrow('登录已过期');
  });

  it('uploads local media to the server-side media security check endpoint', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ passed: true });

    await checkMediaContent('wxfile://tmp/cat.png', 'image', 'cat_upload');

    expect(uploadFile).toHaveBeenCalledWith({
      url: '/api/v1/security/media-file',
      filePath: 'wxfile://tmp/cat.png',
      name: 'media',
      formData: {
        mediaType: 'image',
        scene: 'cat_upload',
      },
      timeout: 120000,
      retries: 1,
    });
  });

  it('submits remote media urls to the server-side media security endpoint', async () => {
    vi.mocked(post).mockResolvedValue({ data: { passed: true } } as any);

    await checkMediaContent('https://cdn.example.com/cat.mp4', 'video', 'diary');

    expect(post).toHaveBeenCalledWith('/api/v1/security/media', {
      mediaUrl: 'https://cdn.example.com/cat.mp4',
      mediaType: 'video',
      scene: 'diary',
    }, { timeout: 60000 });
  });
});
