const path = require('path');

const config = {
  projectName: 'miao-wechat-mini',
  date: '2024-1-1',
  designWidth: 375,
  deviceRatio: {
    375: 2 / 1,
    640: 2 / 1,
    750: 1,
    828: 1
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  defineConstants: {
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          selectorBlackList: ['miao-', 'nut-']
        }
      },
      url: {
        enable: true,
        config: {
          limit: 1024 * 10 // 10kb
        }
      },
      cssModules: {
        enable: false,
        config: {
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    },
    webpackChain: (chain) => {
      // 添加别名
      chain.resolve.alias.set('@', path.resolve(__dirname, 'src'));
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {
          targets: ['last 2 versions', 'not dead']
        }
      },
      pxtransform: {
        enable: true,
        config: {
          selectorBlackList: ['miao-', 'nut-']
        }
      }
    },
    webpackChain: (chain) => {
      chain.resolve.alias.set('@', path.resolve(__dirname, 'src'));
    }
  },
  alias: {
    '@/': path.resolve(__dirname, 'src/')
  }
};

module.exports = (merge) => {
  if (process.env.TARO_ENV === 'weapp') {
    return merge({}, config, require('./weapp.config.js'));
  }
  return merge({}, config, require('./h5.config.js'));
};