import Taro from '@tarojs/taro';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offAll, on, trigger } from '../eventAdapter';

describe('eventAdapter', () => {
  beforeEach(() => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEAPP);
    vi.clearAllMocks();
  });

  it('offAll(event) removes only handlers registered through the adapter', () => {
    const first = vi.fn();
    const second = vi.fn();

    on('cat-updated', first);
    on('cat-updated', second);
    offAll('cat-updated');
    trigger('cat-updated', { catId: 'cat-1' });

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(Taro.eventCenter.off).toHaveBeenCalledWith('cat-updated', first);
    expect(Taro.eventCenter.off).toHaveBeenCalledWith('cat-updated', second);
    expect(Taro.eventCenter.off).not.toHaveBeenCalledWith('cat-updated');
  });
});
