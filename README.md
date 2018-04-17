
<div align="center">
  <h1>Runtime Parameter Plugin</h1>
  <p>Plugin that allows passing parameters to JS bundles at runtime</p>
</div>

<h2 align="center">Install</h2>

```bash
  npm i --save-dev runtime-parameter-plugin
```

```bash
  yarn add --dev runtime-parameter-plugin
```

<h2 align="center">Usage</h2>



**webpack.config.js**
```js
const RuntimeParameterPlugin = require('runtime-parameter-plugin')

module.exports = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'index_bundle.js'
  },
  plugins: [
    new RuntimeParameterPlugin([
        'RuntimeVariable_1',
        { name: 'RuntimeVariable_2', isKeySet: false }
        { name: 'RuntimeVariableSet', isKeySet: true }
    ])
  ]
}
```

**index.js**
```js

if (RuntimeVariable_1 === 'a') {
    console.log('RuntimeVariable_1 is a');
}

if (RuntimeVariable_2 === 'b') {
    console.log('RuntimeVariable_2 is b');
}

if (RuntimeVariableSet.Value1 === 'c') {
    console.log('RuntimeVariableSet.Value1 is c');
}

if (RuntimeVariableSet.Value2 === 'd') {
    console.log('RuntimeVariableSet.Value2 is d');
}

```

**index_bundle.js**
```js
// ... webpack runtime ...


/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(__webpack_runtime_parameter_RuntimeVariable_1, __webpack_runtime_parameter_RuntimeVariable_2, __webpack_runtime_parameter_RuntimeVariableSet_dot_Value1, __webpack_runtime_parameter_RuntimeVariableSet_dot_Value2) {if (__webpack_runtime_parameter_RuntimeVariable_1 === 'a') {
    console.log('RuntimeVariable_1 is a');
}

if (__webpack_runtime_parameter_RuntimeVariable_2 === 'b') {
    console.log('RuntimeVariable_2 is b');
}

if (__webpack_runtime_parameter_RuntimeVariableSet_dot_Value1 === 'c') {
    console.log('RuntimeVariableSet.Value1 is c');
}

if (__webpack_runtime_parameter_RuntimeVariableSet_dot_Value2 === 'd') {
    console.log('RuntimeVariableSet.Value2 is d');
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! __webpack_runtime_parameters__ */ 0)["RuntimeVariable_1"], __webpack_require__(/*! __webpack_runtime_parameters__ */ 0)["RuntimeVariable_2"], __webpack_require__(/*! __webpack_runtime_parameters__ */ 0)["RuntimeVariableSet.Value1"], __webpack_require__(/*! __webpack_runtime_parameters__ */ 0)["RuntimeVariableSet.Value2"]))

/***/ }),

/***/ 0:
/*!**************************************!*\
  !*** __webpack_runtime_parameters__ ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = window["__webpack_runtime_parameters__"]

/***/ })

/******/ });
```

Now, you can assign `window['__webpack_runtime_parameters__']` before loading the bundle to pass variables
```html

<script>
    window['__webpack_runtime_parameters__'] = {
        'RuntimeVariable_1': 'a',
        'RuntimeVariable_2': 'b',
        'RuntimeVariableSet.Value1': 'c',
        'RuntimeVariableSet.Value2': 'd',
    };
</script>
<script src="./index_bundle.js"></script>
```


### Integration with `html-webpack-plugin`

It is possible to return custom template parameters with `html-webpack-plugin`.
`RuntimeParameterPlugin` has `htmlWebpackPluginTemplateParameters` static method to use with `html-webpack-plugin`.
It returns the same parameters as `html-webpack-plugin` by default with adding `runtimeParameters` property to each chunk that has them:

```json
{
"htmlWebpackPlugin": {
  "files": {
    "css": [],
    "js": [
      "index_bundle.js"
    ],
    "chunks": {
      "main": {
        "entry": "index_bundle.js",
        "css": [],
        "runtimeParameters": {
          "parameters": {
            "RuntimeVariable_1": {
              "usage": [
                "./index.js"
              ]
            },
            "RuntimeVariable_2": {
              "usage": [
                "./index.js"
              ]
            },
            "RuntimeVariableSet.Value1": {
              "usage": [
                "./index.js"
              ]
            },
            "RuntimeVariableSet.Value2": {
              "usage": [
                "./index.js"
              ]
            }
          },
          "variable": "window[\"__webpack_runtime_parameters__\"]"
        }
      }
    }
  }
}
```

**webpack.config.js**
```js
const RuntimeParameterPlugin = require('runtime-parameter-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'index_bundle.js'
  },
  plugins: [
    new RuntimeParameterPlugin([
        'RuntimeVariable_1',
        { name: 'RuntimeVariable_2', isKeySet: false }
        { name: 'RuntimeVariableSet', isKeySet: true }
    ]),      
    new HtmlWebpackPlugin({
        template: './index.ejs',
        inject: false,
        templateParameters: RuntimeParameterPlugin.htmlWebpackPluginTemplateParameters
    })
  ]
}
```
