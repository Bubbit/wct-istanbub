const { assert } = require('chai');
const sinon = require('sinon');
const middleware = require('../lib/middleware');
const polymerBuild = require('polymer-build');
const fs = require('fs');

describe('Middleware', () => {
  describe('generic', () => {
    it('should by default exclude **/test/**', (done) => {
      const server = middleware.middleware('', { include: ['**'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/test/fake.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/test/fake.js' }, {}, () => { });
    });

    it('should not instrument blacklisted requests', (done) => {
      const server = middleware.middleware('', { include: ['**'], exclude: ['noinclude.js'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should not instrument non-whitelisted requests', (done) => {
      const server = middleware.middleware('', { include: ['src/**'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should not instrument a file if no whitelist is given', (done) => {
      const server = middleware.middleware('', {}, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should instrument whitelisted requests with a globbing pattern', (done) => {
      const server = middleware.middleware('', { include: ['**'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'instrument');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should properly allow includes with / in the includes path', (done) => {
      const server = middleware.middleware('', { include: ['/include.js'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'instrument');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should properly allow includes without / in the includes path', (done) => {
      const server = middleware.middleware('', { include: ['include.js'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'instrument');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should properly allow excludes with / in the excludes path', (done) => {
      const server = middleware.middleware('', { include: ['**'], exclude: ['/noinclude.js'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should properly allow excludes without / in the excludes path', (done) => {
      const server = middleware.middleware('', { include: ['**'], exclude: ['noinclude.js'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/noinclude.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/noinclude.js' }, {}, () => { });
    });

    it('should not add the basepath to includes & excludes if ignoreBasePath is set', (done) => {
      const server = middleware.middleware('', { ignoreBasePath: true, include: ['/include.js'], exclude: ['noinclude.js'] }, {
        emit: (logLevel, title, message, value) => {
          assert.equal(message, 'skip      ');
          assert.equal(value, '/components/wct-istanbub/include.js');
          done();
        }, options: { clientOptions: { root: '/components/' } }
      });
      server({ url: '/components/wct-istanbub/include.js' }, {}, () => { });
    });

    it('should not instrument a JSON and matches the includes', (done) => {
      const server = middleware.middleware('', { include: ['test/mocks/bower.json'], exclude: [] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({ get: () => { }, url: '/components/wct-istanbub/test/mocks/bower.json' }, {
        type: () => { }
      }, () => {
        done();
      });
    });

    it('should save the file in cache', (done) => {
      const mockFile = fs.readFileSync('test/mocks/mockJS.js', 'utf8');
      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync').callsFake((file) => { if (file === '/include.js') { return true; } else { return false; } });
      const fsReadFileStub = sinon.stub(fs, 'readFileSync').callsFake(() => { return mockFile; });

      const server = middleware.middleware('', { npm: true, include: ['/include.js'] }, {
        emit: () => { },
        options: { clientOptions: { root: '/components/' } }
      });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: () => { 
            assert.isTrue(fsExistStub.calledTwice);
            assert.isTrue(fsReadFileStub.calledTwice);
          }
        }, () => { });
      server({
        get: () => { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36' },
        url: '/components/wct-istanbub/include.js'
      }, {
          type: () => { },
          send: (response) => {
            assert.isTrue(fsExistStub.calledThrice);
            assert.isTrue(fsReadFileStub.calledTwice);
            fsExistStub.restore();
            fsReadFileStub.restore();
            done();
          }
        }, () => { });
    });
  });

  describe('supporting NPM', () => {
    it('should call jsTransform with the correct parameters', (done) => {
      const jsTransformSpy = sinon.spy(polymerBuild, 'jsTransform');
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

    it('should instrument the file correctly', (done) => {
      const mockFile = fs.readFileSync('test/mocks/mockJS.js', 'utf8');
      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync').callsFake((file) => { if (file === '/include.js') { return true; } else { return false; } });
      const fsReadFileStub = sinon.stub(fs, 'readFileSync').callsFake(() => { return mockFile; });

      const server = middleware.middleware('', { npm: true, include: ['/include.js'] }, {
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

    it('should instrument the file correctly', (done) => {
      const mockFile = fs.readFileSync('test/mocks/mockHTML.html', 'utf8');
      // mock FS
      const fsExistStub = sinon.stub(fs, 'existsSync').callsFake((file) => { if (file === '/include.html') { return true; } else { return false; } });
      const fsReadFileStub = sinon.stub(fs, 'readFileSync').callsFake(() => { return mockFile; });

      const server = middleware.middleware('', { npm: false, include: ['/include.html'] }, {
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
      const server = middleware.middleware('', { npm: false, include: ['/include.html'] }, {
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
});