const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin')

// ensure running the latest version of RuntimeParameterPlugin
require('../util/copy')(__dirname);

const RuntimeParameterPlugin = require('runtime-parameter-plugin');

/**
 * @return {webpack.Configuration}
 */
module.exports = {
    entry: './index.js',
    output: {
      path: __dirname + '/dist',
      filename: 'index_bundle.js'
    },
    devtool: false,
    plugins: [
      new RuntimeParameterPlugin([
          'RuntimeVariable_1',
          { name: 'RuntimeVariable_2', isKeySet: false },
          { name: 'RuntimeVariableSet', isKeySet: true }
      ]),
      new HtmlWebpackPlugin({
        template: './index.ejs',
        inject: false,
        templateParameters: RuntimeParameterPlugin.htmlWebpackPluginTemplateParameters
      })
    ]
};