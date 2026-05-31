import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const activeCat = {
  id: 'cat-1',
  name: 'Miao',
  breed: '狸花',
  color: 'brown',
  avatar: 'https://cdn.example.com/cat.png',
  source: 'uploaded' as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
    Video: (props: any) => React.createElement('video', toDomProps(props)),
  };
});

vi.mock('@tarojs/taro', () => ({
  default: {
    getCurrentInstance: vi.fn(() => ({ router: { params: {} } })),
    showToast: vi.fn(),
  },
  navigateTo: vi.fn(),
  reLaunch: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({ refreshCatStatus: vi.fn() })),
}));

vi.mock('../../hooks/useNavSpace', () => ({
  useNavSpace: vi.fn(() => ({})),
}));

vi.mock('../../utils/navigateAdapter', () => ({
  safeBack: vi.fn(async () => undefined),
}));

vi.mock('../../services/storage', () => ({
  storage: {
    getActiveCat: vi.fn(() => activeCat),
    getCatById: vi.fn(() => activeCat),
    saveCatInfo: vi.fn(),
    deductPoints: vi.fn(() => true),
    addPoints: vi.fn(),
    getPoints: vi.fn(() => ({ total: 100 })),
    setActiveCatId: vi.fn(),
    deleteCatById: vi.fn(),
  },
}));

vi.mock('../../services/volcanoService', () => ({
  ACTION_PROMPTS: {
    v1_approach: { prompt: 'v1 prompt', duration: 7 },
    v2_wait: { prompt: 'v2 prompt', duration: 4 },
    v3_return: { prompt: 'v3 prompt', duration: 7 },
    v4_fetch: { prompt: 'v4 prompt', duration: 7 },
  },
  VolcanoService: {
    submitTask: vi.fn(async () => ({ id: 'task-1' })),
    pollTaskResult: vi.fn(async () => 'https://cdn.example.com/idle.mp4'),
  },
}));

vi.mock('../../services/fileManager', () => ({
  FileManager: {
    downloadVideos: vi.fn(),
    updateCatVideos: vi.fn(),
  },
}));

import GenerationProgress from './index';
import { useAuthContext } from '../../context/AuthContext';
import { FileManager } from '../../services/fileManager';
import { storage } from '../../services/storage';
import { VolcanoService } from '../../services/volcanoService';

describe('GenerationProgress lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({ refreshCatStatus: vi.fn() } as any);
    vi.mocked(storage.getActiveCat).mockReturnValue(activeCat as any);
    vi.mocked(storage.getCatById).mockReturnValue(activeCat as any);
  });

  it('does not apply post-download success side effects after unmount', async () => {
    const download = deferred<Record<string, string>>();
    vi.mocked(FileManager.downloadVideos).mockReturnValue(download.promise);
    const refreshCatStatus = vi.fn();
    vi.mocked(useAuthContext).mockReturnValue({ refreshCatStatus } as any);

    const { unmount } = render(<GenerationProgress />);

    await waitFor(() => {
      expect(FileManager.downloadVideos).toHaveBeenCalled();
    });

    unmount();
    await act(async () => {
      download.resolve({ v1_approach: 'https://cdn.example.com/persisted.mp4' });
      await download.promise;
    });

    expect(storage.setActiveCatId).not.toHaveBeenCalled();
    expect(refreshCatStatus).not.toHaveBeenCalled();
  });

  it('generates and persists the first video as v1_approach', async () => {
    vi.mocked(FileManager.downloadVideos).mockResolvedValue({ v1_approach: 'https://cdn.example.com/v1.mp4' });

    render(<GenerationProgress />);

    await waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledWith(
        activeCat.avatar,
        expect.objectContaining({
          prompt: 'v1 prompt',
          duration: 7,
          firstFrame: activeCat.avatar,
        }),
      );
    });

    await waitFor(() => {
      expect(FileManager.downloadVideos).toHaveBeenCalledWith(
        { v1_approach: 'https://cdn.example.com/idle.mp4' },
        activeCat.id,
        activeCat.name,
        activeCat.avatar,
        expect.objectContaining({
          anchorFrame: activeCat.avatar,
          placeholderImage: activeCat.avatar,
        }),
      );
    });
  });

  it('starts generation for the cat id passed in route params instead of relying only on active cat', async () => {
    const routeCat = { ...activeCat, id: 'cat-route', name: 'Route Cat' };
    const otherActiveCat = { ...activeCat, id: 'cat-active', name: 'Active Cat' };
    const Taro = await import('@tarojs/taro');
    vi.mocked(Taro.default.getCurrentInstance).mockReturnValue({ router: { params: { catId: 'cat-route' } } } as any);
    vi.mocked(storage.getActiveCat).mockReturnValue(otherActiveCat as any);
    vi.mocked(storage.getCatById).mockImplementation((id: string) => (
      id === 'cat-route' ? routeCat : otherActiveCat
    ) as any);
    vi.mocked(FileManager.downloadVideos).mockResolvedValue({ v1_approach: 'https://cdn.example.com/v1.mp4' });

    render(<GenerationProgress />);

    await waitFor(() => {
      expect(storage.getCatById).toHaveBeenCalledWith('cat-route');
      expect(VolcanoService.submitTask).toHaveBeenCalledWith(
        routeCat.avatar,
        expect.objectContaining({
          firstFrame: routeCat.avatar,
        }),
      );
    });
  });
});
