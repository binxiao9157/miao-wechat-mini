import React, { Component, ReactNode } from 'react';
import { useLaunch, eventCenter } from '@tarojs/taro';
import { AuthProvider } from './context/AuthContext';
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
  });

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export default App;