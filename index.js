"use strict";

const ParserHelpers = require("webpack/lib/ParserHelpers");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const NullFactory = require("webpack/lib/NullFactory");
const Template = require('webpack/lib/Template');

const runtimeParametersExtensionKey = 'rp';
const buildMetaKey = 'runtimeParameters';

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

        const doStuff = (compilation, { normalModuleFactory }) => {
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
                        const expression = `__webpack_require__.${runtimeParametersExtensionKey}[${JSON.stringify(parameterName)}]`;

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

            const addParametersToEntryModulesMeta = () => {
                const parametersPerEntry = {};

                compilation.modules.forEach(module => {
                    const definedParameters = [];

                    module.dependencies.forEach(d => {
                        if (!(d instanceof RuntimeParameterDependency)) {
                            return;
                        }
                        const readableIdentifier = module.readableIdentifier(compilation.requestShortener || compilation.moduleTemplate.requestShortener);

                        definedParameters.push({
                            parameter: d.parameter,
                            usage: `${readableIdentifier}:${d.loc.start.line}:${d.loc.start.column}`
                        });
                    });

                    if (!definedParameters.length) {
                        return;
                    }

                    for (const entryModule of getEntriesForModule(module)) {
                        const parameters = parametersPerEntry[entryModule] = parametersPerEntry[entryModule] || {};

                        for (const x of definedParameters) {
                            const parameter = parameters[x.parameter] =
                                parameters[x.parameter] || { usage: [] };

                            parameter.usage.push(x.usage);
                        }
                    }
                });

                compilation.entries.forEach(entryModule => {
                    const parameters = parametersPerEntry[entryModule];
                    const buildMeta = entryModule.buildMeta || entryModule.meta;

                    if (parameters) {
                        Object.keys(parameters).forEach(n => parameters[n].usage.sort());
                        buildMeta[buildMetaKey] = { parameters };
                    } else {
                        buildMeta[buildMetaKey] = undefined;
                    }
                });
            };

            if (compilation.hooks) {
                compilation.hooks.afterOptimizeChunks.tap('RuntimeParameterPlugin', addParametersToEntryModulesMeta);
            } else {
                compilation.plugin('after-optimize-chunks', addParametersToEntryModulesMeta);
            }

            const extendWebpackRuntimeToSummply = (source, chunk, hash) => {
                if (!chunk.entryModule) {
                    return "";
                }

                const buildMeta = chunk.entryModule.buildMeta || chunk.entryModule.meta;

                const runtimeParameters = buildMeta[buildMetaKey];
                if (!runtimeParameters) {
                    return "";
                }

                const buf = [];
                var globalObject = compilation.mainTemplate.outputOptions.globalObject || 'window';
                var ns = `webpackRuntimeParameters_${chunk.name}`;
                var runtimeParametersVar = `${globalObject}[${JSON.stringify(ns)}] = ${globalObject}[${JSON.stringify(ns)}] || {};`;
                buildMeta.runtimeParameters.variable = `${globalObject}[${JSON.stringify(ns)}]`;

                buf.push("// Load runtime parameters from global");
                buf.push(`${compilation.mainTemplate.requireFn}.${runtimeParametersExtensionKey} = ${runtimeParametersVar}`);
                buf.push("");
                return (Template.asString || compilation.mainTemplate.asString)(buf);
            };

            if (compilation.mainTemplate.hooks) {
                compilation.mainTemplate.hooks.beforeStartup.tap('RuntimeParameterPlugin', extendWebpackRuntimeToSummply);
            } else {
                compilation.mainTemplate.plugin('require-extensions', extendWebpackRuntimeToSummply);
            }
        };

        if (compiler.hooks) {
            // webpack 4
            compiler.hooks.compilation.tap("RuntimeParameterPlugin", doStuff);
        } else {
            //
            compiler.plugin('compilation', doStuff);
        }
    }
}

function* getEntriesForModule(module) {
    if (module.chunksIterable) {
        for (const chunk of module.chunksIterable) {
            yield* getEntryModuleForChunk(chunk)
        }
    } else {
        // webpack 3
        for (const chunk of module.chunks) {
            yield* getEntryModuleForChunk(chunk)
        }
    }
}

function* getEntryModuleForChunk(chunk) {
    if (chunk.entryModule) {
        yield chunk.entryModule;
        return;
    }

    if (chunk.groupsIterable) {
        // webpack 4
        for (const group of chunk.groupsIterable) {
            const entries = getEntryPointsForGroup(group);
            for (const entryPoint of entries) {
                yield entryPoint.runtimeChunk.entryModule;
            }
        }
    } else if (chunk.parents && chunk.parents.length) {
        // webpack 3
        for (const parent of chunk.parents) {
            yield* getEntryModuleForChunk(parent);
        }
    }
}

function* getEntryPointsForGroup(group) {
    if (group.isInitial()) {
        yield group;
        return;
    }

    for (const parent of group.parentsIterable) {
        yield* getEntryPointsForGroup(parent);
    }
};

function sortByLocale(a, b) {
    return a.localCompare(b);
};

module.exports = RuntimeParameterPlugin;
