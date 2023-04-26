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
    yield mongoose.connect('mongodb://127.0.0.1:27017/mongooseLeanVirtuals');
    yield mongoose.connection.dropDatabase();

    baseSchema = new mongoose.Schema({
      name: String,
      nested: {
        test: String,
        objectTest: {
          test: String
        }
      }
    });
    baseSchema.virtual('lowerCaseName').get(function() {
      return this.name.toLowerCase();
    });
    baseSchema.virtual('nested.upperCaseTest').get(function() {
      return this.nested.test.toUpperCase();
    });
    baseSchema.virtual('nested.virtualObjectTest').get(function() {
      return this.nested.objectTest;
    });
    baseSchema.plugin(mongooseLeanVirtuals);

    baseModel = mongoose.model('baseModel', baseSchema);

    baseObj = {
      name: 'Val',
      nested: {
        test: 'Foo',
        objectTest: {
          test: 'Bar'
        }
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
        assert.equal(doc.nested.objectTest.test, 'Bar');
        assert.equal(doc.nested.virtualObjectTest.test, 'Bar');
      });
    });
  });
});

describe('Nested object virtuals work (gh-43)', function() {
  before(function() {
    createRemovableDocs();
  });
  supportedOpsKeys.forEach(key => {
    it(`with ${key}`, function() {
      return co(function*() {
        const docId = getDocIdBySupportedOp(key);
        const doc = yield supportedOps[key](baseModel, docId);
        assert.ok(doc);
        assert.equal(doc.nested.objectTest.test, 'Bar');
        assert.equal(doc.nested.virtualObjectTest.test, 'Bar');
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

  it('can access parent doc (gh-40) (gh-41) (gh-51)', function() {
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
      let doc = yield Model.create({
        firstName: 'Anakin',
        lastName: 'Skywalker',
        child: { firstName: 'Luke' },
        children: [{ firstName: 'Luke' }, null]
      });

      yield Model.collection.updateOne({ _id: doc._id }, { $push: { children: 42 } });

      // Would error out in v0.7.2 because of parent tracking and the '42' element
      doc = yield Model.findOne().lean({ virtuals: true });

      assert.equal(doc.child.fullName, 'Luke Skywalker');
      assert.equal(doc.children[0].fullName, 'Luke Skywalker');
      assert.equal(doc.children[1], null);
      assert.equal(doc.children[2], 42);

      doc = yield Model.find().lean({ virtuals: true }).then(res => res[0]);

      assert.equal(doc.child.fullName, 'Luke Skywalker');
      assert.equal(doc.children[0].fullName, 'Luke Skywalker');
      assert.equal(doc.children[1], null);
      assert.equal(doc.children[2], 42);

      yield Model.create({
        firstName: 'Han',
        lastName: 'Solo',
        child: { firstName: 'Anakin' },
        children: [{ firstName: 'Anakin' }, null]
      });
      const docs = yield Model.find().sort({ lastName: -1 }).lean({ virtuals: true });
      assert.equal(docs[0].child.fullName, 'Anakin Solo');
      assert.equal(docs[0].children[0].fullName, 'Anakin Solo');
      assert.equal(docs[0].children[1], null);

      assert.equal(docs[1].child.fullName, 'Luke Skywalker');
      assert.equal(docs[1].children[0].fullName, 'Luke Skywalker');
      assert.equal(docs[1].children[1], null);
      assert.equal(docs[1].children[2], 42);
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

it('skips non-existent virtuals if specifying a list of virtuals (gh-42)', function() {
  const testSchema = Schema({ title: String });
  testSchema.virtual('test').get(() => 42);
  testSchema.plugin(mongooseLeanVirtuals);
  const Model = mongoose.model('gh42', testSchema);

  return co(function*() {
    yield Model.create({ title: 'test' });

    const testDoc = yield Model.findOne({ title: 'test' }).lean({ virtuals: ['test', 'doesntexist'] });
    assert.equal(testDoc.test, 42);
    assert.strictEqual(testDoc.doesntexist, void 0);
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

  it('correctly applies getters on virtuals in lean queries', function() {
    let getterCalled = false;
    const childSchema = new mongoose.Schema({ name: String, parentId: 'ObjectId' });
    const Child = mongoose.model('C', childSchema);

    const parentSchema = new mongoose.Schema({ name: String });
    parentSchema.virtual('children', {
      ref: 'C',
      localField: '_id',
      foreignField: 'parentId'
    });
    parentSchema.virtual('children').getters.unshift(function(v) {
      getterCalled = true;
      return v;
    });
    parentSchema.plugin(mongooseLeanVirtuals);
    const Parent = mongoose.model('P', parentSchema);

    return Parent.create({ name: 'Darth Vader' })
      .then(p => Child.create({ name: 'Luke Skywalker', parentId: p }))
      .then(() => Parent.findOne().populate('children').lean({ virtuals: true }))
      .then(doc => {
        assert.ok(getterCalled);
        assert.ok(doc.children);
      });
  });

  it('lets you choose which virtuals to apply in the root schema (gh-34)', function() {
    const schema = new mongoose.Schema({
      name: String,
      childs: [{ other: String }],
    }, { id: false });

    schema.virtual('lowercaseName').get(function() {
      return this.name.toLowerCase();
    });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh34a', schema);

    return Model.create({ name: 'Val', childs: [{ other: 'val' }] }).
      then(() => Model.findOne().lean({ virtuals: ['lowercaseName'] })).
      then(result => {
        assert.equal(result.lowercaseName, 'val');
      });
  });

  it('lets you choose which virtuals to apply in the nested schema (gh-34)', function() {
    const subschema = new mongoose.Schema({
      other: String,
    }, { id: false });

    subschema.virtual('uppercaseOther').get(function() {
      return this.other.toUpperCase();
    });

    const schema = new mongoose.Schema({
      name: String,
      childs: [subschema],
    }, { id: false });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh34b', schema);

    return Model.create({ name: 'Val', childs: [{ other: 'val' }] }).
      then(() => Model.findOne().lean({ virtuals: ['childs.uppercaseOther'] })).
      then(result => {
        assert.equal(result.childs[0].uppercaseOther, 'VAL');
      });
  });

  it('lets you choose which virtuals to apply in the root and nested (gh-34)', function() {
    const subschema = new mongoose.Schema({
      other: String,
    }, { id: false });

    subschema.virtual('uppercaseOther').get(function() {
      return this.other.toUpperCase();
    });

    const schema = new mongoose.Schema({
      name: String,
      childs: [subschema],
    }, { id: false });

    schema.virtual('lowercaseName').get(function() {
      return this.name.toLowerCase();
    });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh34c', schema);

    return Model.create({ name: 'Val', childs: [{ other: 'val' }] }).
      then(() => Model.findOne().lean({ virtuals: ['lowercaseName', 'childs.uppercaseOther'] })).
      then(result => {
        assert.equal(result.lowercaseName, 'val');
        assert.equal(result.childs[0].uppercaseOther, 'VAL');
      });
  });

  it('nested virtuals that are objects return the value (gh-43)', function() {
    const schema = new mongoose.Schema({
      nested: {
        test: {
          a: String
        }
      }
    }, { id: false });

    schema.virtual('nested.test2').get(function() {
      return this.nested.test;
    });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh43a', schema);

    return Model.create({ nested: { test: { a: 'Val' } } }).
      then(() => Model.findOne().lean({ virtuals: ['nested.test2'] })).
      then(result => {
        assert.equal(result.nested.test.a, 'Val');
        assert.equal(result.nested.test2.a, 'Val');
      });
  });

  it('nested virtuals that are objects return the value that also have child schemas (gh-43)', function() {
    const subschema = new mongoose.Schema({
      other: String,
    }, { id: false });

    subschema.virtual('uppercaseOther').get(function() {
      return this.other.toUpperCase();
    });

    const schema = new mongoose.Schema({
      childs: [subschema],
      nested: {
        test: {
          a: String
        }
      }
    }, { id: false });

    schema.virtual('nested.test2').get(function() {
      return this.nested.test;
    });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('gh43b', schema);

    return Model.create({ childs: [{ other: 'Val' }], nested: { test: { a: 'Val' } } }).
      then(() => Model.findOne().lean({ virtuals: ['nested.test2'] })).
      then(result => {
        assert.equal(result.nested.test.a, 'Val');
        assert.equal(result.nested.test2.a, 'Val');
      });
  });

  it('sets empty array if no result and justOne: false', function() {
    const childSchema = new mongoose.Schema({ name: String, parentId: 'ObjectId' });
    const Child = mongoose.model('C2', childSchema);

    const parentSchema = new mongoose.Schema({ name: String });
    parentSchema.virtual('children', {
      ref: 'C2',
      localField: '_id',
      foreignField: 'parentId'
    });

    parentSchema.plugin(mongooseLeanVirtuals);
    const Parent = mongoose.model('P2', parentSchema);

    return Parent.create({ name: 'Darth Vader' })
      .then(() => Parent.findOne().populate('children').lean({ virtuals: true }))
      .then(res => assert.deepEqual(res.children, []));
  });

  it('returns the same nested and referenced virtuals whether all virtuals selected or each specifically selected', function() {
    let childGetterCalled = false;
    let parentGetterCalled = false;
    let surnameGetterCalled = false;
    let allegianceGetterCalled = false;

    const surnameSchema = new mongoose.Schema({
      name: String,
    }, { id: false });
    surnameSchema.virtual('uppercaseSurname').get(function() {
      surnameGetterCalled = true;
      return this.name.toUpperCase();
    });

    const childSchema = new mongoose.Schema({
      name: String,
      surname: surnameSchema,
    });
    childSchema.plugin(mongooseLeanVirtuals);
    const Child = mongoose.model('Child2', childSchema);
    childSchema.virtual('uppercaseName').get(function() {
      childGetterCalled = true;
      return this.name.toUpperCase();
    });

    const allegianceSchema = new mongoose.Schema({
      name: String,
    }, { id: false });
    allegianceSchema.virtual('uppercaseAllegiance').get(function() {
      allegianceGetterCalled = true;
      return this.name.toUpperCase();
    });

    const parentSchema = new mongoose.Schema({
      role: String,
      surname: surnameSchema,
      allegiance: allegianceSchema,
      child: {type: mongoose.Schema.Types.ObjectId, ref: 'Child2'},
    }, { id: false });

    parentSchema.virtual('uppercaseRole').get(function() {
      parentGetterCalled = true;
      return this.role.toUpperCase();
    });
    parentSchema.plugin(mongooseLeanVirtuals);
    const Parent = mongoose.model('Parent2', parentSchema);

    return Child.create({ name: 'Luke', surname: {name: 'Skywalker'} })
      .then(c => Parent.create({ role: 'Father', surname: {name: 'Vader'}, allegiance: {name: 'Empire'}, child: c }))
      .then(() => Parent.findOne().populate('child').lean({ virtuals: true }))
      .then(doc => {
        assert.ok(childGetterCalled);
        assert.ok(parentGetterCalled);
        assert.ok(surnameGetterCalled);
        assert.ok(allegianceGetterCalled);
        assert.equal(doc.role, 'Father');
        assert.equal(doc.uppercaseRole, 'FATHER');
        assert.equal(doc.surname.name, 'Vader');
        assert.equal(doc.surname.uppercaseSurname, 'VADER');
        assert.equal(doc.allegiance.name, 'Empire');
        assert.equal(doc.allegiance.uppercaseAllegiance, 'EMPIRE');
        assert.equal(doc.child.name, 'Luke');
        assert.equal(doc.child.uppercaseName, 'LUKE');
        assert.equal(doc.child.surname.name, 'Skywalker');
        assert.equal(doc.child.surname.uppercaseSurname, 'SKYWALKER');
        // reset getter checks
        childGetterCalled = false;
        parentGetterCalled = false;
        surnameGetterCalled = false;
        allegianceGetterCalled = false;
      })
      .then(() => Parent.findOne().populate('child').lean({
        virtuals: ['uppercaseRole', 'surname.uppercaseSurname', 'allegiance.uppercaseAllegiance', 'child.uppercaseName', 'child.surname.uppercaseSurname']
      }))
      .then(doc => {
        assert.ok(childGetterCalled);
        assert.ok(parentGetterCalled);
        assert.ok(surnameGetterCalled);
        assert.ok(allegianceGetterCalled);
        assert.equal(doc.role, 'Father');
        assert.equal(doc.uppercaseRole, 'FATHER');
        assert.equal(doc.surname.name, 'Vader');
        assert.equal(doc.surname.uppercaseSurname, 'VADER');
        assert.equal(doc.allegiance.name, 'Empire');
        assert.equal(doc.allegiance.uppercaseAllegiance, 'EMPIRE');
        assert.equal(doc.child.name, 'Luke');
        assert.equal(doc.child.uppercaseName, 'LUKE');
        assert.equal(doc.child.surname.name, 'Skywalker');
        assert.equal(doc.child.surname.uppercaseSurname, 'SKYWALKER');
      });
  });
  describe('enabledByDefault', function() {
    it('should attach virtuals if enabledByDefault is set', function() {
      const testSchema = new mongoose.Schema({
        name: String
      });
      testSchema.virtual('lowercase').get(function() {
        return this.name.toLowerCase();
      });

      testSchema.plugin(mongooseLeanVirtuals, { enabledByDefault: true });

      const Test = mongoose.model('gh52', testSchema);
      return Test.create({ name: 'TEST TESTERSON' }).then(() => Test.findOne().lean()).then(doc => {
        assert.equal(doc.lowercase, 'test testerson');
      });
    });
  });
});
