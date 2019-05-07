'use strict';

var mpath = require('mpath');

module.exports = function mongooseLeanVirtuals(schema) {
  const fn = attachVirtualsMiddleware(schema);
  schema.pre('find', function() {
    this.options.transform = function(res) {
      fn.call(this.query, res);
      return res;
    };
  });

  schema.post('find', fn);
  schema.post('findOne', fn);
  schema.post('findOneAndUpdate', fn);
};

function attachVirtualsMiddleware(schema) {
  return function(res) {
    attachVirtuals.call(this, schema, res);
  };
}

function attachVirtuals(schema, res) {
  var virtuals = [];
  var keys = Object.keys(schema.virtuals);
  for (var i = 0; i < keys.length; ++i) {
    if (!schema.virtuals[keys[i]].ref && (!schema.virtuals[keys[i]].options || !schema.virtuals[keys[i]].options.ref)) {
      virtuals.push(keys[i]);
    }
  }

  if (res == null) {
    return;
  }

  if (this._mongooseOptions.lean && this._mongooseOptions.lean.virtuals) {
    var toApply = virtuals;
    if (Array.isArray(this._mongooseOptions.lean.virtuals)) {
      toApply = this._mongooseOptions.lean.virtuals;
    }
    var numVirtuals = toApply.length;
    var _ret;
    if (Array.isArray(res)) {
      var len = res.length;
      for (var i = 0; i < len; ++i) {
        attachVirtualsToDoc(schema, res[i], toApply);
      }
      _ret = res;
    } else {
      _ret = attachVirtualsToDoc(schema, res, toApply);
    }

    for (var i = 0; i < schema.childSchemas.length; ++i) {
      var _path = schema.childSchemas[i].model.path;
      var _schema = schema.childSchemas[i].schema;
      var _doc = mpath.get(_path, res);
      if (_doc == null) {
        continue;
      }
      attachVirtuals.call(this, _schema, _doc);
    }

    return _ret;
  } else {
    return res;
  }
};

function attachVirtualsToDoc(schema, doc, virtuals) {
  var numVirtuals = virtuals.length;
  for (var i = 0; i < numVirtuals; ++i) {
    var virtual = virtuals[i];
    var sp = virtual.split('.');
    var cur = doc;
    for (var j = 0; j < sp.length - 1; ++j) {
      cur[sp[j]] = sp[j] in cur ? cur[sp[j]] : {};
      cur = cur[sp[j]];
    }
    cur[sp[sp.length - 1]] = schema.virtuals[virtual].applyGetters(void 0, doc);
  }
  return cur;
}
