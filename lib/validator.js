const istanbulReporter = require('istanbul-lib-report');

function Validator(thresholds) {
  this.thresholds = thresholds || {};
}

const TYPES = ['lines', 'statements', 'functions', 'branches'];

function checkThreshold(threshold, summary) {
  const result = { failed: false };

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
  return TYPES.map(type => {
    // If the threshold is a number use it, otherwise lookup the threshold type
    const threshold = typeof thresholds === 'number' ? thresholds : thresholds && thresholds[type];
    return checkThreshold(threshold, summary[type]);
  });
}

function checkFailures(thresholds, tree) {
  const summary = TYPES.map(type => ({ type }));

  // If there are global thresholds check overall coverage
  if (thresholds.global) {
    const global = checkThresholds(thresholds.global, tree.getRoot().getCoverageSummary(false));
    // Inject into summary
    summary.forEach((metric, i) => {
      metric.global = global[i];
    });
  }

  // If there are individual thresholds check coverage per file
  if (thresholds.each) {
    const failures = { statements: [], branches: [], lines: [], functions: [] };
    tree.getRoot().getChildren().forEach(child => {
      // Check failures for a file
      const each = checkThresholds(
        thresholds.each,
        child.getCoverageSummary(false)
      );

      each.forEach((item, i) => {
        if (item.failed) {
          failures[TYPES[i]].push({
            path: child.fileCoverage.data.path,
            coverage: item.value
          });
        }
      });
    });

    // Inject into summary
    summary.map(metric => {
      metric.each = {
        failed: failures[metric.type].length > 0,
        failures: failures[metric.type]
      };
    });
  }

  return summary;
}

Validator.prototype.validate = function(collector) {
  const tree = istanbulReporter.summarizers['flat'](collector);

  const coverage = checkFailures(this.thresholds, tree);
  let thresholdMet = true;

  coverage.forEach(coverage => {
    let expectedValue;

    if (coverage.global && coverage.global.failed) {
      expectedValue = this.thresholds['global'][coverage.type] || this.thresholds['global'];

      console.log(
        `Coverage threshold for ${coverage.type} (${expectedValue}%) not met globally (${coverage.global.value}%)`
      );

      thresholdMet = false;
    }

    if (coverage.each && coverage.each.failed) {
      expectedValue = this.thresholds['each'][coverage.type] || this.thresholds['each'];

      console.log(
        `Coverage threshold for ${coverage.type} (${expectedValue}%) not met for:\n` +
        coverage.each.failures.map(({ path, coverage }) => `- ${path} (${coverage}%)`).join('\n')
      );

      thresholdMet = false;
    }
  });

  return thresholdMet;
}

module.exports = Validator;