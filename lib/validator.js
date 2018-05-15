const istanbulCoverage = require('istanbul-lib-coverage');
const istanbulReporter = require('istanbul-lib-report');

function Validator(thresholds) {
  this.thresholds = thresholds || {};
}

var TYPES = ['lines', 'statements', 'functions', 'branches'];

function checkThreshold(threshold, summary) {
  var result = { failed: false };

  // Check for no threshold
  if (!threshold) {
    result.skipped = true;
    return result;
  }

  // Check percentage threshold
  if (threshold > 0) {
    result.value = summary.pct;
    result.failed = result.value < threshold;
  }
  // Check gap threshold
  else {
    result.value = summary.covered - summary.total;
    result.failed = result.value < threshold;
  }

  return result;
}

function checkThresholds(thresholds, summary) {
  return TYPES.map(function (type) {
    // If the threshold is a number use it, otherwise lookup the threshold type
    var threshold = typeof thresholds === 'number' ? thresholds : thresholds && thresholds[type];
    return checkThreshold(threshold, summary[type]);
  });
}

function checkFailures(thresholds, tree) {
  var summary = TYPES.map(function (type) {
    return { type: type };
  });

  // If there are global thresholds check overall coverage
  if (thresholds.global) {
    var global = checkThresholds(thresholds.global, tree.getRoot().getCoverageSummary(false));
    // Inject into summary
    summary.map(function (metric, i) {
      metric.global = global[i];
    });
  }

  // If there are individual thresholds check coverage per file
  if (thresholds.each) {
    var failures = { statements: [], branches: [], lines: [], functions: [] };
    tree.getRoot().getChildren().forEach(child => {
      // Check failures for a file
      var each = checkThresholds(
        thresholds.each,
        child.getCoverageSummary(false)
      );

      each.map((item, i) => {
        if (item.failed) failures[TYPES[i]].push(child.fileCoverage.data.path);
      });
    });

    // Inject into summary
    summary.map(function (metric) {
      metric.each = {
        failed: failures[metric.type].length > 0,
        failures: failures[metric.type]
      };
    });
  }

  return summary;
}


function checkCoverage(thresholds, tree) {
  const global = tree.getRoot().getCoverageSummary(false);
  console.log(global.data);


}

Validator.prototype.validate = function (collector) {
  const tree = istanbulReporter.summarizers['flat'](collector);

  const coverage = checkFailures(this.thresholds, tree);
  let thresholdMet = true;

  coverage.forEach(coverage => {
    let expectedValue;

    if (coverage.global && coverage.global.failed) {
      expectedValue = this.thresholds['global'][coverage.type] || this.thresholds['global']

      console.log('Coverage for ' + coverage.type +
        ' (' + coverage.global.value + '%)' +
        ' does not meet configured threshold (' +
        expectedValue + '%) ');
      thresholdMet = false;
    }

    if (coverage.each && coverage.each.failed) {
      expectedValue = this.thresholds['each'][coverage.type] || this.thresholds['each']

      console.log('Coverage threshold (' +
        expectedValue + '%) ' + 'not met for ' +
        coverage.type + ' in files: \n  ' +
        coverage.each.failures.join('\n  '));
      thresholdMet = false;
    }
  });

  return thresholdMet;
}

module.exports = Validator;