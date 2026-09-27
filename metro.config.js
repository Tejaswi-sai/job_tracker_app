// This file exists specifically because the Firebase JS SDK ships some
// files as .cjs, which Metro doesn't resolve by default. Per Expo's own
// "Using Firebase" guide, adding 'cjs' to sourceExts fixes bundling.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');

module.exports = config;

