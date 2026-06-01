import { describe, expect, it, vi } from 'vitest';
import { drawQROnCanvas, getQRByteLength } from '../qrCanvas';

describe('qrCanvas', () => {
  it('uses UTF-8 byte length for non-ASCII QR payloads', () => {
    expect(getQRByteLength('abc')).toBe(3);
    expect(getQRByteLength('喵')).toBe(3);
    expect(getQRByteLength('🐱')).toBe(4);
  });

  it('draws QR payloads containing Chinese text without truncation errors', () => {
    const ctx = {
      fillStyle: '',
      fillRect: vi.fn(),
    };

    expect(() => drawQROnCanvas(ctx, 'miao://join?name=小猫🐱', 0, 0, 320)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
