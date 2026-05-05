import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';

export interface NavSpaceStyle {
  '--nav-top': string;
  '--nav-height': string;
  '--nav-side': string;
  '--nav-capsule-top': string;
  [key: string]: string;
}

export function useNavSpace(): NavSpaceStyle {
  const [navStyle, setNavStyle] = useState<NavSpaceStyle>({
    '--nav-top': '0px',
    '--nav-height': '32px',
    '--nav-side': '21px',
    '--nav-capsule-top': '0px',
  });

  useEffect(() => {
    try {
      const systemInfo = Taro.getSystemInfoSync();
      const capsule = Taro.getMenuButtonBoundingClientRect();
      const windowWidth = systemInfo.windowWidth || 375;
      const statusBarHeight = systemInfo.statusBarHeight || 0;
      const capsuleTop = capsule?.top || statusBarHeight + 6;
      const capsuleHeight = capsule?.height || 32;

      setNavStyle({
        '--nav-top': `${capsuleTop + capsuleHeight + 8}px`,
        '--nav-height': `${capsuleHeight}px`,
        '--nav-side': `${Math.max(21, windowWidth - (capsule?.right || windowWidth) + 21)}px`,
        '--nav-capsule-top': `${capsuleTop}px`,
      });
    } catch {
      // fallback defaults already set
    }
  }, []);

  return navStyle;
}