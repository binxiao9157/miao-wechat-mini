import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  catVideoV1: { play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn() },
  catVideoV2: { play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn() },
  catVideoV3: { play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn() },
  catVideoV4: { play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn() },
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
    Text: (props: any) => React.createElement('span', toDomProps(props)),
    Image: ({ src, className }: any) => React.createElement('img', { src, className, alt: '' }),
    Video: (props: any) => React.createElement('video', {
      ...toDomProps(props),
      'data-testid': props.id,
    }),
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

import Home from './index';

describe('Home PWA playback model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentActiveCat = defaultActiveCat;
    resetVideoContextMocks();
  });

  it('renders the four PWA story videos instead of legacy action playback', () => {
    const { container } = render(<Home />);

    expect(screen.getByTestId('catVideoV1').getAttribute('src')).toBe('https://cdn.example.com/v1.mp4');
    expect(screen.getByTestId('catVideoV2').getAttribute('src')).toBe('https://cdn.example.com/v2.mp4');
    expect(screen.getByTestId('catVideoV3').getAttribute('src')).toBe('https://cdn.example.com/v3.mp4');
    expect(screen.getByTestId('catVideoV4').getAttribute('src')).toBe('https://cdn.example.com/v4.mp4');
    expect(container.querySelector('video[src="https://cdn.example.com/idle.mp4"]')).toBeNull();
  });

  it('starts V1 on tap and advances to V2 when V1 ends', () => {
    render(<Home />);

    fireEvent.click(screen.getByTestId('story-touch-layer'));
    expect(videoContexts.catVideoV1.play).toHaveBeenCalled();

    fireEvent.ended(screen.getByTestId('catVideoV1'));
    expect(videoContexts.catVideoV2.play).toHaveBeenCalled();
  });

  it('pauses inactive videos before starting the requested story segment', () => {
    render(<Home />);
    resetVideoContextMocks();

    fireEvent.click(screen.getByTestId('story-touch-layer'));

    expect(videoContexts.catVideoV2.pause).toHaveBeenCalled();
    expect(videoContexts.catVideoV3.pause).toHaveBeenCalled();
    expect(videoContexts.catVideoV4.pause).toHaveBeenCalled();
    expect(videoContexts.catVideoV1.seek).toHaveBeenCalledWith(0);
    expect(videoContexts.catVideoV1.play).toHaveBeenCalled();
  });

  it('ignores stale ended events from hidden story videos', () => {
    render(<Home />);
    resetVideoContextMocks();

    fireEvent.ended(screen.getByTestId('catVideoV2'));
    fireEvent.ended(screen.getByTestId('catVideoV3'));
    fireEvent.ended(screen.getByTestId('catVideoV4'));

    expect(videoContexts.catVideoV2.play).not.toHaveBeenCalled();
    expect(videoContexts.catVideoV3.play).not.toHaveBeenCalled();
    expect(videoContexts.catVideoV4.play).not.toHaveBeenCalled();
    expect(videoContexts.catVideoV1.seek).not.toHaveBeenCalled();
  });

  it('ignores preload errors from inactive story videos', () => {
    render(<Home />);

    fireEvent.error(screen.getByTestId('catVideoV3'));

    expect(screen.queryByText('视频暂时无法播放')).toBeNull();
  });

  it('keeps the story video mounted behind the active error overlay for retry', () => {
    render(<Home />);

    fireEvent.error(screen.getByTestId('catVideoV1'));

    expect(screen.getByText('视频暂时无法播放')).toBeTruthy();
    expect(screen.getByTestId('catVideoV1')).toBeTruthy();
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
    fireEvent.ended(screen.getByTestId('catVideoV1'));

    expect(videoContexts.catVideoV1.play).toHaveBeenCalledTimes(1);
    expect(screen.getByText('剧情流暂未完成')).toBeTruthy();
  });
});
