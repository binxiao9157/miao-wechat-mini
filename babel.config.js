module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        chrome: 49,
        ios: 9
      }
    }],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ]
};