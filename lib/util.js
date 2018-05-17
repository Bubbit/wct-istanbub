const path = require('path');
const fs = require('fs');
/**
 * Taken from: https://github.com/Polymer/web-component-tester/blob/master/runner/config.ts
 * config helper: A basic function to synchronously read JSON,
 * log any errors, and return null if no file or invalid JSON
 * was found.
 */
function readJsonSync(filename, dir) {
  const configPath = path.resolve(dir || '', filename);
  let config;
  try {
    config = fs.readFileSync(configPath, 'utf-8');
  } catch (e) {
    return null;
  }
  try {
    return JSON.parse(config);
  } catch (e) {
    console.error(`Could not parse ${configPath} as JSON`);
    console.error(e);
  }
  return null;
}

/**
 * Taken from: https://github.com/Polymer/web-component-tester/blob/master/runner/config.ts
 * Determines the package name by reading from the following sources:
 *
 * 1. `options.packageName`
 * 2. bower.json or package.json, depending on options.npm
 */
function getPackageName(options) {
  if (options.packageName) {
    return options.packageName;
  }
  const manifestName = (options.npm ? 'package.json' : 'bower.json');
  const manifest = readJsonSync(manifestName, options.root);
  if (manifest !== null) {
    return manifest.name;
  }
  const basename = path.basename(options.root || process.cwd());
  console.warn(
    `no ${manifestName} found, defaulting to packageName=${basename}`);
  return basename;
}

module.exports = {
  readJsonSync,
  getPackageName
}