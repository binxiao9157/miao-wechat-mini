import { act, renderHook } from '@testing-library/react';
import Taro from '@tarojs/taro';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavSpace } from './useNavSpace';

describe('useNavSpace', () => {
  beforeEach(() => {
    (Taro as any).getSystemInfoSync = vi.fn(() => {
      throw new Error('system metrics unavailable');
    });
    (Taro as any).getMenuButtonBoundingClientRect = vi.fn(() => {
      throw new Error('capsule metrics unavailable');
    });
  });

  it('starts with a safe top inset before native capsule metrics are available', () => {
    const { result } = renderHook(() => useNavSpace());

    expect(result.current['--nav-top']).not.toBe('0px');
    expect(result.current['--nav-side']).not.toBe('21px');
  });

  it('uses capsule metrics when WeChat reports them', async () => {
    (Taro.getSystemInfoSync as any).mockReturnValue({ windowWidth: 390, statusBarHeight: 47 });
    (Taro.getMenuButtonBoundingClientRect as any).mockReturnValue({
      top: 54,
      height: 32,
      right: 372,
    });

    const { result } = renderHook(() => useNavSpace());

    await act(async () => {});

    expect(result.current['--nav-top']).toBe('94px');
    expect(result.current['--nav-side']).toBe('39px');
    expect(result.current['--nav-capsule-top']).toBe('54px');
  });
});
