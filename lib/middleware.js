const minimatch = require('minimatch');
const fs = require('fs');
const path = require('path');
const parseurl = require('parseurl');
const scriptHook = require('html-script-hook');
const polymerBuild = require('polymer-build');
const browserCapabilities = require('browser-capabilities');
const getCompileTarget = require('polyserve/lib/get-compile-target.js');
const istanbulInstrumenter = require('istanbul-lib-instrument');
const getPackageName = require('web-component-tester/runner/config.js').getPackageName;

const plugins = [
  'importMeta'
]

// istanbul
const instrumenter = new istanbulInstrumenter.createInstrumenter({
  autoWrap: true,
  coverageVariable: 'WCT.share.__coverage__',
  embedSource: true,
  compact: false,
  preserveComments: false,
  produceSourceMap: false,
  ignoreClassMethods: undefined,
  esModules: true,
  plugins
});

// helpers
let cache = {};

function replaceCoverage(code) {
  return code.replace('coverage = global[gcv] || (global[gcv] = {});', 'coverage = global.WCT.share.__coverage__ || (global.WCT = { share: { __coverage__: {} } }).share.__coverage__;');
}

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
    rootDir: process.cwd()
  });
}

function instrumentFile(path, req, html) {
  const asset = req.url;

  if (fs.existsSync(path)) {
    if (!cache[asset]) {
      code = fs.readFileSync(path, 'utf8');
      cache[asset] = html ? scriptHook(code, { scriptCallback: instrumentScript }) :
        instrumenter.instrumentSync(code, path);
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
  options.root = options.root || process.cwd();
  const basename = getPackageName(options);
  const basepath = path.join(emitter.options.clientOptions.root, basename);

  return function (req, res, next) {
    let blacklist = options.exclude || ['**/test/**'];
    let whitelist = options.include || [];

    if (!options.ignoreBasePath) {
      blacklist = blacklist.map(x => path.join(basepath, x));
      whitelist = whitelist.map(x => path.join(basepath, x));
    }

    if (match(req.url, whitelist) && !match(req.url, blacklist)) {
      const re = new RegExp(`^\/[^/]+\/${basename.replace('/', '\/')}`);
      const absolutePath = req.url.replace(re, root);

      if (absolutePath.match(/\.(j|e)s$/)) {
        emitter.emit('log:debug', 'coverage', 'instrument', req.url);
        let code = instrumentFile(absolutePath, req);
        res.type('application/javascript');
        return res.send(transform(req, replaceCoverage(code), basename, absolutePath, options.npm, root, emitter.options.clientOptions.root));
      } else if (absolutePath.match(/\.htm(l)?$/)) {
        emitter.emit('log:debug', 'coverage', 'instrument', req.url);
        let html = instrumentFile(absolutePath, req, true);
        return res.send(replaceCoverage(html));
      }

      emitter.emit('log:debug', 'coverage', 'skip whitelisted', req.url);
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
}
