import Taro from '@tarojs/taro';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadAdapter(env: any) {
  vi.resetModules();
  vi.mocked(Taro.getEnv).mockReturnValue(env);
  return import('../navigateAdapter');
}

describe('navigateAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Taro navigation APIs when runtime environment is WeChat mini program', async () => {
    const { navigateTo, switchTab, reLaunch } = await loadAdapter(Taro.ENV_TYPE.WEAPP);

    await navigateTo('/pages/profile/index');
    await switchTab('/pages/home/index');
    await reLaunch('/pages/login/index');

    expect(Taro.navigateTo).toHaveBeenCalledWith({ url: '/pages/profile/index' });
    expect(Taro.switchTab).toHaveBeenCalledWith({ url: '/pages/home/index' });
    expect(Taro.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' });
  });
});
