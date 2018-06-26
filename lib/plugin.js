const { createReporter, config } = require('istanbul-api');
const istanbulCoverage = require('istanbul-lib-coverage');
const express = require('express');
const middleware = require('./middleware');
const Validator = require('./validator');

/**
* Tracks coverage objects and writes results by listening to events
* emitted from wct test runner.
*/
function Listener(emitter, pluginOptions) {
  this.map = istanbulCoverage.createCoverageMap();
  this.istanbulConfig = config.loadFile(pluginOptions.configFile, pluginOptions.configOverrides);
  this.reporter = createReporter(this.istanbulConfig);
  this.validator = new Validator(pluginOptions.thresholds);
  this.reporter.addAll(pluginOptions.reporters)
  pluginOptions.npm = pluginOptions.npm || emitter.options.npm;

  emitter.on('sub-suite-end', function (browser, data) {
    if (data && data.__coverage__) {
      Object.keys(data.__coverage__).forEach(filename => {
        this.map.addFileCoverage(data.__coverage__[filename])
      });
    }
  }.bind(this));

  emitter.on('run-end', function (error) {
    middleware.cacheClear();

    if (error && pluginOptions.onlyWriteSuccess) {
      throw Error('Tests failed. Not writing coverage report.');
    }

    // Log a new line to not overwrite the test results outputted by WCT
    console.log('\n');
    this.reporter.write(this.map);

    if (!validator.validate(this.map)) {
      throw Error('Coverage failed');
    }
  }.bind(this));

  emitter.hook('define:webserver', function (app, assign, options, done) {
    const newApp = express();
    newApp.use(middleware.middleware(emitter.options.root, pluginOptions, emitter));
    newApp.use(app);
    assign(newApp);
    done();
  }.bind(this));
}

module.exports = Listener;
