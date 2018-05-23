const minimatch = require('minimatch');
const fs = require('fs');
const path = require('path');
const parseurl = require('parseurl');
const scriptHook = require('html-script-hook');
const polymerBuild =  require('polymer-build');
const browserCapabilities = require('browser-capabilities');
const getCompileTarget = require('polyserve/lib/get-compile-target.js');
const instrumenterLib = require('./instrumenter');
const util = require('./util');

// istanbul
const instrumenter = new instrumenterLib(process.cwd, {});


// helpers
let cache = {};


function instrumentCode(code, loc) {
  return instrumenter.instrumentSync(code, loc);
}

function transform(req, body, packageName, absolutePath) {
  const capabilities = browserCapabilities.browserCapabilities(req.get('user-agent'));
  const compileTarget = getCompileTarget.getCompileTarget(capabilities, 'auto');

  const options = {
    compileTarget,
    transformModules: !capabilities.has('modules'),
  };

  const isRootPathRequest = req.path === `/${packageName}` ||
    req.path.startsWith(`/${packageName}/`);
  const isComponentRequest = req.baseUrl === `/components`;

  return polymerBuild.jsTransform(body, {
    compile: options.compileTarget,
    transformModulesToAmd: options.transformModules ? 'auto' : false,
    moduleResolution: 'node',
    filePath: absolutePath,
    isComponentRequest,
    packageName,
    componentDir: process.cwd + '/node_modules',
    rootDir: process.cwd,
  });
};

function instrumentFile(path, req, html) {
  const asset = req.url;

  if (fs.existsSync(path)) {
    if (!cache[asset]) {
      code = fs.readFileSync(path, 'utf8');
      cache[asset] = html ? cache[asset] = scriptHook(code, { scriptCallback: instrumentCode }) : instrumentCode(code, path);
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
  const basepath = emitter.options.clientOptions.root + basename;

  return function (req, res, next) {
    const re = new RegExp(`^\/[^/]+\/${basename.replace('/', '\/')}`);
    const absolutePath = req.url.replace(re, root);
    console.log(absolutePath);
    // always ignore platform files in addition to user's blacklist
    let blacklist = ['/web-component-tester/*'];
    if (options.exclude) {
      blacklist = blacklist.concat(options.exclude);
    } else {
      blacklist = blacklist.concat(['**/test/**']);
    }
    const whitelist = options.include.map(x => basepath + x);

    // cache the webserver root for user supplied instrumenter
    this.root = root;
    // check asset against rules
    const process = match(req.url, whitelist) && !match(req.url, blacklist);

    // instrument unfiltered assets
    if (process) {
      emitter.emit('log:debug', 'coverage', 'instrument', req.url);


      if (absolutePath.match(/\.js?$/)) {
        let html = instrumentFile(absolutePath, req);
        res.type('application/javascript');
        html = html.replace('coverage = global[gcv] || (global[gcv] = {});', `coverage = global.WCT.share.__coverage__ || (global.WCT = { share: { __coverage__: {} } }); `);
        return res.send(transform(req, html, basename, absolutePath));
      } else if (absolutePath.match(/\.htm(l)?$/)) {
        let html = instrumentFile(absolutePath, req, true);
        return res.send(html.replace('coverage = global[gcv] || (global[gcv] = {});', `coverage = global.WCT.share.__coverage__ || (global.WCT = { share: { __coverage__: {} } }); `));
      }

      return res.send(instrumentFile(absolutePath, req));
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

