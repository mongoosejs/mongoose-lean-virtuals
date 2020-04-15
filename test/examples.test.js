'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('../');

describe('examples', function() {
  it('attaches virtuals to result of find, findOne, findById, findByIdAndUpdate, and findOneAndUpdate if lean', function() {
    const schema = new mongoose.Schema({
      name: String
    });

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
        const findRes = results[0];
        const findOneRes = results[1];
        const findOneAndUpdateRes = results[2];
        assert.equal(findRes[0].lowercase, 'val');
        assert.equal(findOneRes.lowercase, 'val');
        assert.equal(findOneAndUpdateRes.lowercase, 'val');

        // Mongoose has an `id` virtual by default that gets the `_id` as a
        // string.
        assert.equal(findRes[0].id, findRes[0]._id.toString());
        assert.equal(findOneRes.id, findOneRes._id.toString());
        assert.equal(findOneAndUpdateRes.id, findOneAndUpdateRes._id.toString());
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

  it('correctly applies getters on virtuals in lean queries', function() {
    let getterCalled = false;
    const childSchema = new mongoose.Schema({ name: String, parentId: 'ObjectId' });
    const Child = mongoose.model('Child', childSchema);

    const parentSchema = new mongoose.Schema({ name: String });
    parentSchema.virtual('children', {
      ref: 'Child',
      localField: '_id',
      foreignField: 'parentId'
    });
    parentSchema.virtual('children').getters.unshift(function(v) {
      assert.ok(v);
      getterCalled = true;
      return v;
    });
    parentSchema.plugin(mongooseLeanVirtuals);
    const Parent = mongoose.model('Parent', parentSchema);

    Parent.create({ name: 'Darth Vader' })
      .then(p => Child.create({ name: 'Luke Skywalker', parentId: p }))
      .then(() => Parent.findOne().populate('children').lean({ virtuals: true }))
      .then(doc => {
        assert.ok(getterCalled);
        assert.ok(doc.children);
      });
  });
});
