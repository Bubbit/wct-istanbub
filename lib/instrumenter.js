'use strict'

const convertSourceMap = require('convert-source-map')
const mergeSourceMap = require('merge-source-map')

function InstrumenterIstanbul (cwd, options) {
  const istanbul = InstrumenterIstanbul.istanbul()
  const instrumenter = istanbul.createInstrumenter({
    autoWrap: options.autoWrap || true,
    coverageVariable: 'WCT.share.__coverage__',
    embedSource: options.embedSource || true,
    compact: options.compact,
    preserveComments: options.preserveComments,
    produceSourceMap: options.produceSourceMap,
    ignoreClassMethods: options.ignoreClassMethods,
    esModules: options.esModules || true
  })

  return {
    instrumentSync: function (code, filename, sourceMap) {
      let instrumented = instrumenter.instrumentSync(code, filename)
      // the instrumenter can optionally produce source maps,
      // this is useful for features like remapping stack-traces.
      // TODO: test source-map merging logic.
      if (options.produceSourceMap) {
        let lastSourceMap = instrumenter.lastSourceMap()
        if (lastSourceMap) {
          if (sourceMap) {
            lastSourceMap = mergeSourceMap(
              sourceMap.toObject(),
              lastSourceMap
            )
          }
          instrumented += '\n' + convertSourceMap.fromObject(lastSourceMap).toComment()
        }
      }
      return instrumented
    },
    lastFileCoverage: function () {
      return instrumenter.lastFileCoverage()
    }
  }
}

InstrumenterIstanbul.istanbul = function () {
  InstrumenterIstanbul._istanbul || (InstrumenterIstanbul._istanbul = require('istanbul-lib-instrument'))

  return InstrumenterIstanbul._istanbul || (InstrumenterIstanbul._istanbul = require('istanbul'))
}

module.exports = InstrumenterIstanbul