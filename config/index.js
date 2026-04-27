const path = require('path');

const config = {
  projectName: 'miao-wechat-mini',
  framework: 'react',
  date: '2024-1-1',
  designWidth: 375,
  deviceRatio: {
    375: 2,
    640: 2,
    750: 1,
    828: 1
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  mini: {},
  h5: {
    devServer: {
      port: 10086
    }
  },
  alias: {
    '@': path.resolve(__dirname, '../src/')
  }
};

module.exports = config;