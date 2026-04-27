import { useLaunch } from '@tarojs/taro';
import './app.less';

function App({ children }: any) {
  useLaunch(() => {
    console.log('App launched.');
  });

  return children;
}

export default App;