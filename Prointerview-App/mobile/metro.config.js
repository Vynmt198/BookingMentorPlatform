const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Windows + Metro FallbackWatcher: skip ephemeral Gradle/Kotlin caches under
// node_modules that can vanish mid-watch and crash with ENOENT.
config.resolver.blockList = [
  /node_modules[/\\].*[/\\]android[/\\].*[/\\]build[/\\].*/,
  /node_modules[/\\].*[/\\]\.gradle[/\\].*/,
  /[/\\]android[/\\]\.gradle[/\\].*/,
  /[/\\]android[/\\]build[/\\].*/,
];

module.exports = config;
