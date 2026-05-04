import React, { Component, ReactNode } from 'react';
import Taro, { useLaunch, eventCenter } from '@tarojs/taro';
import { AuthProvider } from './context/AuthContext';
import { syncManager } from './services/syncManager';
import { syncQueue } from './services/syncQueue';
import './app.less';

if (typeof global !== 'undefined') {
  (global as any).React = React;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).React = React;
}

interface AppProps {
  children?: ReactNode;
}

function App({ children }: AppProps) {
  useLaunch(() => {
    console.log('App launched.');
    Taro.onAppShow(async () => {
      await syncQueue.flushNow();
      syncManager.syncAll();
    });
    // PWA: 监听页面切回前台时同步数据
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          syncQueue.flushNow().then(() => {
            syncManager.syncAll();
          });
        }
      });
    }
  });

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export default App;