import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatInfo } from '../../services/storage';

const defaultActiveCat: CatInfo = {
  id: 'cat-1',
  name: 'Miao',
  breed: '狸花',
  color: 'brown',
  avatar: 'https://cdn.example.com/cat.png',
  source: 'uploaded' as const,
  videoPath: 'https://cdn.example.com/direct.mp4',
  videoPaths: {
    v1_approach: 'https://cdn.example.com/v1.mp4',
    v2_wait: 'https://cdn.example.com/v2.mp4',
    v3_return: 'https://cdn.example.com/v3.mp4',
    v4_fetch: 'https://cdn.example.com/v4.mp4',
    idle: 'https://cdn.example.com/idle.mp4',
  },
};

let currentActiveCat: CatInfo = defaultActiveCat;

const videoContexts = vi.hoisted(() => ({
  catStoryVideo: { play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn() },
}));

const resetVideoContextMocks = () => {
  Object.values(videoContexts).forEach(ctx => {
    ctx.play.mockReset();
    ctx.pause.mockReset();
    ctx.stop.mockReset();
    ctx.seek.mockReset();
  });
};

vi.mock('@tarojs/components', async () => {
  const React = await import('react');
  const toDomProps = (props: Record<string, any>) => {
    const { className, children, onClick, onEnded, onError, ...rest } = props;
    return { className, children, onClick, onEnded, onError, ...rest };
  };
  return {
    View: (props: any) => React.createElement('div', toDomProps(props)),
    CoverView: (props: any) => React.createElement('div', toDomProps(props)),
    Text: (props: any) => React.createElement('span', toDomProps(props)),
    Image: ({ src, className }: any) => React.createElement('img', { src, className, alt: '' }),
    Video: (props: any) => {
      const { autoplay, ...domProps } = toDomProps(props) as any;
      return React.createElement('video', {
        ...domProps,
        autoPlay: autoplay,
        'data-testid': props.id,
      });
    },
  };
});

vi.mock('@tarojs/taro', () => ({
  default: {
    showShareMenu: vi.fn(),
    createVideoContext: vi.fn((id: keyof typeof videoContexts) => videoContexts[id]),
    eventCenter: {
      trigger: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  },
  useDidShow: vi.fn(),
  useDidHide: vi.fn(),
  useShareAppMessage: vi.fn(),
  useShareTimeline: vi.fn(),
}));

vi.mock('../../services/storage', () => ({
  storage: {
    getActiveCat: vi.fn(() => currentActiveCat),
    syncCatsFromServer: vi.fn(async () => undefined),
    getPoints: vi.fn(() => ({
      total: 0,
      lastLoginDate: new Date().toISOString().slice(0, 10),
      dailyInteractionPoints: 0,
      lastInteractionDate: null,
      onlineMinutes: 0,
      lastOnlineUpdate: Date.now(),
      history: [],
    })),
    savePoints: vi.fn(),
  },
}));

vi.mock('../../components/common/CatAvatar', () => ({
  default: ({ src, name, className }: any) => <img src={src} alt={name} className={className} />,
}));

vi.mock('../../components/common/FrostedGlassBubble', () => ({
  default: ({ text, visible }: any) => visible ? <div>{text}</div> : null,
}));

vi.mock('../../utils/eventAdapter', () => ({
  on: vi.fn(),
  off: vi.fn(),
  trigger: vi.fn(),
}));

vi.mock('../../utils/navigateAdapter', () => ({
  navigateTo: vi.fn(),
}));

vi.mock('../../utils/clientDiagnostics', () => ({
  reportPlaybackDiagnostic: vi.fn(),
}));

import Home from './index';
import { reportPlaybackDiagnostic } from '../../utils/clientDiagnostics';

describe('Home PWA playback model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentActiveCat = defaultActiveCat;
    resetVideoContextMocks();
  });

  it('renders one native story video and switches sources through state', () => {
    const { container } = render(<Home />);

    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getByTestId('catStoryVideo').getAttribute('src')).toBe('https://cdn.example.com/v1.mp4');
    expect(container.querySelector('video[src="https://cdn.example.com/idle.mp4"]')).toBeNull();
  });

  it('starts V1 on tap and advances to V2 when V1 ends', () => {
    render(<Home />);

    fireEvent.click(screen.getByTestId('story-touch-layer'));
    expect(videoContexts.catStoryVideo.play).toHaveBeenCalled();

    fireEvent.ended(screen.getByTestId('catStoryVideo'));
    expect(screen.getByTestId('catStoryVideo').getAttribute('src')).toBe('https://cdn.example.com/v2.mp4');
    expect(videoContexts.catStoryVideo.play).toHaveBeenCalled();
  });

  it('reports playback diagnostics when tapping the story layer', () => {
    render(<Home />);

    fireEvent.click(screen.getByTestId('story-touch-layer'));

    expect(reportPlaybackDiagnostic).toHaveBeenCalledWith('home.tap.ready', expect.objectContaining({
      catId: defaultActiveCat.id,
      action: 'v1',
      src: 'https://cdn.example.com/v1.mp4',
      hasV1: true,
      hasV2: true,
      hasV3: true,
      hasV4: true,
    }));
  });

  it('marks the requested story video for native autoplay after tap', () => {
    render(<Home />);

    expect((screen.getByTestId('catStoryVideo') as HTMLVideoElement).autoplay).toBe(false);

    fireEvent.click(screen.getByTestId('story-touch-layer'));

    expect((screen.getByTestId('catStoryVideo') as HTMLVideoElement).autoplay).toBe(true);
  });

  it('surfaces a playback error when the active video never starts', () => {
    vi.useFakeTimers();
    try {
      render(<Home />);

      fireEvent.click(screen.getByTestId('story-touch-layer'));

      act(() => {
        vi.advanceTimersByTime(5600);
      });

      expect(screen.getByText('视频暂时无法播放')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps playback active when the native video reports play', () => {
    vi.useFakeTimers();
    try {
      render(<Home />);

      fireEvent.click(screen.getByTestId('story-touch-layer'));
      fireEvent.play(screen.getByTestId('catStoryVideo'));

      act(() => {
        vi.advanceTimersByTime(5600);
      });

      expect(screen.queryByText('视频暂时无法播放')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets and plays the single native video before starting a story segment', () => {
    render(<Home />);
    resetVideoContextMocks();

    fireEvent.click(screen.getByTestId('story-touch-layer'));

    expect(videoContexts.catStoryVideo.seek).toHaveBeenCalledWith(0);
    expect(videoContexts.catStoryVideo.play).toHaveBeenCalled();
  });

  it('does not mount hidden native videos for inactive story segments', () => {
    const { container } = render(<Home />);

    fireEvent.click(screen.getByTestId('story-touch-layer'));

    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getByTestId('catStoryVideo').getAttribute('src')).toBe('https://cdn.example.com/v1.mp4');
  });

  it('keeps single-video ended events scoped to the active playback state', () => {
    render(<Home />);
    resetVideoContextMocks();

    fireEvent.ended(screen.getByTestId('catStoryVideo'));

    expect(videoContexts.catStoryVideo.play).not.toHaveBeenCalled();
    expect(videoContexts.catStoryVideo.seek).not.toHaveBeenCalled();
  });

  it('surfaces playback errors from the active single native video', () => {
    render(<Home />);

    fireEvent.error(screen.getByTestId('catStoryVideo'));

    expect(screen.getByText('视频暂时无法播放')).toBeTruthy();
  });

  it('keeps the story video mounted behind the active error overlay for retry', () => {
    render(<Home />);

    fireEvent.error(screen.getByTestId('catStoryVideo'));

    expect(screen.getByText('视频暂时无法播放')).toBeTruthy();
    expect(screen.getByTestId('catStoryVideo')).toBeTruthy();
  });

  it('returns to ready instead of looping V1 when V2 is missing', () => {
    currentActiveCat = {
      ...defaultActiveCat,
      videoPaths: {
        v1_approach: 'https://cdn.example.com/v1.mp4',
      },
    };

    render(<Home />);
    resetVideoContextMocks();

    fireEvent.click(screen.getByTestId('story-touch-layer'));
    fireEvent.ended(screen.getByTestId('catStoryVideo'));

    expect(screen.getByTestId('catStoryVideo').getAttribute('src')).toBe('https://cdn.example.com/v1.mp4');
    expect(screen.getByText('剧情流暂未完成')).toBeTruthy();
  });

  it('shows only the active unlock progress badge while background actions are generating', () => {
    currentActiveCat = {
      ...defaultActiveCat,
      isUnlocking: true,
      unlockProgress: { total: 3, completed: 1, failed: 0, updatedAt: Date.now() },
      videoPaths: {
        v1_approach: 'https://cdn.example.com/v1.mp4',
      },
    };

    const { container } = render(<Home />);

    expect(container.querySelectorAll('.unlock-progress-badge')).toHaveLength(1);
    expect(screen.getByText('正在解锁更多动作')).toBeTruthy();
    expect(screen.queryByText('剧情流暂未完成')).toBeNull();
  });
});
