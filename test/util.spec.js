const { assert } = require('chai');
const util = require('../lib/util');

describe('Util', () => {
  describe('readJsonSync', () => {
    it('should return a JSON file if it\'s a valid file', () => {
      const json = util.readJsonSync('bower.json', 'test/mocks');
      assert.deepEqual(json, { name: 'bowerJSON' });
    });

    it('should return null if file can\'t be found', () => {
      const json = util.readJsonSync('notfound.json', 'test/mocks');
      assert.isNull(json);
    });

    it('should return null if file can\'t be parsed', () => {
      const json = util.readJsonSync('unparseable.json', 'test/mocks');
      assert.isNull(json);
    });
  });

  describe('getPackageName', () => {
    it('should return the packageName if set as option', () => {
      const name = util.getPackageName({packageName: 'Test'});
      assert.equal(name, 'Test');
    });

    it('should return the name of the bower.json if options.npm is false', () => {
      const name = util.getPackageName({npm: false, root: 'test/mocks'});
      assert.equal(name, 'bowerJSON');
    });

    it('should return the name of the bower.json if options.npm is true', () => {
      const name = util.getPackageName({npm: true, root: 'test/mocks'});
      assert.equal(name, 'packagejson');
    });

    it('should return the root if options.root is set and no manifest can be found', () => {
      const name = util.getPackageName({npm: false, root: 'test'});
      assert.equal(name, 'test');
    });

    it('should return the process.cwd if options.root is not set and no manifest can be found', () => {
      const name = util.getPackageName({npm: false});
      assert.equal(name, 'wct-istanbub');
    });
  });
});