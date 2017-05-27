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
        assert.equal(res.name, 'Val');
        assert.equal(res.lowercaseName, 'val');
        done();
      });
    });
  });
});
