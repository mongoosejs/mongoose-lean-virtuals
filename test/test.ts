import * as mongoose from 'mongoose';
import * as mongooseLeanVirtuals from "mongoose-lean-virtuals";

interface Test {
    name: string
}
/*
const testSchema = new mongoose.Schema({
    name: String
});
*/

const testSchema = new mongoose.Schema<Test>({
    name: String
});

testSchema.plugin(mongooseLeanVirtuals.mongooseLeanVirtuals); 