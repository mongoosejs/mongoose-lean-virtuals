

# examples

## It attaches virtuals to result of find, findOne, findById, findByIdAndUpdate, and findOneAndUpdate if lean

```javascript
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
```

## It lets you choose which virtuals to apply


If you specify a list of virtuals in `lean()`, this plugin will only
apply those virtuals. This lets you pick which virtuals show up.

```javascript
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
```

## It lets you access a lean subdocument's parent


Accessing the parent document is tricky because lean documents don't
have a `parent()` method or any other Mongoose-specific functionality.
To support that use case, this plugin exports a `parent()` function that
lets you get a document's parent.

```javascript
const childSchema = new mongoose.Schema({ firstName: String });
childSchema.virtual('fullName').get(function() {
  if (this instanceof mongoose.Document) {
    return `${this.firstName} ${this.parent().lastName}`;
  }
  // This `fullName` virtual is in a subdocument, so in order to get the
  // parent's `lastName` you need to use this plugin's `parent()` function.
  return `${this.firstName} ${mongooseLeanVirtuals.parent(this).lastName}`;
});

const parentSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  child: childSchema
});

parentSchema.plugin(mongooseLeanVirtuals);

const Parent = mongoose.model('Parent', parentSchema);

const doc = {
  firstName: 'Anakin',
  lastName: 'Skywalker',
  child: { firstName: 'Luke' }
};
return Parent.create(doc).
  then(() => Parent.findOne().lean({ virtuals: true })).
  then(result => {
    assert.equal(result.child.fullName, 'Luke Skywalker');
  });
```
