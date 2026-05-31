import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPassword from './index';
import { request } from '../../utils/httpAdapter';

vi.mock('@tarojs/components', async () => {
  const React = await import('react');
  const toDomProps = (props: Record<string, any>) => {
    const { onClick, className, children, scrollY, showScrollbar, ...rest } = props;
    return { onClick, className, children, ...rest };
  };
  return {
    View: (props: any) => React.createElement('div', toDomProps(props)),
    Text: (props: any) => React.createElement('span', toDomProps(props)),
    Image: ({ src, className, onClick }: any) => React.createElement('img', { src, className, onClick, alt: '' }),
    ScrollView: (props: any) => React.createElement('div', toDomProps(props)),
    Input: ({ value, onInput, placeholder, className }: any) => (
      React.createElement('input', {
        value,
        placeholder,
        className,
        onChange: (event: any) => onInput?.({ detail: { value: event.target.value } }),
      })
    ),
  };
});

vi.mock('../../utils/httpAdapter', () => ({
  request: vi.fn(),
}));

vi.mock('../../utils/navigateAdapter', () => ({
  safeBack: vi.fn(async () => undefined),
}));

import { safeBack } from '../../utils/navigateAdapter';

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(request).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears verification-code countdown timer on unmount', async () => {
    vi.mocked(request).mockResolvedValue({ data: {} } as any);
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    try {
      const { unmount } = render(<ResetPassword />);

      fireEvent.change(screen.getByPlaceholderText('请输入注册时的手机号'), {
        target: { value: '13800138000' },
      });
      fireEvent.click(screen.getByText('获取验证码'));

      await Promise.resolve();
      expect(request).toHaveBeenCalled();
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    } finally {
      clearIntervalSpy.mockRestore();
    }
  });

  it('clears success navigation timer on unmount', async () => {
    vi.mocked(request).mockResolvedValue({ data: {} } as any);
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    try {
      const { unmount } = render(<ResetPassword />);

      fireEvent.change(screen.getByPlaceholderText('请输入注册时的手机号'), {
        target: { value: '13800138000' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入验证码'), {
        target: { value: '123456' },
      });
      fireEvent.change(screen.getByPlaceholderText('设置 6-20 位新密码'), {
        target: { value: 'newpass123' },
      });
      fireEvent.click(screen.getAllByText('重置密码')[1]);

      await Promise.resolve();
      expect(request).toHaveBeenCalledWith({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
        data: { phone: '13800138000', code: '123456', newPassword: 'newpass123' },
      });
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      vi.advanceTimersByTime(1500);
      expect(safeBack).not.toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });
});
