const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')

const RuntimeParameterWebpackPlugin = require('runtime-parameter-webpack-plugin');

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
            main: './src/index.ts',
            'another-entry': './src/another-entry.ts'
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
            new RuntimeParameterWebpackPlugin({
                'Features': path.resolve(__dirname, 'src', 'runtime-features-provider')
            }),
            new HtmlWebpackPlugin({
                filename: 'HtmlHelpers.cshtml',
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
