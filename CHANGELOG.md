# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.2.6] - 2018-09-10
### Added
- Add support for `importMeta` instrumenting via Istanbul configuration

## [0.2.5] - 2018-07-29
### Changed
- Add .travis.yml to .npmignore

## [0.2.4] - 2018-07-25
### Changed
- Minor change in console output for not meeting coverage thresholds to align per-file and global failure messages

## [0.2.3] - 2018-07-23
### Fixed
- Clear the file cache on `sub-suite-end` instead of `run-end` to pick up file updates when `wct` is run in persistent mode

## [0.2.2] - 2018-06-26
### Added
- Added `configFile` configuration option for specifying the path to an Istanbul configuration file
- Added `configOverrides` configuration option for specfifying Istanbul configuration overrides
- Added `--config-file PATH` CLI option for specifying the path to an Istanbul configuration file

### Removed
- Removed `dir` configuration option and `--dir` CLI option; they stopped working in version 0.2.0. Use `configOverrides.reporting.dir` or specify as `reporting.dir` in a config file instead.

## [0.2.1] - 2018-06-07
### Added
- Added .npmignore

## [0.2.0] - 2018-06-06
### Changed
- Depend on istanbuljs libraries instead of out-dated istanbul

### Added
- NPM (polymer 3) support
- ignoreBasePath parameter in order to not add the basepath to include/exclude array's

## [0.1.2] - 2018-05-01
### Fixed
- Use cwd if no root/manifestName is set

## [0.1.1] - 2018-04-04
### Fixed
- Check if file exists before trying to load
