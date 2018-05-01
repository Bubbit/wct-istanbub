var _ = require('lodash');
var minimatch = require('minimatch');
var fs = require('fs');
var path = require('path');
var istanbul = require('istanbub');
var parseurl = require('parseurl');
var scriptHook = require('html-script-hook');

// istanbul
var instrumenter = new istanbul.Instrumenter({
  coverageVariable: "WCT.share.__coverage__"
});

// helpers
var cache = {};


function instrumentHtml(htmlFilePath, req){
  var asset = req.url;
  var code;

  if(fs.existsSync(htmlFilePath)) {
    if ( !cache[asset]){
      html = fs.readFileSync(htmlFilePath, 'utf8');
      cache[asset] = scriptHook (html, {scriptCallback: gotScript});
    }

    function gotScript(code, loc) {
      return instrumenter.instrumentSync(code, htmlFilePath);
    }

    return cache[asset];
  } else {
    return '';
  }
}

function instrumentAsset(assetPath, req){
    var asset = req.url;
    var code;

    if ( !cache[asset] ){
        code = fs.readFileSync(assetPath, 'utf8');

        // NOTE: the instrumenter must get a file system path not a wct-webserver path.
        // If given a webserver path it will still generate coverage, but some reporters
        // will error, siting that files were not found
        // (thedeeno)
        cache[asset] = instrumenter.instrumentSync(code, assetPath);
    }

    return cache[asset];
}

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

/**
 * Middleware that serves an instrumented asset based on user
 * configuration of coverage
 */
function coverageMiddleware(root, options, emitter) {
  const basename = getPackageName(options);
  const basepath = emitter.options.clientOptions.root + basename + '/';

  return function(req, res, next) {
    var absolutePath = req.url.replace(/^\/[^/]+\/[^/]+/, root);

    // always ignore platform files in addition to user's blacklist
    var blacklist = ['/web-component-tester/*'];
    if(options.exclude) {
      blacklist = blacklist.concat(options.exclude);
    } else {
      blacklist = blacklist.concat(['**/test/**']);
    }
    var whitelist = options.include.map(x => basepath + x);

    // cache the webserver root for user supplied instrumenter
    this.root = root;
    // check asset against rules
    var process = match(req.url, whitelist) && !match(req.url, blacklist);

    // instrument unfiltered assets
    if ( process ) {
      emitter.emit('log:debug', 'coverage', 'instrument', req.url);

      if (absolutePath.match(/\.htm(l)?$/)) {
        var html = instrumentHtml(absolutePath, req);
        return res.send( html );
      }

      return res.send( instrumentAsset(absolutePath, req) );
    } else {
      emitter.emit('log:debug', 'coverage', 'skip      ', req.url);
      return next();
    }
  };
}

/**
 * Clears the instrumented code cache
 */
function cacheClear() {
  cache = {};
}

/**
 * Returns true if the supplied string mini-matches any of the supplied patterns
 */
function match(str, rules) {
    return _.some(rules, minimatch.bind(null, str));
}

module.exports = {
  middleware: coverageMiddleware,
  cacheClear: cacheClear
};
