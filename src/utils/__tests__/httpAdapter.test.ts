import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';
import { request } from '../httpAdapter';
import { getItem, setItem } from '../storageAdapter';

describe('httpAdapter in H5 mode', () => {
  const originalApiBaseUrl = process.env.TARO_APP_API_BASE_URL;

  beforeEach(() => {
    delete process.env.TARO_APP_API_BASE_URL;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        json: async () => ({ ok: true }),
      })),
    );
  });

  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.TARO_APP_API_BASE_URL;
    } else {
      process.env.TARO_APP_API_BASE_URL = originalApiBaseUrl;
    }
    vi.unstubAllGlobals();
  });

  it('keeps relative api paths when no H5 base URL is configured', async () => {
    await request({ url: '/api/v1/me' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/me',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('adds Authorization and client headers when miao_auth_token is present', async () => {
    setItem('miao_auth_token', 'abc123');

    await request({ url: '/api/v1/me' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
          'X-Client-Type': 'pwa',
          'X-Client-Version': '1.0.0',
        }),
      }),
    );
  });

  it("clears cached auth after 401 response with { code: 'UNAUTHORIZED' }", async () => {
    setItem('miao_auth_token', 'abc123');
    setItem('miao_current_user', JSON.stringify({ id: 'user-1' }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 401,
        json: async () => ({ code: 'UNAUTHORIZED', message: 'unauthorized' }),
      })),
    );

    await expect(request({ url: '/api/v1/me' })).rejects.toThrow('unauthorized');

    expect(getItem('miao_auth_token')).toBeNull();
    expect(getItem('miao_current_user')).toBeNull();
    expect(Taro.eventCenter.trigger).toHaveBeenCalledWith('auth:unauthorized');
  });

  it('clears cached auth after any 401 response', async () => {
    setItem('miao_auth_token', 'abc123');
    setItem('miao_current_user', JSON.stringify({ id: 'user-1' }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 401,
        json: async () => ({ message: 'session expired' }),
      })),
    );

    await expect(request({ url: '/api/v1/me' })).rejects.toThrow('session expired');

    expect(getItem('miao_auth_token')).toBeNull();
    expect(getItem('miao_current_user')).toBeNull();
    expect(Taro.eventCenter.trigger).toHaveBeenCalledWith('auth:unauthorized');
  });

  it('clears the H5 timeout timer when fetch rejects', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('network down');
        }),
      );

      await expect(request({ url: '/api/v1/me' })).rejects.toThrow('网络请求失败: network down');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });

  it('uses TARO_APP_API_BASE_URL for H5 when configured', async () => {
    process.env.TARO_APP_API_BASE_URL = 'https://api.example.com/';

    await request({ url: '/api/v1/me' });

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/v1/me', expect.any(Object));
  });
});
