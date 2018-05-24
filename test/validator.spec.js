const { assert } = require('chai');
const fs = require('fs');
const istanbulCoverage = require('istanbul-lib-coverage');
const Validator = require('../lib/validator');

describe('Validator', () => {
  let lowCoverage, averageCoverage, fullCoverage;

  before(() => {
    const lowCoverageJSON = JSON.parse(fs.readFileSync('test/mocks/coverage-low.json', 'utf8'));
    const averageCoverageJSON = JSON.parse(fs.readFileSync('test/mocks/coverage-middle.json', 'utf8'));
    const fullCoverageJSON = JSON.parse(fs.readFileSync('test/mocks/coverage-full.json', 'utf8'));

    lowCoverage = istanbulCoverage.createCoverageMap();
    averageCoverage = istanbulCoverage.createCoverageMap();
    fullCoverage = istanbulCoverage.createCoverageMap();

    lowCoverage.addFileCoverage(lowCoverageJSON);
    averageCoverage.addFileCoverage(averageCoverageJSON);
    fullCoverage.addFileCoverage(fullCoverageJSON);
  });

  it('should validate a 100% result', () => {
    const validator = new Validator();
    assert.isTrue(validator.validate(fullCoverage));
  });

  it('should invalidate an average result if globally 100% is requested', () => {
    const validator = new Validator({global: 100});
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if for each file 100% is requested', () => {
    const validator = new Validator({each: 100});
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should validate an empty result', () => {
    const validator = new Validator();
    assert.isTrue(validator.validate(lowCoverage));
  });

  it('should validate an average result if the global difference is allowed', () => {
    const validator = new Validator({global: -40});
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should validate an average result if the difference for each file is allowed', () => {
    const validator = new Validator({each: -30});
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should validate an average result if the global coverage for statements is set to 60%', () => {
    const validator = new Validator({ global: { statements: 60 } });
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should validate an average result if the global coverage for lines is set to 60%', () => {
    const validator = new Validator({ global: { lines: 60 } });
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should validate an average result if the global coverage for functions is set to 50%', () => {
    const validator = new Validator({ global: { functions: 50 } });
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if the global coverage for statements is set to 100%', () => {
    const validator = new Validator({ global: { statements: 100 } });
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if the global coverage for lines is set to 100%', () => {
    const validator = new Validator({ global: { lines: 100 } });
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if the global coverage for functions is set to 100%', () => {
    const validator = new Validator({ global: { functions: 100 } });
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should validate an average result if the coverage for each file for statements is set to 60%', () => {
    const validator = new Validator({ each: { statements: 60 } });
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should validate an average result if the coverage for each file for lines is set to 60%', () => {
    const validator = new Validator({ each: { lines: 60 } });
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should validate an average result if the coverage for each file for functions is set to 50%', () => {
    const validator = new Validator({ each: { functions: 50 } });
    assert.isTrue(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if the coverage for each file for statements is set to 100%', () => {
    const validator = new Validator({ each: { statements: 100 } });
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if the coverage for each file for lines is set to 100%', () => {
    const validator = new Validator({ each: { lines: 100 } });
    assert.isFalse(validator.validate(averageCoverage));
  });

  it('should invalidate an average result if the coverage for each file for functions is set to 100%', () => {
    const validator = new Validator({ each: { functions: 100 } });
    assert.isFalse(validator.validate(averageCoverage));
  });
});