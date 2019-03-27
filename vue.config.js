const webpack = require('webpack')
const path = require('path');
const resolve = (dir) => path.join(__dirname, '.', dir);
module.exports = {
  publicPath: './',
  chainWebpack: config => {

    config.module.rule('svg').exclude.add(resolve('src/icons/svg')).end();
    config.module.rule('svg-sprite-loader')
      .test(/\.svg$/)
      .include
      .add(resolve('src/icons/svg'))
      .end()
      .use('svg-sprite')
      .loader('svg-sprite-loader')
      .options({ symbolId: 'icon-[name]' });
    return config;
  }
}