import { describe, expect, it } from 'vitest';

describe('test setup', () => {
  it('provides memory-backed localStorage', () => {
    localStorage.setItem('miao-test-key', 'miao-test-value');

    expect(localStorage.getItem('miao-test-key')).toBe('miao-test-value');
    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe('miao-test-key');
  });
});
