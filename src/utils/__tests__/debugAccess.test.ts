import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function importDebugAccess(env: Record<string, string | undefined> = {}) {
  process.env.NODE_ENV = env.NODE_ENV || 'production';
  for (const key of ['TARO_APP_ENABLE_ADMIN', 'TARO_APP_DEBUG_BUILD']) {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  vi.resetModules();
  return import('../debugAccess');
}

describe('debug access policy', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('always allows production-safe diagnostics', async () => {
    const { canAccessDiagnostics } = await importDebugAccess();

    expect(canAccessDiagnostics()).toBe(true);
  });

  it('blocks admin console when the admin bundle is not enabled', async () => {
    const { canAccessAdminConsole, getAdminSettingsRoute, isAdminBundleEnabled } = await importDebugAccess();

    expect(isAdminBundleEnabled()).toBe(false);
    expect(getAdminSettingsRoute()).toBeNull();
    expect(canAccessAdminConsole({
      username: 'ops',
      nickname: 'Ops',
      avatar: '',
      debugAllowed: true,
      debugRole: 'developer',
      debugExpiresAt: Date.now() + 60_000,
    })).toBe(false);
  });

  it('does not enable admin bundle in ordinary development mode without explicit flags', async () => {
    const {
      canAccessAdminConsole,
      canUseDangerousDebug,
      getAdminSettingsRoute,
      isAdminBundleEnabled,
      isDangerousDebugStorageEnabled,
      isDebugBuild,
    } = await importDebugAccess({ NODE_ENV: 'development' });

    expect(isDebugBuild()).toBe(false);
    expect(isAdminBundleEnabled()).toBe(false);
    expect(getAdminSettingsRoute()).toBeNull();
    expect(canAccessAdminConsole(null)).toBe(false);
    expect(canUseDangerousDebug(null)).toBe(false);
    expect(isDangerousDebugStorageEnabled()).toBe(false);
  });

  it('allows admin and dangerous flags in explicit debug builds', async () => {
    const { canAccessAdminConsole, canUseDangerousDebug, getAdminSettingsRoute, isDangerousDebugStorageEnabled } =
      await importDebugAccess({ TARO_APP_DEBUG_BUILD: 'true' });
    const adminRoute = ['', 'pages', 'admin-settings', 'index'].join('/');

    expect(canAccessAdminConsole(null)).toBe(true);
    expect(canUseDangerousDebug(null)).toBe(true);
    expect(getAdminSettingsRoute()).toBe(adminRoute);
    expect(isDangerousDebugStorageEnabled()).toBe(true);
  });

  it('allows remotely authorized admin access without enabling dangerous local flags', async () => {
    const { canAccessAdminConsole, canUseDangerousDebug, isDangerousDebugStorageEnabled } =
      await importDebugAccess({ TARO_APP_ENABLE_ADMIN: 'true' });
    const user = {
      username: 'operator',
      nickname: 'Operator',
      avatar: '',
      debugAllowed: true,
      debugRole: 'operator' as const,
      debugExpiresAt: Date.now() + 60_000,
    };

    expect(canAccessAdminConsole(user)).toBe(true);
    expect(canUseDangerousDebug(user)).toBe(false);
    expect(isDangerousDebugStorageEnabled()).toBe(false);
  });

  it('rejects expired remote debug access', async () => {
    const { canAccessAdminConsole } = await importDebugAccess({ TARO_APP_ENABLE_ADMIN: 'true' });

    expect(canAccessAdminConsole({
      username: 'old-operator',
      nickname: 'Old Operator',
      avatar: '',
      debugAllowed: true,
      debugRole: 'operator',
      debugExpiresAt: Date.now() - 1,
    })).toBe(false);
  });
});
