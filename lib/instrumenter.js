const convertSourceMap = require('convert-source-map')
const mergeSourceMap = require('merge-source-map')

function InstrumenterIstanbul (cwd, options) {
  const istanbul = InstrumenterIstanbul.istanbul()
  const instrumenter = istanbul.createInstrumenter({
    autoWrap: true,
    coverageVariable: 'WCT.share.__coverage__',
    embedSource: true,
    compact: false,
    preserveComments: false,
    produceSourceMap: false,
    ignoreClassMethods: undefined,
    esModules: true
  })

  return {
    instrumentSync: (code, filename) => {
      let instrumented = instrumenter.instrumentSync(code, filename)
      return instrumented
    },
    lastFileCoverage: function () {
      return instrumenter.lastFileCoverage()
    }
  }
}

InstrumenterIstanbul.istanbul = () => {
  return InstrumenterIstanbul._istanbul || (InstrumenterIstanbul._istanbul = require('istanbul-lib-instrument'))
}

module.exports = InstrumenterIstanbul