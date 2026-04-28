module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        chrome: 49,
        ios: 9
      }
    }],
    ['@babel/preset-react', {
      runtime: 'classic'
    }],
    '@babel/preset-typescript'
  ]
};