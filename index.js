'use strict';

const mpath = require('mpath');

module.exports = function mongooseLeanVirtuals(schema) {
  const fn = attachVirtualsMiddleware(schema);
  schema.pre('find', function() {
    if (typeof this.map === 'function') {
      this.map((res) => {
        fn.call(this, res);
        return res;
      });
    } else {
      this.options.transform = (res) => {
        fn.call(this, res);
        return res;
      };
    }
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
  const virtuals = [];
  const keys = Object.keys(schema.virtuals);
  for (let i = 0; i < keys.length; ++i) {
    if (!schema.virtuals[keys[i]].ref && (!schema.virtuals[keys[i]].options || !schema.virtuals[keys[i]].options.ref)) {
      virtuals.push(keys[i]);
    }
  }

  if (res == null) {
    return;
  }

  if (this._mongooseOptions.lean && this._mongooseOptions.lean.virtuals) {
    const prop = this._mongooseOptions.lean.virtuals;
    let toApply = virtuals;
    if (Array.isArray(prop)) {
      toApply = prop;
    }

    applyVirtualsToChildren(this, schema, res);
    return applyVirtualsToResult(schema, res, toApply);
  } else {
    return res;
  }
}

function applyVirtualsToResult(schema, res, toApply) {
  if (Array.isArray(res)) {
    const len = res.length;
    for (let i = 0; i < len; ++i) {
      attachVirtualsToDoc(schema, res[i], toApply);
    }
    return res;
  } else {
    return attachVirtualsToDoc(schema, res, toApply);
  }
}

function applyVirtualsToChildren(doc, schema, res) {
  for (let i = 0; i < schema.childSchemas.length; ++i) {
    const _path = schema.childSchemas[i].model.path;
    const _schema = schema.childSchemas[i].schema;
    if (!_path) {
      continue;
    }
    const _doc = mpath.get(_path, res);
    if (_doc == null) {
      continue;
    }
    attachVirtuals.call(doc, _schema, _doc);
  }
}

function attachVirtualsToDoc(schema, doc, virtuals) {
  const numVirtuals = virtuals.length;
  if (doc == null) return;
  if (Array.isArray(doc)) {
    for (let i = 0; i < doc.length; ++i) {
      attachVirtualsToDoc(schema, doc[i], virtuals);
    }
    return;
  }
  for (let i = 0; i < numVirtuals; ++i) {
    const virtual = virtuals[i];
    const sp = virtual.split('.');
    let cur = doc;
    for (let j = 0; j < sp.length - 1; ++j) {
      cur[sp[j]] = sp[j] in cur ? cur[sp[j]] : {};
      cur = cur[sp[j]];
    }
    cur[sp[sp.length - 1]] = schema.virtuals[virtual].applyGetters(void 0, doc);
  }
}
