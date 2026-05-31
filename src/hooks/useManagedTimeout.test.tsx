import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useManagedTimeout } from './useManagedTimeout';

describe('useManagedTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears pending timers on unmount', () => {
    const callback = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    try {
      const { result, unmount } = renderHook(() => useManagedTimeout());

      act(() => {
        result.current.setManagedTimeout(callback, 1000);
      });
      unmount();
      vi.advanceTimersByTime(1000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });

  it('can clear timers manually before unmount', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useManagedTimeout());

    act(() => {
      result.current.setManagedTimeout(callback, 1000);
      result.current.clearManagedTimeouts();
    });
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });
});
