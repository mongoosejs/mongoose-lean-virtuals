# mongoose-lean-virtuals

Attach virtuals to the results of mongoose queries when using [`.lean()`](https://mongoosejs.com/docs/api.html#query_Query-lean).

[Read the docs here](http://plugins.mongoosejs.io/plugins/lean-virtuals).

# Usage

```javascript
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

// Example schema
const userSchema = new mongoose.Schema({ name: String });

userSchema.virtual('lowercase').get(function() {
  return this.name.toLowerCase();
});

// Now, the `lowercase` property will show up even if you do a lean query
userSchema.plugin(mongooseLeanVirtuals);

// Later

// You **must** pass `virtuals: true` to `lean()`, otherwise `lowercase`
// won't be in `res`
const res = await UserModel.find().lean({ virtuals: true });
```
