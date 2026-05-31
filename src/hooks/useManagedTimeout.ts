import { useCallback, useEffect, useRef } from 'react';

export function useManagedTimeout() {
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearManagedTimeouts = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
  }, []);

  const setManagedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  useEffect(() => clearManagedTimeouts, [clearManagedTimeouts]);

  return { setManagedTimeout, clearManagedTimeouts };
}

export default useManagedTimeout;
