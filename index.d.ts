import { Schema } from "mongoose";
export const mongooseLeanVirtuals: {
  (schema: Schema, opts?: any): void;
  parent: (value: any) => any;
};

export default mongooseLeanVirtuals;
