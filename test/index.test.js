'use strict';

const assert = require('assert');
const co = require('co');
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('../');

let baseDocId;
let baseModel;
let baseObj;
let baseSchema;

before(function() {
  return co(function*() {
    yield mongoose.connect('mongodb://localhost:27017/mongooseLeanVirtuals', {
      useFindAndModify: false,
      useNewUrlParser: true,
    });
    yield mongoose.connection.dropDatabase();

    baseSchema = new mongoose.Schema({
      name: String,
      nested: {
        test: String
      }
    });
    baseSchema.virtual('lowerCaseName').get(function() {
      return this.name.toLowerCase();
    });
    baseSchema.virtual('nested.upperCaseTest').get(function() {
      return this.nested.test.toUpperCase();
    });
    baseSchema.plugin(mongooseLeanVirtuals);

    baseModel = mongoose.model('baseModel', baseSchema);

    baseObj = {
      name: 'Val',
      nested: {
        test: 'Foo',
      }
    };
    const baseDoc = yield baseModel.create(baseObj);
    baseDocId = baseDoc._id;
  });
});

after(function() {
  return mongoose.disconnect();
});

const defaultLeanOptions = { virtuals: true };
const supportedOps = {
  'find': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.find({}).lean(leanOptions).exec().then(res => res[0]);
  },
  'findById': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.findById(docId).lean(leanOptions).exec();
  },
  'findByIdAndUpdate': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.findByIdAndUpdate(docId, {}).lean(leanOptions).exec();
  },
  'findOne': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.findOne({}).lean(leanOptions).exec();
  },
  'findOneAndUpdate': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.findOneAndUpdate({}, {}).lean(leanOptions).exec();
  },
};
const supportedOpsKeys = Object.keys(supportedOps);

describe('Top level leaned virtuals work', function() {
  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        const doc = yield supportedOps[key](baseModel, baseDocId);
        assert.ok(doc);
        assert.equal(doc.id, doc._id.toHexString());
        assert.equal(doc.name, 'Val');
        assert.equal(doc.lowerCaseName, 'val');
      });
    });
  });
});

describe('Cursor', function() {
  it('works (gh-21)', function() {
    return co(function*() {
      const schema = new mongoose.Schema({ email: String });
      schema.virtual('lower').get(function() {
        return this.email.toLowerCase();
      });
      schema.plugin(mongooseLeanVirtuals);

      const Model = mongoose.model('gh21', schema);
      yield Model.create({ email: 'FOO@BAR' });

      const cursor = Model.find().lean({ virtuals: true }).cursor();
      const doc = yield cursor.next();
      assert.equal(doc.email, 'FOO@BAR');
      assert.equal(doc.lower, 'foo@bar');
    });
  });
});

describe('Nested virtuals work', function() {
  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        const doc = yield supportedOps[key](baseModel, baseDocId);
        assert.ok(doc);
        assert.equal(doc.nested.test, 'Foo');
        assert.equal(doc.nested.upperCaseTest, 'FOO');
      });
    });
  });
});

describe('Virtuals work with cursor', function() {
  it('with find', function() {
    return baseModel.find().lean({ virtuals: true }).cursor().eachAsync(doc => {
      assert.ok(!doc.$__);
      assert.equal(doc.name, 'Val');
      assert.equal(doc.lowerCaseName, 'val');
    });
  });
});

// Skipping for now since this doesn't work.
describe.skip('Nested schema virtuals work', function() {
  let parentDocId;
  let parentModel;

  before(function() {
    return co(function*() {
      const parentSchema = new mongoose.Schema({
        nested: baseSchema,
        arr: [baseSchema]
      });
      parentSchema.plugin(mongooseLeanVirtuals);
      parentModel = mongoose.model('parentModel', parentSchema);

      const parentDoc = yield parentModel.create({
        nested: baseObj,
        arr: [baseObj, baseObj],
      });
      parentDocId = parentDoc._id;
    });
  });

  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        const doc = yield supportedOps[key](parentModel, parentDocId);
        assert.ok(doc);
        assert.equal(doc.nested.name, 'Val');
        assert.equal(doc.nested.lowerCaseName, 'val');
        assert.equal(doc.nested.nested.test, 'Foo');
        assert.equal(doc.nested.nested.upperCaseTest, 'FOO');
        doc.arr.forEach((doc) => {
          assert.equal(doc.name, 'Val');
          assert.equal(doc.lowerCaseName, 'val');
          assert.equal(doc.nested.test, 'Foo');
          assert.equal(doc.nested.upperCaseTest, 'FOO');
        });
      });
    });
  });

  it('with nested schemas (gh-20)', function() {
    const schema = new mongoose.Schema({ name: String });
    schema.virtual('lower').get(function() {
      return this.name.toLowerCase();
    });

    const parentSchema = new mongoose.Schema({
      nested: schema,
      arr: [schema]
    });
    parentSchema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh20', parentSchema);

    return co(function*() {
      yield Model.create({
        nested: { name: 'FOO' },
        arr: [{ name: 'BAR' }, { name: 'BAZ' }]
      });

      const doc = yield Model.findOne().lean({ virtuals: true });

      assert.equal(doc.nested.lower, 'foo');
      assert.equal(doc.arr[0].lower, 'bar');
      assert.equal(doc.arr[1].lower, 'baz');
    });
  });
});
