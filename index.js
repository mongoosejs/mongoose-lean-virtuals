'use strict';

module.exports = function mongooseLeanVirtuals(schema) {
  var virtuals = [];
  var keys = Object.keys(schema.virtuals);
  for (var i = 0; i < keys.length; ++i) {
    if (!schema.virtuals[keys[i]].ref) {
      virtuals.push(keys[i]);
    }
  }

  schema.post('find', attachVirtuals(schema, virtuals));
  schema.post('findOne', attachVirtuals(schema, virtuals));
  schema.post('findOneAndUpdate', attachVirtuals(schema, virtuals));
};

function attachVirtuals(schema, virtuals) {
  return function(res) {
    if (res == null) {
      return
    }

    if (this._mongooseOptions.lean && this._mongooseOptions.lean.virtuals) {
      var toApply = virtuals;
      if (Array.isArray(this._mongooseOptions.lean.virtuals)) {
        toApply = this._mongooseOptions.lean.virtuals;
      }
      var numVirtuals = toApply.length;
      if (Array.isArray(res)) {
        var len = res.length;
        for (var i = 0; i < len; ++i) {
          attachVirtualsToDoc(res[i], toApply, numVirtuals);
        }
      } else {
        attachVirtualsToDoc(res, toApply, numVirtuals);
      }
    }
  };

  function attachVirtualsToDoc(doc, virtuals, numVirtuals) {
    for (var i = 0; i < numVirtuals; ++i) {
      var virtual = virtuals[i];
      var sp = virtual.split('.');
      var cur = doc;
      for (var j = 0; j < sp.length - 1; ++j) {
        cur[sp[j]] = sp[j] in cur ? cur[sp[j]] : {};
        cur = cur[sp[j]];
      }
      cur[sp[sp.length - 1]] =schema.virtuals[virtual].applyGetters(void 0, doc);
    }
  }
}
