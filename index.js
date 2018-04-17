"use strict";

const ParserHelpers = require("webpack/lib/ParserHelpers");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const NullFactory = require("webpack/lib/NullFactory");
const RawModule = require("webpack/lib/RawModule");

const runtimeParametersModule = '__webpack_runtime_parameters__'
const runtimeVariable = `window[${JSON.stringify(runtimeParametersModule)}]`;

class RuntimeParameterDependency extends ConstDependency {
    constructor(expression, range, parameter) {
        super();
        this.expression = expression;
        this.range = range;
        this.requireWebpackRequire = true;
        this.parameter = parameter;
    }
}

class RuntimeParameterPlugin {
    /**
     * 
     * @param {{[key:string]: {isKeySet: boolean}}} definitions 
     */
    constructor(definitions) {
        this.definitions = definitions;
    }

    apply(compiler) {
        const definitions = this.definitions;

        const handleCompilation = (compilation, { normalModuleFactory }) => {
            compilation.dependencyFactories.set(RuntimeParameterDependency, new NullFactory());
            compilation.dependencyTemplates.set(RuntimeParameterDependency, new ConstDependency.Template());

            const handler = (parser, parserOptions) => {
                definitions.forEach(d => {
                    const name = typeof d === 'string' ? d : d.name;
                    const isKeySet = !!d.isKeySet;

                    const processExpression = expr => {
                        let parameterName;
                        if (isKeySet) {
                            switch (expr.property.type) {
                                case "Identifier":
                                    parameterName = `${name}.${expr.property.name}`;
                                    break;
                                case "Literal":
                                    parameterName = `${name}.${expr.property.value}`;
                                    break;
                                default:
                                    return false;
                            }
                        } else {
                            parameterName = expr.name;
                        }

                        const nameIdentifier = `__webpack_runtime_parameter_${parameterName.replace(/\./g, "_dot_")}`;
                        const expression = `require('${runtimeParametersModule}')[${JSON.stringify(parameterName)}]`;

                        if (!ParserHelpers.addParsedVariableToModule(parser, nameIdentifier, expression)) {
                            return false;
                        }

                        var dep = new RuntimeParameterDependency(nameIdentifier, expr.range, parameterName);
                        dep.loc = expr.loc;
                        parser.state.current.addDependency(dep);

                        return true;
                    };

                    if (parser.hooks) {
                        if (isKeySet) {
                            parser.hooks.expressionAnyMember.for(name).tap("RuntimeParameterPlugin", processExpression);
                        } else {
                            parser.hooks.expression.for(name).tap("RuntimeParameterPlugin", processExpression);
                        }
                    } else {
                        if (isKeySet) {
                            parser.plugin(`expression ${name}.*`, processExpression);
                        } else {
                            parser.plugin(`expression ${name}`, processExpression);
                        }
                    }
                });
            };

            if (normalModuleFactory.hooks) {
                normalModuleFactory.hooks.parser
                    .for("javascript/auto")
                    .tap("RuntimeParameterPlugin", handler);
                normalModuleFactory.hooks.parser
                    .for("javascript/dynamic")
                    .tap("RuntimeParameterPlugin", handler);
                normalModuleFactory.hooks.parser
                    .for("javascript/esm")
                    .tap("RuntimeParameterPlugin", handler);
            } else {
                normalModuleFactory.plugin('parser', handler);
            }

            const addParametersToRuntimeChunks = () => {
                const runtimeParameters = {};

                compilation.modules.forEach(module => {
                    module.dependencies.forEach(d => {
                        if (!(d instanceof RuntimeParameterDependency)) {
                            return;
                        }
                        const readableIdentifier = module.readableIdentifier(compilation.requestShortener || compilation.moduleTemplate.requestShortener);

                        const usage = runtimeParameters[d.parameter] = runtimeParameters[d.parameter] || [];
                        if (usage.indexOf(readableIdentifier) === -1) {
                            usage.push(readableIdentifier);
                            usage.sort();
                        }
                    });
                });

                compilation.chunks.forEach(chunk => {
                    compilation;
                    if (chunk.hasRuntime()) {
                        chunk.runtimeParameters = runtimeParameters;
                    }
                });
            };

            if (compilation.hooks) {
                compilation.hooks.afterOptimizeChunks.tap('RuntimeParameterPlugin', addParametersToRuntimeChunks);
            } else {
                compilation.plugin('after-optimize-chunks', addParametersToRuntimeChunks);
            }

            this.resolveRuntimeParametersModule(normalModuleFactory);
        };

        if (compiler.hooks) {
            compiler.hooks.compilation.tap("RuntimeParameterPlugin", handleCompilation);
        } else {
            compiler.plugin('compilation', handleCompilation);
        }
    }

    resolveRuntimeParametersModule(normalModuleFactory) {
        const handleResolver = resolver => (data, callback) => {
            if (data.request !== runtimeParametersModule) {
                return resolver(data, callback);
            }

            const contextInfo = data.contextInfo;
            const context = data.context;
            const request = data.request;

            callback(null,
                new RawModule(
                    `module.exports = ${runtimeVariable}`,
                    `${context} ${request}`,
                    `${request}`
                )
            );
        };

        if (normalModuleFactory.hooks) {
            normalModuleFactory.hooks.resolver.tap('RuntimeParameterPlugin', handleResolver);
        } else {
            normalModuleFactory.plugin('resolver', handleResolver);
        }
    }
}

RuntimeParameterPlugin.htmlWebpackPluginTemplateParameters = (compilation, assets, options) => {
    compilation.chunks.forEach(chunk => {
        const runtimeParameters = chunk.runtimeParameters;
        if (!runtimeParameters) {
            return;
        }

        const asset = assets.chunks[chunk.name];
        if (!asset) {
            return;
        }

        if (runtimeParameters) {
            asset.runtimeParameters = {
                parameters: runtimeParameters,
                variable: runtimeVariable
            };
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
};

module.exports = RuntimeParameterPlugin;
