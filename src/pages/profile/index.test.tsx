import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentUser: any = null;

vi.mock('@tarojs/components', async () => {
  const React = await import('react');
  const toDomProps = (props: Record<string, any>) => {
    const { className, children, onClick, scrollY, showScrollbar, ...rest } = props;
    return { className, children, onClick, ...rest };
  };
  return {
    View: (props: any) => React.createElement('div', toDomProps(props)),
    Text: (props: any) => React.createElement('span', toDomProps(props)),
    Image: ({ src, className, onClick }: any) => React.createElement('img', { src, className, onClick, alt: '' }),
    ScrollView: (props: any) => React.createElement('div', toDomProps(props)),
  };
});

vi.mock('@tarojs/taro', () => ({
  default: {
    showShareMenu: vi.fn(),
    showModal: vi.fn(),
    showToast: vi.fn(),
    scanCode: vi.fn(),
    vibrateShort: vi.fn(async () => undefined),
    eventCenter: {
      trigger: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  },
  useDidShow: vi.fn(),
  useShareAppMessage: vi.fn(),
  useShareTimeline: vi.fn(),
}));

vi.mock('../../hooks/useNavSpace', () => ({
  useNavSpace: () => ({
    '--nav-top': '120rpx',
    '--nav-height': '88rpx',
    '--nav-capsule-top': '24rpx',
    '--nav-side': '42rpx',
  }),
}));

vi.mock('../../services/storage', () => ({
  storage: {
    getUserInfo: vi.fn(() => currentUser),
    getActiveCat: vi.fn(() => null),
    getDiaries: vi.fn(() => []),
    getReadNotificationIds: vi.fn(() => []),
    getIsFastForward: vi.fn(() => false),
    getTimeLetters: vi.fn(() => []),
    getPoints: vi.fn(() => ({ history: [] })),
    getCustomNotifications: vi.fn(() => []),
    clearCurrentUser: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('../../utils/httpAdapter', () => ({
  request: vi.fn(async () => ({ data: [] })),
}));

vi.mock('../../services/friendService', () => ({
  friendService: {
    extractInviteCode: vi.fn(),
    getInvite: vi.fn(),
    acceptInvite: vi.fn(),
  },
}));

vi.mock('../../utils/navigateAdapter', () => ({
  navigateTo: vi.fn(async () => undefined),
  reLaunch: vi.fn(async () => undefined),
  switchTab: vi.fn(async () => undefined),
}));

vi.mock('../../utils/privacyAuthorization', () => ({
  ensurePrivacyAuthorized: vi.fn(async () => true),
}));

import Profile from './index';
import Taro from '@tarojs/taro';
import { storage } from '../../services/storage';
import { reLaunch } from '../../utils/navigateAdapter';

describe('Profile logout action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = null;
  });

  it('still clears local auth and returns to login when guest taps logout', async () => {
    render(<Profile />);

    fireEvent.click(screen.getByText('退出登录'));

    expect(storage.clearCurrentUser).toHaveBeenCalled();
    await waitFor(() => expect(reLaunch).toHaveBeenCalledWith('/pages/login/index'));
  });

  it('uses a native confirmation dialog before logging out an authenticated user', async () => {
    currentUser = { username: 'alice', nickname: 'Alice', avatar: '' };
    vi.mocked(Taro.showModal).mockImplementation(({ success }: any) => {
      success?.({ confirm: true });
      return Promise.resolve({ confirm: true, cancel: false, errMsg: 'showModal:ok' } as any);
    });

    render(<Profile />);

    fireEvent.click(screen.getByText('退出登录'));

    expect(Taro.showModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '退出登录？',
      content: '确定要退出登录吗？',
      confirmText: '确定退出',
    }));
    expect(storage.clearCurrentUser).toHaveBeenCalled();
    await waitFor(() => expect(reLaunch).toHaveBeenCalledWith('/pages/login/index'));
  });
});
