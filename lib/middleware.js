const minimatch = require('minimatch');
const fs = require('fs');
const path = require('path');
const parseurl = require('parseurl');
const scriptHook = require('html-script-hook');
const polymerBuild = require('polymer-build');
const browserCapabilities = require('browser-capabilities');
const getCompileTarget = require('polyserve/lib/get-compile-target.js');
const instrumenterLib = require('./instrumenter');
const util = require('./util');

// istanbul
const instrumenter = new instrumenterLib(process.cwd(), {});

// helpers
let cache = {};

function transform(req, body, packageName, filePath, npm, root, componentUrl) {
  const capabilities = browserCapabilities.browserCapabilities(req.get('user-agent'));
  const compileTarget = getCompileTarget.getCompileTarget(capabilities, 'auto');

  const options = {
    compileTarget,
    transformModules: !capabilities.has('modules'),
  };

  return polymerBuild.jsTransform(body, {
    compile: options.compileTarget,
    transformModulesToAmd: options.transformModules ? 'auto' : false,
    moduleResolution: npm ? 'node' : 'none',
    filePath,
    isComponentRequest: req.baseUrl === componentUrl,
    packageName,
    componentDir: npm ? path.join(root, 'node_modules') : path.join(root, 'bower_components'),
    rootDir: process.cwd(),
  });
};

function instrumentFile(path, req, html) {
  const asset = req.url;

  if (fs.existsSync(path)) {
    if (!cache[asset]) {
      code = fs.readFileSync(path, 'utf8');
      cache[asset] = html ? cache[asset] = scriptHook(code, { scriptCallback: instrumentScript }) : instrumenter.instrumentSync(code, path);
    }

    function instrumentScript(code) {
      return instrumenter.instrumentSync(code, path);
    }
  } else {
    return '';
  }
  return cache[asset];
}

/**
 * Middleware that serves an instrumented asset based on user
 * configuration of coverage
 */
function coverageMiddleware(root, options, emitter) {
  const basename = util.getPackageName(options);
  const basepath = path.join(emitter.options.clientOptions.root, basename);

  return function (req, res, next) {
    let blacklist = options.exclude || ['**/test/**'];
    let whitelist = options.include || [];

    if (!options.ignoreBasePath) {
      blacklist = blacklist.map(x => path.join(basepath, x));
      whitelist = whitelist.map(x => path.join(basepath, x));
    }

    if (match(req.url, whitelist) && !match(req.url, blacklist)) {
      emitter.emit('log:debug', 'coverage', 'instrument', req.url);

      const re = new RegExp(`^\/[^/]+\/${basename.replace('/', '\/')}`);
      const absolutePath = req.url.replace(re, root);

      if (absolutePath.match(/\.js?$/)) {
        let html = instrumentFile(absolutePath, req);
        res.type('application/javascript');
        html = html.replace('coverage = global[gcv] || (global[gcv] = {});', 'coverage = global.WCT.share.__coverage__ || (global.WCT = { share: { __coverage__: {} } }); ');
        return res.send(transform(req, html, basename, absolutePath, options.npm, root, emitter.options.clientOptions.root));
      } else if (absolutePath.match(/\.htm(l)?$/)) {
        let html = instrumentFile(absolutePath, req, true);
        return res.send(html.replace('coverage = global[gcv] || (global[gcv] = {});', 'coverage = global.WCT.share.__coverage__ || (global.WCT = { share: { __coverage__: {} } }); '));
      }

      return next();
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
  return rules.some((rule) => minimatch(str, rule));
}

module.exports = {
  middleware: coverageMiddleware,
  cacheClear: cacheClear
};

