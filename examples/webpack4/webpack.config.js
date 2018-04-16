const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')

// ensure running the latest version of RuntimeParameterPlugin
require('../util/copy')(__dirname);

const RuntimeParameterPlugin = require('runtime-parameter-plugin');

/**
 * @return {webpack.Configuration}
 */
module.exports = function () {
    return {
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: '/dist/',
            filename: '[name].webpack.js',
            chunkFilename: '[name].webpack.js?v=[chunkhash]',
        },
        entry: {
            main: '../src/index.ts',
            'another-entry': '../src/another-entry.ts'
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        devtool: false,
        optimization: {
            splitChunks: {
                chunks: 'initial'
            }
        },
        plugins: [
            new RuntimeParameterPlugin([
                'SimpleVar',
                { name: 'Features', isKeySet: true }
            ]),
            new HtmlWebpackPlugin({
                filename: 'output.json',
                template: path.resolve('../util/output-template.ejs'),
                inject: false,
                templateParameters: (compilation, assets, options) => {
                    compilation.chunks.forEach(chunk => {
                        if (!chunk.hasEntryModule()) {
                            return;
                        }

                        const asset = assets.chunks[chunk.name];
                        if (!asset) {
                            return;
                        }

                        const buildMeta = chunk.entryModule.buildMeta || chunk.entryModule.meta;
                        const runtimeParameters = buildMeta.runtimeParameters;
                        if (runtimeParameters) {
                            asset.runtimeParameters = runtimeParameters;
                        }
                    });

                    return {
                        compilation: compilation,
                        webpack: compilation.getStats().toJson(),
                        webpackConfig: compilation.options,
                        htmlWebpackPlugin: {
                            files: assets,
                            options: options
                        }
                    };
                }
            })
        ]
    };
}
