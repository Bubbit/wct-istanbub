const { assert } = require('chai');
const sinon = require('sinon');
const middleware = require('../lib/middleware');
const polymerBuild = require('polymer-build');
const fs = require('fs');
const istanbulInstrumenter = require('istanbul-lib-instrument');

describe('Middleware', () => {
  afterEach(() => {
    middleware.cacheClear();
  });

  describe('generic', () => {
    it('should by default exclude **/test/**', (done) => {
      const server = middleware.middleware('', { include: ['**'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/test/fake.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/test/fake.js' }, {}, () => { });
    });

    it('should not instrument blacklisted requests', (done) => {
      const server = middleware.middleware('', { include: ['**'], exclude: ['noinclude.js'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should not instrument non-whitelisted requests', (done) => {
      const server = middleware.middleware('', { include: ['src/**'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should not instrument a file if no whitelist is given', (done) => {
      const server = middleware.middleware('', { packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should instrument whitelisted requests with a globbing pattern', (done) => {
      const server = middleware.middleware('', { include: ['**'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'instrument');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should properly allow includes with / in the includes path', (done) => {
      const server = middleware.middleware('', { include: ['/include.js'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'instrument');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should properly allow includes without / in the includes path', (done) => {
      const server = middleware.middleware('', { include: ['include.js'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'instrument');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should properly allow excludes with / in the excludes path', (done) => {
      const server = middleware.middleware('', { include: ['**'], exclude: ['/noinclude.js'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should properly allow excludes without / in the excludes path', (done) => {
      const server = middleware.middleware('', { include: ['**'], exclude: ['noinclude.js'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should not add the basepath to includes & excludes if ignoreBasePath is set', (done) => {
      const server = middleware.middleware('', { ignoreBasePath: true, include: ['/include.js'], exclude: ['noinclude.js'], packageName: 'wct-istanbub' }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should not instrument a JSON and matches the includes', (done) => {
      const server = middleware.middleware('', { include: ['test/mocks/bower.json'], exclude: [], packageName: 'wct-istanbub' }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({ get: () => { }, url: '/components/wct-istanbub/test/mocks/bower.json' }, {
        type: () => { }
      }, () => {
        done();
      });
    });

    it('should call createInstrument with default plugins if no set', (done) => {
      const createInstrumenter = sinon.stub(istanbulInstrumenter, 'createInstrumenter');
      createInstrumenter.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/include.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: () => {
            sinon.assert.calledOnce(createInstrumenter.withArgs(sinon.match({
              autoWrap: true,
              coverageVariable: 'WCT.share.__coverage__',
              embedSource: true,
              compact: false,
              preserveComments: false,
              produceSourceMap: false,
              ignoreClassMethods: undefined,
              esModules: true,
              plugins: [
                'importMeta',
                'asyncGenerators',
                'dynamicImport',
                'objectRestSpread',
                'optionalCatchBinding',
                'flow',
                'jsx'
              ]
            })));
            createInstrumenter.restore();
            done();
          }
        }, () => { });
    });

    it('should call createInstrument with unique set of plugins if duplicates are set', (done) => {
      const createInstrumenter = sinon.stub(istanbulInstrumenter, 'createInstrumenter');
      createInstrumenter.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/include.js'], babelPlugins: ['dotallRegex', 'flow', 'jsx'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: () => {
            sinon.assert.calledOnce(createInstrumenter.withArgs(sinon.match({
              autoWrap: true,
              coverageVariable: 'WCT.share.__coverage__',
              embedSource: true,
              compact: false,
              preserveComments: false,
              produceSourceMap: false,
              ignoreClassMethods: undefined,
              esModules: true,
              plugins: [
                'importMeta',
                'asyncGenerators',
                'dynamicImport',
                'objectRestSpread',
                'optionalCatchBinding',
                'flow',
                'jsx',
                'dotallRegex'
              ]
            })));
            createInstrumenter.restore();
            done();
          }
        }, () => { });
    });

    it('should save the file in cache', (done) => {
      const mockFile = fs.readFileSync('test/mocks/mockJS.js', 'utf8');

      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync');
      fsExistStub.withArgs('test/mocks/include.js').returns(true);
      fsExistStub.returns(false);

      const fsReadFileStub = sinon.stub(fs, 'readFileSync');
      fsReadFileStub.withArgs('test/mocks/include.js').returns(mockFile);
      fsReadFileStub.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/include.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: () => {
            sinon.assert.calledOnce(fsExistStub);
            sinon.assert.calledOnce(fsReadFileStub.withArgs('test/mocks/include.js'));
          }
        }, () => { });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: (response) => {
            sinon.assert.calledTwice(fsExistStub);
            sinon.assert.calledOnce(fsReadFileStub.withArgs('test/mocks/include.js'));
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });
  });

  describe('supporting NPM', () => {
    describe('when jsTransform is called with the correct parameters', () => {
      let jsTransformSpy;
      beforeEach(() => {
        jsTransformSpy = sinon.spy(polymerBuild, 'jsTransform');
      });

      afterEach(() => {
        jsTransformSpy.restore();
      });

      it('should use moduleResolution node if not set and options are npm', (done) => {
        const server = middleware.middleware('', { npm: true, include: ['/include.js'] }, {
          emit: () => { },
          options: { clientOptions: { root: '/components/' } }
        });
        server({ get: () => { }, url: '/components/wct-istanbub/include.js' }, {
          type: () => { }, send: (response) => {
            assert.isTrue(polymerBuild.jsTransform.calledOnce);
            assert.equal(polymerBuild.jsTransform.getCall(0).args[1].componentDir, 'node_modules');
            assert.equal(polymerBuild.jsTransform.getCall(0).args[1].moduleResolution, 'node');
            assert.isFalse(polymerBuild.jsTransform.getCall(0).args[1].isComponentRequest);
            jsTransformSpy.restore();
            done();
          }
        }, () => { });
      });

      it('should use moduleResolution node if set to node', (done) => {
        const server = middleware.middleware('', { npm: false, include: ['/include.js'], moduleResolution: 'node' }, {
          emit: () => { },
          options: { clientOptions: { root: '/components/' } }
        });
        server({ get: () => { }, url: '/components/wct-istanbub/include.js' }, {
          type: () => { }, send: (response) => {
            assert.isTrue(polymerBuild.jsTransform.calledOnce);
            assert.equal(polymerBuild.jsTransform.getCall(0).args[1].componentDir, 'bower_components');
            assert.equal(polymerBuild.jsTransform.getCall(0).args[1].moduleResolution, 'node');
            assert.isFalse(polymerBuild.jsTransform.getCall(0).args[1].isComponentRequest);
            jsTransformSpy.restore();
            done();
          }
        }, () => { });
      });

      it('should use moduleResolution none if not set and options are not npm', (done) => {
        const server = middleware.middleware('', { npm: false, include: ['/include.js'] }, {
          emit: () => { },
          options: { clientOptions: { root: '/components/' } }
        });
        server({ get: () => { }, url: '/components/wct-istanbub/include.js' }, {
          type: () => { }, send: (response) => {
            assert.isTrue(polymerBuild.jsTransform.calledOnce);
            assert.equal(polymerBuild.jsTransform.getCall(0).args[1].componentDir, 'bower_components');
            assert.equal(polymerBuild.jsTransform.getCall(0).args[1].moduleResolution, 'none');
            assert.isFalse(polymerBuild.jsTransform.getCall(0).args[1].isComponentRequest);
            jsTransformSpy.restore();
            done();
          }
        }, () => { });
      });
    });

    it('should instrument the file correctly', (done) => {
      const mockFile = fs.readFileSync('test/mocks/mockJS.js', 'utf8');
      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync');
      fsExistStub.withArgs('test/mocks/include.js').returns(true);
      fsExistStub.returns(false);

      const fsReadFileStub = sinon.stub(fs, 'readFileSync');
      fsReadFileStub.withArgs('test/mocks/include.js').returns(mockFile);
      fsReadFileStub.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/include.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: (response) => {
            assert.include(response, 'cov_');
            assert.include(response, 'global.WCT.share.__coverage__');
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });
  });

  describe('supporting Bower', () => {
    it('should call jsTransform with the correct parameters', (done) => {
      const jsTransformSpy = sinon.spy(polymerBuild, 'jsTransform');
      const server = middleware.middleware('', { npm: false, include: ['/include.js'], packageName: 'wct-istanbub' }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({ get: () => { }, url: '/components/wct-istanbub/include.js' }, {
        type: () => { }, send: (response) => {
          assert.isTrue(polymerBuild.jsTransform.calledOnce);
          assert.equal(polymerBuild.jsTransform.getCall(0).args[1].componentDir, 'bower_components');
          assert.equal(polymerBuild.jsTransform.getCall(0).args[1].moduleResolution, 'none');
          assert.isFalse(polymerBuild.jsTransform.getCall(0).args[1].isComponentRequest);
          jsTransformSpy.restore();
          done();
        }
      }, () => { });
    });

    it('should instrument the file correctly', (done) => {
      const mockFile = fs.readFileSync('test/mocks/mockHTML.html', 'utf8');
      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync');
      fsExistStub.withArgs('/include.html').returns(true);
      fsExistStub.returns(false);

      const fsReadFileStub = sinon.stub(fs, 'readFileSync');
      fsReadFileStub.withArgs('/include.html').returns(mockFile);
      fsReadFileStub.callThrough();

      const server = middleware.middleware('', { npm: false, include: ['/include.html'], packageName: 'wct-istanbub' }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.html'
      }, {
          type: () => { },
          send: (response) => {
            assert.include(response, 'cov_');
            assert.include(response, 'global.WCT.share.__coverage__');
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });

    it('should call jsTransform with the correct parameters', (done) => {
      const jsTransformSpy = sinon.spy(polymerBuild, 'jsTransform');
      const server = middleware.middleware('', { npm: false, include: ['/include.html'], packageName: 'wct-istanbub' }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({ get: () => { }, url: '/components/wct-istanbub/include.html' }, {
        type: () => { }, send: (response) => {
          assert.isTrue(polymerBuild.jsTransform.notCalled);
          jsTransformSpy.restore();
          done();
        }
      }, () => { });
    });
  });

  describe('Source Maps', () => {
    it('should be loaded if valid', (done) => {
      const mockJsFile = fs.readFileSync('test/mocks/mockMapped.js', 'utf8');
      const mockMapFile = fs.readFileSync('test/mocks/mockMapped.js.map', 'utf8');
      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync');
      fsExistStub.withArgs('test/mocks/mockMapped.js').returns(true);
      fsExistStub.withArgs('test/mocks/mockMapped.js.map').returns(true);
      fsExistStub.returns(false);

      const fsReadFileStub = sinon.stub(fs, 'readFileSync');
      fsReadFileStub.withArgs('test/mocks/mockMapped.js').returns(mockJsFile);
      fsReadFileStub.withArgs('test/mocks/mockMapped.js.map').returns(mockMapFile);
      fsReadFileStub.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/mockMapped.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/mockMapped.js'
      }, {
          type: () => { },
          send: (response) => {
            assert.include(response, 'inputSourceMap: {');
            assert.include(response, 'mockMapped.ts');
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });

    it('should not be loaded if map file does not exist', (done) => {
      const mockJsFile = fs.readFileSync('test/mocks/mockMapped.js', 'utf8');

      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync');
      fsExistStub.withArgs('test/mocks/mockMapped.js').returns(true);
      fsExistStub.withArgs('test/mocks/mockMapped.js.map').returns(false);
      fsExistStub.returns(false);

      const fsReadFileStub = sinon.stub(fs, 'readFileSync');
      fsReadFileStub.withArgs('test/mocks/mockMapped.js').returns(mockJsFile);
      fsReadFileStub.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/mockMapped.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/mockMapped.js'
      }, {
          type: () => { },
          send: (response) => {
            assert.notInclude(response, 'inputSourceMap');
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });

    it('should not be loaded if map file is invalid', (done) => {
      const mockJsFile = fs.readFileSync('test/mocks/mockMapped.js', 'utf8');

      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync');
      fsExistStub.withArgs('test/mocks/mockMapped.js').returns(true);
      fsExistStub.withArgs('test/mocks/mockMapped.js.map').returns(true);
      fsExistStub.returns(false);

      const fsReadFileStub = sinon.stub(fs, 'readFileSync');
      fsReadFileStub.withArgs('test/mocks/mockMapped.js').returns(mockJsFile);
      fsReadFileStub.withArgs('test/mocks/mockMapped.js.map').returns("foo");
      fsReadFileStub.callThrough();

      const server = middleware.middleware('test/mocks', { npm: true, include: ['/mockMapped.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/mockMapped.js'
      }, {
          type: () => { },
          send: (response) => {
            assert.notInclude(response, 'inputSourceMap');
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });
  })
});