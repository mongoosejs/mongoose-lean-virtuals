'use strict';

const assert = require('assert');
const co = require('co');
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('../');

const Schema = mongoose.Schema;

let baseDocId;
let baseDocIdToDelete;
let baseDocIdToRemove;
let baseModel;
let baseObj;
let baseSchema;

const createRemovableDocs = () => {
  return co(function*() {
    const baseDocToDelete = yield baseModel.create(baseObj);
    const baseDocToRemove = yield baseModel.create(baseObj);
    baseDocIdToDelete = baseDocToDelete._id;
    baseDocIdToRemove = baseDocToRemove._id;
  });
};

const getDocIdBySupportedOp = (op) => {
  if (op === 'findOneAndDelete') {
    return baseDocIdToDelete;
  } else if (op === 'findOneAndRemove') {
    return baseDocIdToRemove;
  } else {
    return baseDocId;
  }
};

before(function() {
  return co(function*() {
    yield mongoose.connect('mongodb://localhost:27017/mongooseLeanVirtuals', {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true
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
  'findOneAndRemove': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.findOneAndRemove({ _id: docId }).lean(leanOptions).exec();
  },
  'findOneAndDelete': function(model, docId, leanOptions) {
    leanOptions = leanOptions || defaultLeanOptions;
    return model.findOneAndDelete({ _id: docId }).lean(leanOptions).exec();
  },
};
const supportedOpsKeys = Object.keys(supportedOps);

describe('Top level leaned virtuals work', function() {
  before(function() {
    createRemovableDocs();
  });
  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        const docId = getDocIdBySupportedOp(key);
        const doc = yield supportedOps[key](baseModel, docId);
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
  before(function() {
    createRemovableDocs();
  });
  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        const docId = getDocIdBySupportedOp(key);
        const doc = yield supportedOps[key](baseModel, docId);
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
describe('Nested schema virtuals work', function() {
  let parentBaseDocId;
  let parentDocIdToRemove;
  let parentDocIdToDelete;
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
      const parentDocToRemove = yield parentModel.create({
        nested: baseObj,
        arr: [baseObj, baseObj],
      });
      const parentDocToDelete = yield parentModel.create({
        nested: baseObj,
        arr: [baseObj, baseObj],
      });
      parentBaseDocId = parentDoc._id;
      parentDocIdToRemove = parentDocToRemove._id;
      parentDocIdToDelete = parentDocToDelete._id;
    });
  });

  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        let parentDocId = parentBaseDocId;
        if (key === 'findOneAndRemove') {
          parentDocId = parentDocIdToRemove;
        }
        if (key === 'findOneAndDelete') {
          parentDocId = parentDocIdToDelete;
        }
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

  it('can access parent doc (gh-40) (gh-41)', function() {
    const childSchema = new mongoose.Schema({ firstName: String });
    childSchema.virtual('fullName').get(function() {
      if (this instanceof mongoose.Document) {
        return `${this.firstName} ${this.parent().lastName}`;
      }
      return `${this.firstName} ${mongooseLeanVirtuals.parent(this).lastName}`;
    });

    const parentSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      child: childSchema,
      children: [childSchema]
    });
    parentSchema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh40', parentSchema);

    return co(function*() {
      yield Model.create({
        firstName: 'Anakin',
        lastName: 'Skywalker',
        child: { firstName: 'Luke' },
        children: [{ firstName: 'Luke' }, null]
      });

      let doc = yield Model.findOne().lean({ virtuals: true });

      assert.equal(doc.child.fullName, 'Luke Skywalker');
      assert.equal(doc.children[0].fullName, 'Luke Skywalker');
      assert.equal(doc.children[1], null);
    });
  });

  it('child schemas (gh-28)', function() {
    const barSchema = Schema({ number: Number });
    barSchema.plugin(mongooseLeanVirtuals);
    barSchema.virtual('doubleNumber').get(function() {
      return this.number * 2;
    });
    const Bar = mongoose.model('gh28_bar', barSchema);

    const fooSchema = Schema({ bars: [Bar.schema] });
    fooSchema.plugin(mongooseLeanVirtuals);
    fooSchema.virtual('barDoubleTotal').get(function() {
      return this.bars.map(b => b.doubleNumber).reduce((a, c) => a + c);
    });
    const Foo = mongoose.model('gh28_foo', fooSchema);

    return co(function*() {
      yield Foo.create({ bars: [{ number: 1 }, { number: 2 }] });

      const doc = yield Foo.findOne().lean({ virtuals: true });
      assert.equal(doc.barDoubleTotal, 6);
    });
  });
});

it('works with recursive schemas (gh-33)', function() {
  const postSchema = Schema({
    title: String,
    content: String
  });
  const commentSchema = Schema({
    content: String
  });
  commentSchema.virtual('answer').get(() => 42);
  commentSchema.add({
    comments: [commentSchema]
  });
  postSchema.add({ comments: [commentSchema] });
  postSchema.plugin(mongooseLeanVirtuals);

  const Post = mongoose.model('gh33_Post', postSchema);

  return co(function*() {
    yield Post.create({
      title: 'Test',
      content: 'This is a test',
      comments: [{ content: 'It works!' }]
    });

    const doc = yield Post.findOne().lean({ virtuals: true });
    assert.equal(doc.comments.length, 1);
    assert.equal(doc.comments[0].answer, 42);
  });
});

it('applies virtuals in doubly nested arrays (gh-38)', function() {
  const subArraySchema = Schema({ name: String });
  subArraySchema.virtual('lowercase').get(function() {
    return this.name.toLowerCase();
  });

  const arraySchema = Schema({ subArray: [subArraySchema] });
  const testSchema = Schema({ title: String, array: [arraySchema] });
  testSchema.plugin(mongooseLeanVirtuals);
  const Model = mongoose.model('gh38', testSchema);

  return co(function*() {
    yield Model.create({
      title: 'test',
      array: [{
        subArray: [{
          name: 'TEST',
        }]
      }]
    });

    const testDoc = yield Model.findOne({ title: 'test' }).lean({ virtuals: true });
    const subObject = testDoc.array[0].subArray[0];
    assert.equal(subObject.name, 'TEST');
    assert.equal(subObject.lowercase, 'test');
  });
});

describe('Discriminators work', () => {
  let childDocId;
  let childModel;

  before(function() {
    return co(function*() {
      const childSchema = new mongoose.Schema({
        name: String,
        nested2: {
          test: String
        }
      });
      childSchema.virtual('upperCaseName').get(function() {
        return this.name.toUpperCase();
      });
      childSchema.virtual('nested.lowerCaseTest').get(function() {
        return this.nested.test.toLowerCase();
      });

      childModel = baseModel.discriminator('childModel', childSchema);

      const childDoc = yield childModel.create({
        name: 'Val',
        nested: {
          test: 'Foo',
        }
      });
      childDocId = childDoc._id;

      yield childModel.create({
        name: 'Val',
        nested: {
          test: 'Foo',
        }
      });
    });
  });

  it('with find', function() {
    return co(function*() {
      const docs = yield childModel.find();
      assert.ok(docs);
      docs.forEach((doc) => {
        assert.equal(doc.name, 'Val');
        assert.equal(doc.lowerCaseName, 'val');
        assert.equal(doc.upperCaseName, 'VAL');
        assert.equal(doc.nested.test, 'Foo');
        assert.equal(doc.nested.upperCaseTest, 'FOO');
        assert.equal(doc.nested.lowerCaseTest, 'foo');
      });
    });
  });

  it('with findOne', () => {
    return co(function*() {
      const doc = yield supportedOps.find(childModel, childDocId);
      assert.ok(doc);
      assert.equal(doc.name, 'Val');
      assert.equal(doc.lowerCaseName, 'val');
      assert.equal(doc.upperCaseName, 'VAL');
      assert.equal(doc.nested.test, 'Foo');
      assert.equal(doc.nested.upperCaseTest, 'FOO');
      assert.equal(doc.nested.lowerCaseTest, 'foo');
    });
  });
});