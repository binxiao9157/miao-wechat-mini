import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';
import SwitchCompanion from './index';
import { storage } from '../../services/storage';

const cats = [
  {
    id: 'cat-1',
    name: 'Miao',
    breed: '狸花',
    color: 'brown',
    avatar: 'https://cdn.example.com/cat-1.png',
    source: 'uploaded' as const,
  },
  {
    id: 'cat-2',
    name: 'Mimi',
    breed: '橘猫',
    color: 'orange',
    avatar: 'https://cdn.example.com/cat-2.png',
    source: 'created' as const,
  },
];

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
  };
});

vi.mock('@tarojs/taro', () => ({
  default: {
    showModal: vi.fn(),
  },
  useDidShow: vi.fn(),
}));

vi.mock('../../components/common/CatAvatar', () => ({
  default: ({ src, name, className }: any) => <img src={src} alt={name} className={className} />,
}));

vi.mock('../../components/layout/PageHeader', () => ({
  default: ({ title, rightElement }: any) => (
    <div>
      <span>{title}</span>
      {rightElement}
    </div>
  ),
}));

vi.mock('../../utils/navigateAdapter', () => ({
  reLaunch: vi.fn(),
}));

vi.mock('../../services/storage', () => ({
  storage: {
    getCatList: vi.fn(() => cats),
    getActiveCatId: vi.fn(() => 'cat-1'),
    getPoints: vi.fn(() => ({ total: 300 })),
    getUnlockThreshold: vi.fn(() => 200),
    syncCatsFromServer: vi.fn(async () => undefined),
    setActiveCatId: vi.fn(),
    deleteCatById: vi.fn(() => [cats[1]]),
  },
}));

describe('SwitchCompanion deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Taro.showModal).mockImplementation(({ success }: any) => {
      success?.({ confirm: true });
      return Promise.resolve({ confirm: true } as any);
    });
  });

  it('uses the native confirmation dialog before deleting a cat', async () => {
    const { container } = render(<SwitchCompanion />);

    const deleteButton = container.querySelector('.cat-card .delete-btn') as HTMLElement;
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(Taro.showModal).toHaveBeenCalledWith(expect.objectContaining({
        title: '确认告别',
        confirmText: '确认告别',
      }));
    });
    expect(storage.deleteCatById).toHaveBeenCalledWith('cat-1');
  });
});
