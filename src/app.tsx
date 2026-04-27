import { Component, ReactNode } from 'react';
import { useLaunch } from '@tarojs/taro';
import { AuthProvider } from './context/AuthContext';
import './app.less';

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