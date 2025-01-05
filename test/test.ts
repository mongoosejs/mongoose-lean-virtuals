/// <reference types="../index.d.ts" />

import * as mongoose from 'mongoose';
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
