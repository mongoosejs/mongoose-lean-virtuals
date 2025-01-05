declare module "mongoose-lean-virtuals" {
  import mongoose = require('mongoose');
  export default function mongooseLeanVirtuals(schema: mongoose.Schema<any, any, any, any>, opts?: any): void;
  export function mongooseLeanVirtuals(schema: mongoose.Schema<any, any, any, any>, opts?: any): void;

  export type VirtualsForModel<ModelType extends mongoose.Model<any, any, any, any>> = ModelType extends mongoose.Model<any, any, any, infer TVirtuals> ? TVirtuals : never;

  export function parent(value: any): any;
}
