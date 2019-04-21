'use strict';

const assert = require('assert');
const co = require('co');
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('../');

describe('tests', function() {
  it('works', function(done) {
    const schema = new mongoose.Schema({
      name: String
    });
    schema.virtual('lowercaseName').get(function() {
      return this.name.toLowerCase();
    });
    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('t1', schema);

    Model.create({ name: 'Val' }, function(error) {
      assert.ifError(error);

      Model.findOne({}).lean({ virtuals: true }).exec(function(error, res) {
        assert.ifError(error);
        assert.ok(res);
        assert.equal(res.id, res._id.toHexString());
        assert.equal(res.name, 'Val');
        assert.equal(res.lowercaseName, 'val');
        done();
      });
    });
  });

  it('nested', function(done) {
    const schema = new mongoose.Schema({
      name: String,
      nested: {
        test: String
      }
    });
    schema.virtual('names.lowercase').get(function() {
      return this.name.toLowerCase();
    });
    schema.virtual('nested.test2').get(function() {
      return this.nested.test.toUpperCase();
    });
    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('t2', schema);

    Model.create({ name: 'Val', nested: { test: 'val' } }, function(error) {
      assert.ifError(error);

      Model.findOne({}).lean({ virtuals: true }).exec(function(error, res) {
        assert.ifError(error);
        assert.ok(res);
        assert.equal(res.name, 'Val');
        assert.equal(res.names.lowercase, 'val');
        assert.equal(res.nested.test, 'val');
        assert.equal(res.nested.test2, 'VAL');
        done();
      });
    });
  });

  it('with cursor', function() {
    const schema = new mongoose.Schema({ name: String });
    schema.virtual('lower').get(function() {
      return this.name.toLowerCase();
    });
    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('t3', schema);

    return co(function*() {
      yield Model.create({ name: 'FOO' });

      yield Model.find().lean({ virtuals: true }).cursor().eachAsync(doc => {
        assert.ok(!doc.$__);
        assert.equal(doc.name, 'FOO');
        assert.equal(doc.lower, 'foo');
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
