import { beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';
import { uploadFile } from '../uploadAdapter';
import { getItem, setItem } from '../storageAdapter';

describe('uploadAdapter', () => {
  beforeEach(() => {
    vi.mocked(Taro.uploadFile).mockReset();
  });

  it("clears cached auth and emits unauthorized after 401 response with { code: 'UNAUTHORIZED' }", async () => {
    setItem('miao_auth_token', 'abc123');
    setItem('miao_current_user', JSON.stringify({ id: 'user-1' }));
    vi.mocked(Taro.uploadFile).mockImplementation((options: any) => {
      options.success({
        statusCode: 401,
        data: JSON.stringify({ code: 'UNAUTHORIZED', message: 'unauthorized' }),
      });
      return {} as any;
    });

    await expect(uploadFile({ url: '/api/v1/upload', filePath: 'wxfile://tmp/a.png' }))
      .rejects.toThrow('登录已过期，请重新登录');

    expect(getItem('miao_auth_token')).toBeNull();
    expect(getItem('miao_current_user')).toBeNull();
    expect(Taro.eventCenter.trigger).toHaveBeenCalledWith('auth:unauthorized');
  });

  it('clears cached auth and emits unauthorized after any 401 upload response', async () => {
    setItem('miao_auth_token', 'abc123');
    setItem('miao_current_user', JSON.stringify({ id: 'user-1' }));
    vi.mocked(Taro.uploadFile).mockImplementation((options: any) => {
      options.success({
        statusCode: 401,
        data: JSON.stringify({ message: 'session expired' }),
      });
      return {} as any;
    });

    await expect(uploadFile({ url: '/api/v1/upload', filePath: 'wxfile://tmp/a.png' }))
      .rejects.toThrow('登录已过期，请重新登录');

    expect(getItem('miao_auth_token')).toBeNull();
    expect(getItem('miao_current_user')).toBeNull();
    expect(Taro.eventCenter.trigger).toHaveBeenCalledWith('auth:unauthorized');
  });

  it('preserves upload HTTP status for callers that need endpoint-specific fallback logic', async () => {
    setItem('miao_auth_token', 'abc123');
    vi.mocked(Taro.uploadFile).mockImplementation((options: any) => {
      options.success({
        statusCode: 400,
        data: JSON.stringify({ code: 'MISSING_MEDIA', message: 'No file uploaded' }),
      });
      return {} as any;
    });

    try {
      await uploadFile({ url: '/api/v1/security/media-file', filePath: 'wxfile://tmp/a.png', retries: 0 });
      throw new Error('expected upload failure');
    } catch (error: any) {
      expect(error.message).toBe('No file uploaded');
      expect(error.statusCode).toBe(400);
      expect(error.response?.data?.code).toBe('MISSING_MEDIA');
    }
  });
});
