declare module "mongoose-lean-virtuals" {
    import mongoose = require('mongoose');
    export default function mongooseLeanVirtuals(schema: mongoose.Schema<any, any, any, any>, opts?: any): void;
    export function mongooseLeanVirtuals(schema: mongoose.Schema<any, any, any, any>, opts?: any): void;
  }