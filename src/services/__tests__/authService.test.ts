import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../authService';
import { getItem } from '../../utils/storageAdapter';

vi.mock('../../utils/httpAdapter', () => ({
  request: vi.fn(),
}));

import { request } from '../../utils/httpAdapter';

describe('authService', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it('persists token and normalized user after password login', async () => {
    vi.mocked(request).mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        token: 'token-1',
        user: { username: 'alice', nickname: 'Alice' },
      },
    });

    const user = await authService.passwordLogin('alice', 'secret123');

    expect(user).toMatchObject({
      username: 'alice',
      nickname: 'Alice',
      passwordSet: true,
    });
    expect(getItem('miao_auth_token')).toBe('token-1');
    expect(JSON.parse(getItem('miao_current_user') || '{}')).toMatchObject({
      username: 'alice',
      nickname: 'Alice',
    });
  });

  it('preserves server-provided debug authorization fields', async () => {
    const expiresAt = Date.now() + 60_000;
    vi.mocked(request).mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        token: 'token-debug',
        user: {
          username: 'operator',
          nickname: 'Operator',
          debugAllowed: true,
          debugRole: 'operator',
          debugExpiresAt: expiresAt,
        },
      },
    });

    const user = await authService.passwordLogin('operator', 'secret123');

    expect(user).toMatchObject({
      username: 'operator',
      debugAllowed: true,
      debugRole: 'operator',
      debugExpiresAt: expiresAt,
    });
    expect(JSON.parse(getItem('miao_current_user') || '{}')).toMatchObject({
      debugAllowed: true,
      debugRole: 'operator',
      debugExpiresAt: expiresAt,
    });
  });

  it('removes cached auth on logout', async () => {
    vi.mocked(request).mockResolvedValue({
      status: 200,
      headers: {},
      data: {
        token: 'token-1',
        user: { username: 'alice' },
      },
    });
    await authService.passwordLogin('alice', 'secret123');

    authService.logout();

    expect(getItem('miao_auth_token')).toBeNull();
    expect(getItem('miao_current_user')).toBeNull();
  });
});
