import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';
import EditProfile from './index';
import { useAuthContext } from '../../context/AuthContext';
import { request } from '../../utils/httpAdapter';
import { uploadFile } from '../../utils/uploadAdapter';

vi.mock('@tarojs/components', async () => {
  const React = await import('react');
  const toDomProps = (props: Record<string, any>) => {
    const { onClick, className, children, ...rest } = props;
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

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../utils/httpAdapter', () => ({
  request: vi.fn(),
}));

vi.mock('../../utils/uploadAdapter', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('../../utils/navigateAdapter', () => ({
  safeBack: vi.fn(async () => undefined),
  navigateTo: vi.fn(async () => undefined),
}));

vi.mock('../../services/contentSafetyService', () => ({
  checkTextContent: vi.fn(async () => undefined),
  checkMediaContent: vi.fn(async () => undefined),
}));

describe('EditProfile', () => {
  const updateProfile = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: {
        id: 'user-1',
        username: 'alice',
        nickname: 'Alice',
        avatar: 'wxfile://tmp/avatar.png',
      },
      updateProfile,
    } as any);
    vi.mocked(uploadFile).mockReset();
    vi.mocked(request).mockReset();
    vi.mocked(Taro.showToast).mockReset();
    updateProfile.mockReset();
  });

  it('uploads temporary avatar through uploadAdapter before saving profile', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ url: 'https://cdn.example.com/avatar.png' });
    vi.mocked(request).mockResolvedValue({
      data: { user: { nickname: 'Alice', avatar: 'https://cdn.example.com/avatar.png' } },
    } as any);

    render(<EditProfile />);
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledWith({
        url: '/api/v1/upload',
        filePath: 'wxfile://tmp/avatar.png',
        name: 'file',
      });
    });
    expect(request).toHaveBeenCalledWith({
      url: '/api/v1/me',
      method: 'PATCH',
      data: { nickname: 'Alice', avatar: 'https://cdn.example.com/avatar.png' },
    });
  });

  it('does not save a temporary avatar path when upload fails', async () => {
    vi.mocked(uploadFile).mockRejectedValue(new Error('图片上传失败'));

    render(<EditProfile />);
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(Taro.showToast).toHaveBeenCalledWith({ title: '图片上传失败', icon: 'none' });
    });
    expect(request).not.toHaveBeenCalled();
  });
});
