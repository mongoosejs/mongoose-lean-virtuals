'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('../');

describe('examples', function() {
  it('attaches virtuals to result of find, findOne, and findOneAndUpdate if lean', function() {
    const schema = new mongoose.Schema({
      name: String
    }, { id: false });

    schema.virtual('lowercase').get(function() {
      return this.name.toLowerCase();
    });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('Test', schema);

    return Model.create({ name: 'Val' }).
      then(() => Promise.all([
        // You **must** pass `virtuals: true` to `lean()`
        Model.find().lean({ virtuals: true }),
        Model.findOne().lean({ virtuals: true }),
        Model.findOneAndUpdate({}, { name: 'VAL' }).lean({ virtuals: true })
      ])).
      then(results => {
        const [findRes, findOneRes, findOneAndUpdateRes] = results;
        assert.equal(findRes[0].lowercase, 'val');
        assert.equal(findOneRes.lowercase, 'val');
        assert.equal(findOneAndUpdateRes.lowercase, 'val');
      });
  });

  /**
   * If you specify a list of virtuals in `lean()`, this plugin will only
   * apply those virtuals. This lets you pick which virtuals show up. */
  it('lets you choose which virtuals to apply', function() {
    const schema = new mongoose.Schema({
      name: String
    }, { id: false });

    schema.virtual('lowercase').get(function() {
      return this.name.toLowerCase();
    });
    schema.virtual('uppercase').get(function() {
      return this.name.toUpperCase();
    });

    schema.plugin(mongooseLeanVirtuals);

    const Model = mongoose.model('Test2', schema);

    return Model.create({ name: 'Val' }).
      then(() => Model.findOne().lean({ virtuals: ['uppercase'] })).
      then(result => {
        assert.equal(result.uppercase, 'VAL');
        assert.ok(!result.lowercase);
      });
  });
});
