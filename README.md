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

# TypeScript

Mongoose's `lean()` function typings don't know about `virtuals: true`, so you need to explicitly set the type when calling `lean()`.
This module exports a convenient `VirtualsForModel` helper type that returns the virtual property types for a given model.
The below example shows using `VirtualsForModel` along with `lean<TypeOverride>()`.

```ts
import mongooseLeanVirtuals, { VirtualsForModel } from "mongoose-lean-virtuals";

interface ITest {
  name: string
}

const testSchema = new mongoose.Schema(
  { name: { type: String, required: true } },
  {
    virtuals: {
      nameUpper: {
        get() {
          return this.name.toUpperCase();
        }
      }
    }
  }
);

testSchema.plugin(mongooseLeanVirtuals);

const TestModel = mongoose.model('Test', testSchema);

TestModel.findOne().lean<ITest & VirtualsForModel<typeof TestModel>>({ virtuals: true }).orFail().then(doc => {
  const name: string = doc.name;
  const nameUpper: string = doc.nameUpper;
});
```
