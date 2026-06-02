import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';
import UploadMaterial from './index';
import { VolcanoService } from '../../services/volcanoService';

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
    Canvas: (props: any) => React.createElement('canvas', toDomProps(props)),
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

vi.mock('../../hooks/useNavSpace', () => ({
  useNavSpace: vi.fn(() => ({})),
}));

vi.mock('../../hooks/useManagedTimeout', () => ({
  useManagedTimeout: vi.fn(() => ({ setManagedTimeout: vi.fn() })),
}));

vi.mock('../../utils/navigateAdapter', () => ({
  redirectTo: vi.fn(),
  safeBack: vi.fn(),
}));

vi.mock('../../services/storage', () => ({
  storage: {
    saveCatInfo: vi.fn(),
  },
}));

vi.mock('../../services/contentSafetyService', () => ({
  checkTextContent: vi.fn(async () => undefined),
  checkMediaContent: vi.fn(async () => undefined),
}));

vi.mock('../../services/volcanoService', () => ({
  IMAGE_PROMPTS: {
    anchor: vi.fn(() => 'anchor prompt'),
  },
  VolcanoService: {
    submitImageTask: vi.fn(async () => ({ id: 'image-task-1' })),
    pollImageResult: vi.fn(async () => 'https://cdn.example.com/generated.png'),
  },
}));

describe('UploadMaterial generated image actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Taro as any).getCurrentInstance = vi.fn(() => ({ router: { params: {} } }));
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEB);
    vi.mocked(Taro.getPrivacySetting).mockImplementation(({ success }: any) => {
      success?.({ needAuthorization: false });
    });
    vi.mocked(Taro.chooseMedia).mockImplementation(async ({ success }: any) => {
      success?.({ tempFiles: [{ tempFilePath: 'wxfile://tmp/source.png' }] });
      return { tempFiles: [{ tempFilePath: 'wxfile://tmp/source.png' }] } as any;
    });
    (Taro as any).downloadFile = vi.fn(async ({ success }: any) => {
      success?.({ statusCode: 200, tempFilePath: 'wxfile://tmp/generated-local.png' });
      return { statusCode: 200, tempFilePath: 'wxfile://tmp/generated-local.png' };
    });
    (Taro as any).getImageInfo = vi.fn(async ({ success }: any) => {
      const res = { width: 1024, height: 768 };
      success?.(res);
      return res;
    });
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      setFillStyle: vi.fn(),
      fillRect: vi.fn(),
      setFontSize: vi.fn(),
      setTextAlign: vi.fn(),
      setTextBaseline: vi.fn(),
      fillText: vi.fn(),
      draw: vi.fn((_: boolean, callback: () => void) => callback?.()),
    };
    (Taro as any).createCanvasContext = vi.fn(() => ctx);
    (Taro as any).canvasToTempFilePath = vi.fn(async ({ success }: any) => {
      const res = { tempFilePath: 'wxfile://tmp/generated-miao-watermark.png' };
      success?.(res);
      return res;
    });
    vi.mocked(Taro.saveImageToPhotosAlbum).mockImplementation(async ({ success }: any) => {
      success?.();
      return {} as any;
    });
  });

  it('downloads a remote generated image before saving it to the photo album', async () => {
    const { container } = render(<UploadMaterial />);

    fireEvent.click(screen.getByText('点击上传照片'));
    await waitFor(() => {
      expect(container.querySelector('.image-preview')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('给猫咪起个好听的名字'), { target: { value: 'Miao' } });
    await waitFor(() => {
      expect(container.querySelector('.generate-btn.active')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('开始生成数字形象'));

    await waitFor(() => {
      expect(VolcanoService.pollImageResult).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByText('保存图片'));

    await waitFor(() => {
      expect((Taro as any).downloadFile).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://cdn.example.com/generated.png',
      }));
    });
    expect(Taro.saveImageToPhotosAlbum).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'wxfile://tmp/generated-local.png',
    }));
    expect(Taro.saveImageToPhotosAlbum).not.toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'https://cdn.example.com/generated.png',
    }));
  });

  it('proxies third-party generated images before saving in the mini program', async () => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEAPP);
    vi.mocked(VolcanoService.pollImageResult).mockResolvedValueOnce('https://cdn.example.com/generated.png?x=1&token=a+b');

    const { container } = render(<UploadMaterial />);

    fireEvent.click(screen.getByText('点击上传照片'));
    await waitFor(() => {
      expect(container.querySelector('.image-preview')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('给猫咪起个好听的名字'), { target: { value: 'Miao' } });
    fireEvent.click(screen.getByText('开始生成数字形象'));

    await waitFor(() => {
      expect(VolcanoService.pollImageResult).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByText('保存图片'));

    await waitFor(() => {
      expect((Taro as any).downloadFile).toHaveBeenCalledWith(expect.objectContaining({
        url: `https://www.mmdd10.tech/api/proxy-resource?url=${encodeURIComponent('https://cdn.example.com/generated.png?x=1&token=a+b')}`,
      }));
    });
    expect(Taro.saveImageToPhotosAlbum).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'wxfile://tmp/generated-miao-watermark.png',
    }));
  });

  it('shows saved feedback when saveImageToPhotosAlbum resolves without a success callback', async () => {
    vi.mocked(Taro.saveImageToPhotosAlbum).mockImplementation(async () => ({} as any));

    const { container } = render(<UploadMaterial />);

    fireEvent.click(screen.getByText('点击上传照片'));
    await waitFor(() => {
      expect(container.querySelector('.image-preview')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('给猫咪起个好听的名字'), { target: { value: 'Miao' } });
    fireEvent.click(screen.getByText('开始生成数字形象'));

    await waitFor(() => {
      expect(VolcanoService.pollImageResult).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByText('保存图片'));

    expect(await screen.findByText('已保存到相册')).toBeTruthy();
    expect(screen.queryByText('保存中...')).toBeFalsy();
  });

  it('adds a MIAO watermark before saving generated images in the mini program', async () => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEAPP);
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      setFillStyle: vi.fn(),
      fillRect: vi.fn(),
      setFontSize: vi.fn(),
      setTextAlign: vi.fn(),
      setTextBaseline: vi.fn(),
      fillText: vi.fn(),
      draw: vi.fn((_: boolean, callback: () => void) => callback?.()),
    };
    (Taro as any).createCanvasContext = vi.fn(() => ctx);
    (Taro as any).canvasToTempFilePath = vi.fn(async ({ success }: any) => {
      const res = { tempFilePath: 'wxfile://tmp/generated-miao-watermark.png' };
      success?.(res);
      return res;
    });

    const { container } = render(<UploadMaterial />);

    fireEvent.click(screen.getByText('点击上传照片'));
    await waitFor(() => {
      expect(container.querySelector('.image-preview')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('给猫咪起个好听的名字'), { target: { value: 'Miao' } });
    fireEvent.click(screen.getByText('开始生成数字形象'));

    await waitFor(() => {
      expect(VolcanoService.pollImageResult).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByText('保存图片'));

    await waitFor(() => {
      expect(ctx.fillText).toHaveBeenCalledWith('MIAO', expect.any(Number), expect.any(Number));
    });
    expect(Taro.saveImageToPhotosAlbum).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'wxfile://tmp/generated-miao-watermark.png',
    }));
    expect(Taro.saveImageToPhotosAlbum).not.toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'wxfile://tmp/generated-local.png',
    }));
  });

  it('normalizes relative generated image paths before saving in the mini program', async () => {
    vi.mocked(Taro.getEnv).mockReturnValue(Taro.ENV_TYPE.WEAPP);
    vi.mocked(VolcanoService.pollImageResult).mockResolvedValueOnce('/uploads/media/generated.png');

    const { container } = render(<UploadMaterial />);

    fireEvent.click(screen.getByText('点击上传照片'));
    await waitFor(() => {
      expect(container.querySelector('.image-preview')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('给猫咪起个好听的名字'), { target: { value: 'Miao' } });
    fireEvent.click(screen.getByText('开始生成数字形象'));

    await waitFor(() => {
      expect(VolcanoService.pollImageResult).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByText('保存图片'));

    await waitFor(() => {
      expect((Taro as any).downloadFile).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://www.mmdd10.tech/uploads/media/generated.png',
      }));
    });
    expect(Taro.saveImageToPhotosAlbum).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'wxfile://tmp/generated-miao-watermark.png',
    }));
  });
});
