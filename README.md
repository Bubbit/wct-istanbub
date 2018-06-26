WCT-istanbub
=============================

Istanbul coverage plugin for web-component-tester.

Use this plugin to collect and report test coverage (via istanbul) for
your project on each test run.

In order to use this coverage plugin use at least version 6.4.0 of web-component-tester

Check out this test repository for an [example](https://github.com/Bubbit/polymerTesting) with 'app' and [travis](https://travis-ci.org/Bubbit/polymerTesting) build  

## Installation

```sh
npm install wct-istanbub --save-dev
```

## Basic Usage

Add the following configuration to web-component-tester's config file.

## Example

```js
module.exports = {
  plugins: {
    istanbub: {
      reporters: ["text-summary", "lcov"],
      include: [
        "**/*.html"
      ],
      exclude: [
        "**/test/**"
      ]
    }
  }
}
```

## Options

Below are the available configuration options:

### reporters

An array of istanbul reporters to use.

### include

Files to include in instrumentation, default the basepath will be added - /components/${packagename}/{includepaths}

### exclude

Files to exclude from instrumentation (this trumps files 'included' with
the option above).

By default the '**/test/**' is excluded as istanbub crashes on some of the test tooling used by most projects
and testing the coverage of your test files is not really useful.

default the basepath will be added - /components/${packagename}/{excludepaths}

### configFile

Path to an Istanbul configuration file.

### configOverrides

Overrides for the default Istanbul configuration. Check the
[default configuration](https://github.com/istanbuljs/istanbuljs/blob/master/packages/istanbul-api/lib/config.js) for
all available options.

### ignoreBasePath

Don't add the basepath to the include & exclude array's for specific use-cases

## Coverage Thresholds

In addition to measuring coverage, this plugin can be used to enforce
coverage thresholds.  If coverage does not meet the configured thresholds,
then the test run will fail, even if all tests passed.

This requires specifying the `thresholds` option for the plugin

### writeOnlyOnSuccess `false`

Set to `true` to write coverage only if all tests pass  

### Example

The following configuration will cause the test run to fail if less
than 100% of the statements in instrumented files are covered by
tests.

```js
module.exports = {
  plugins: {
    istanbub: {
      dir: "./coverage",
      reporters: ["text-summary", "lcov"],
      include: [
        "**/*.html"
      ],
      exclude: [
        "**/test/**"
      ],
      thresholds: {
        global: {
          statements: 100
        }
      }
    }
  }
}
```
