const minimatch = require('minimatch');
const fs = require('fs');
const path = require('path');
const parseurl = require('parseurl');
const scriptHook = require('html-script-hook');
const instrumenterLib = require('./instrumenter');
const util = require('./util');

// istanbul
var instrumenter = new instrumenterLib(process.cwd, {});

// helpers
var cache = {};

function instrumentJS(jsFilePath, req) {
  var asset = req.url;

  if (fs.existsSync(jsFilePath)) {
    if (!cache[asset]) {
      js = fs.readFileSync(jsFilePath, 'utf8');
      cache[asset] = instrumenter.instrumentSync(js, jsFilePath);
    }

    return cache[asset];
  } else {
    return '';
  }
}

function instrumentHtml(htmlFilePath, req) {
  var asset = req.url;
  var code;

  if (fs.existsSync(htmlFilePath)) {
    if (!cache[asset]) {
      html = fs.readFileSync(htmlFilePath, 'utf8');
      cache[asset] = scriptHook(html, { scriptCallback: gotScript });
    }

    function gotScript(code, loc) {
      return instrumenter.instrumentSync(code, htmlFilePath);
    }

    return cache[asset];
  } else {
    return '';
  }
}


function instrumentCode(code, loc) {
  return instrumenter.instrumentSync(code, loc);
}

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

  console.log('USING BASEPATH', basepath);
  return function (req, res, next) {
    var re = new RegExp(`^\/[^/]+\/${basename.replace('/', '\/')}`);
    var absolutePath = req.url.replace(re, root);

    console.log(absolutePath);
    // always ignore platform files in addition to user's blacklist
    var blacklist = ['/web-component-tester/*'];
    if (options.exclude) {
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
    if (process) {
      emitter.emit('log:debug', 'coverage', 'instrument', req.url);

      if (absolutePath.match(/\.js?$/)) {
        var html = instrumentFile(absolutePath, req);
        res.type('application/javascript');
        // return res.send(html);
        return res.send(html.replace('coverage = global[gcv] || (global[gcv] = {});', `coverage = global.WCT.share.__coverage__ || (global.WCT = { share: { __coverage__: {} } }); `));
      } else if (absolutePath.match(/\.htm(l)?$/)) {
        var html = instrumentFile(absolutePath, req, true);
        // return res.send(html);
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

