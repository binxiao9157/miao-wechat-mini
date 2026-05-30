import React, { ReactNode } from 'react';
import Taro, { useLaunch } from '@tarojs/taro';
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

async function runForegroundSync() {
  try {
    await syncQueue.flushNow();
    await syncManager.syncAll();
  } catch (error) {
    console.warn('[App] foreground sync failed:', error);
  }
}

function ensureForegroundSyncListeners() {
  const globalState = globalThis as any;
  if (globalState.__miaoForegroundSyncListenersRegistered) return;
  globalState.__miaoForegroundSyncListenersRegistered = true;

  Taro.onAppShow(runForegroundSync);

  if (typeof document !== 'undefined') {
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        runForegroundSync();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    globalState.__miaoForegroundVisibilityHandler = visibilityHandler;
  }
}

function App({ children }: AppProps) {
  useLaunch(() => {
    console.log('App launched.');
    ensureForegroundSyncListeners();
  });

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export default App;
