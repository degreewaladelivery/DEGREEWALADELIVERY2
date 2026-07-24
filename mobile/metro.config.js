const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;

const sharedRoot = path.resolve(projectRoot, '../shared');

const config = {
  watchFolders: [sharedRoot],
  resolver: {
    extraNodeModules: new Proxy(
      {},
      {
        get: (_target, name) => path.join(projectRoot, 'node_modules', name),
      }
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
