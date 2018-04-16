const path = require('path')
const fs = require('fs')


module.exports = function copyPluginToNodeModules(destinationFolder) {

    const packageFolder = path.resolve(destinationFolder, 'node_modules', 'runtime-parameter-plugin');

    if (!fs.existsSync(packageFolder)) {
        fs.mkdirSync(packageFolder);
    }

    fs.copyFileSync(path.resolve(__dirname, '../../package.json'), path.resolve(packageFolder, 'package.json'));
    fs.copyFileSync('../../index.js', path.resolve(packageFolder, 'index.js'));
}
