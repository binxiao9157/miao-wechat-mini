import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadServices(env: Record<string, string | undefined> = {}) {
  process.env.NODE_ENV = env.NODE_ENV || 'production';
  for (const key of ['TARO_APP_ENABLE_ADMIN', 'TARO_APP_DEBUG_BUILD', 'TARO_APP_AI_PROVIDER', 'TARO_APP_AI_PROFILE_VERSION']) {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  vi.resetModules();
  const [{ aiConfig, DEFAULT_AI_PROFILES }, { storage }, { setItem }] = await Promise.all([
    import('../aiConfig'),
    import('../storage'),
    import('../../utils/storageAdapter'),
  ]);
  return { aiConfig, DEFAULT_AI_PROFILES, storage, setItem };
}

describe('debug release guards', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('forces dangerous debug flags off in normal release builds', async () => {
    const { aiConfig, storage, setItem } = await loadServices();
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });

    setItem('MIAO_AI_MOCK_MODE', 'true');
    setItem('u_alice_miao_debug_fast_forward', 'true');
    setItem('u_alice_miao_debug_points_cheat', 'true');

    expect(aiConfig.getProfile().mockMode).toBe(false);
    expect(storage.getIsFastForward()).toBe(false);
    expect(storage.getIsPointsCheat()).toBe(false);

    storage.setIsFastForward(true);
    storage.setIsPointsCheat(true);

    expect(storage.getIsFastForward()).toBe(false);
    expect(storage.getIsPointsCheat()).toBe(false);
  });

  it('allows dangerous debug flags in explicit debug builds', async () => {
    const { aiConfig, DEFAULT_AI_PROFILES, storage } = await loadServices({ TARO_APP_DEBUG_BUILD: 'true' });
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });

    aiConfig.saveProfile({ ...DEFAULT_AI_PROFILES.volcengine, mockMode: true });
    storage.setIsFastForward(true);
    storage.setIsPointsCheat(true);

    expect(aiConfig.getProfile().mockMode).toBe(true);
    expect(storage.getIsFastForward()).toBe(true);
    expect(storage.getIsPointsCheat()).toBe(true);
  });

  it('migrates stale cached ai provider to the current release default once per profile version', async () => {
    const { aiConfig, setItem } = await loadServices({
      TARO_APP_AI_PROVIDER: 'volcengine',
      TARO_APP_AI_PROFILE_VERSION: 'release-volcengine-default',
    });

    setItem('MIAO_AI_PROFILE_VERSION', 'legacy-dashscope-default');
    setItem('MIAO_AI_PROVIDER', 'dashscope');

    expect(aiConfig.getProfile().provider).toBe('volcengine');
    expect(aiConfig.getProfile().imageModel).toBe('doubao-seedream-4-5-251128');
  });

  it('keeps an explicitly saved ai provider after the active profile version is current', async () => {
    const { aiConfig, DEFAULT_AI_PROFILES, setItem } = await loadServices({
      TARO_APP_AI_PROVIDER: 'volcengine',
      TARO_APP_AI_PROFILE_VERSION: 'release-volcengine-default',
    });

    setItem('MIAO_AI_PROFILE_VERSION', 'release-volcengine-default');
    aiConfig.saveProfile(DEFAULT_AI_PROFILES.dashscope);

    expect(aiConfig.getProfile().provider).toBe('dashscope');
  });
});
