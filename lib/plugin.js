var middleware = require('./middleware');
var istanbul = require('istanbub');
var Validator = require('./validator');
var express = require('express');
var sync = true;

/**
* Tracks coverage objects and writes results by listening to events
* emitted from wct test runner.
*/

function Listener(emitter, pluginOptions) {
  this.options = pluginOptions;
  this.collector = new istanbul.Collector();
  this.reporter = new istanbul.Reporter(false, this.options.dir);
  this.validator = new Validator(this.options.thresholds);
  this.reporter.addAll(this.options.reporters)

  emitter.on('sub-suite-end', function (browser, data) {
    if (data && data.__coverage__) {
      this.collector.add(data.__coverage__);
    }
  }.bind(this));

  emitter.on('run-end', function (error) {
    middleware.cacheClear();

    if (error && this.options.onlyWriteSuccess) {
      throw Error("Tests failed. Not writing coverage report.");
    }
    
    // Log a new line to not overwrite the test results outputted by WCT
    console.log('\n');
    this.reporter.write(this.collector, sync, function () { });

    if (!validator.validate(this.collector)) {
      throw new Error('Coverage failed');
    }
  }.bind(this));

  emitter.hook('define:webserver', function (app, assign, options, done) {
    var newApp = express();
    newApp.use(middleware.middleware(emitter.options.root, this.options, emitter));
    newApp.use(app);
    assign(newApp);
    done();
  }.bind(this));

};

module.exports = Listener;
