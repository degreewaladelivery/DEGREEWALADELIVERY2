const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
// The shared/ folder (design tokens, types, mock data) lives one level up,
// outside this app's root — Metro needs to be told to watch it and how to
// resolve the `@shared/*` imports that point into it.
const sharedRoot = path.resolve(projectRoot, '../shared');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// `@shared/*` imports are rewritten to relative paths at compile time by
// babel-plugin-module-resolver (see babel.config.js); Metro just needs to
// know to watch and serve files from this folder too.
const config = {
  watchFolders: [sharedRoot],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
