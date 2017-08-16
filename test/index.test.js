'use strict';

const assert = require('assert');
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
});
