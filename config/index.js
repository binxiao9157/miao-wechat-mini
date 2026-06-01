const path = require('path');

const DEFAULT_API_BASE_URL = 'https://www.mmdd10.tech';

const config = {
  projectName: 'miao-wechat-mini',
  framework: 'react',
  compiler: {
    type: 'webpack5',
  },
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
  plugins: [path.resolve(__dirname, '..', 'scripts', 'taro-plugin-share-timeline.js')],
  defineConstants: {
    'process.env.TARO_APP_API_BASE_URL': JSON.stringify(
      process.env.TARO_APP_API_BASE_URL || DEFAULT_API_BASE_URL
    ),
    'process.env.TARO_APP_AI_PROVIDER': JSON.stringify(
      process.env.TARO_APP_AI_PROVIDER || 'volcengine'
    ),
    'process.env.TARO_APP_AI_PROFILE_VERSION': JSON.stringify(
      process.env.TARO_APP_AI_PROFILE_VERSION || 'release-volcengine-default-20260531'
    ),
    'process.env.TARO_APP_ENABLE_ADMIN': JSON.stringify(
      process.env.TARO_APP_ENABLE_ADMIN || 'false'
    ),
    'process.env.TARO_APP_DEBUG_BUILD': JSON.stringify(
      process.env.TARO_APP_DEBUG_BUILD || 'false'
    ),
  },
  mini: {},
  h5: {
    devServer: {
      port: 10086
    },
    webpackChain: (chain) => {
      chain.merge({
        ignoreWarnings: [
          {
            module: /@tarojs[\\/]components[\\/]dist[\\/]components[\\/]taro-video-core\.js/,
            message: /webpackExports/,
          },
        ],
        performance: {
          maxAssetSize: 1024 * 1024,
          maxEntrypointSize: 1024 * 1024,
        },
      });
    }
  },
  alias: {
    '@': path.resolve(__dirname, '../src/')
  }
};

module.exports = config;
