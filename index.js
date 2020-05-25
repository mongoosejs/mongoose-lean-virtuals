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
  schema.post('findOneAndRemove', fn);
  schema.post('findOneAndDelete', fn);
};

function attachVirtualsMiddleware(schema) {
  return function(res) {
    attachVirtualsToRes.call(this, res, schema);
  };
}

function attachVirtualsToRes(res, schema) {
  if (Array.isArray(res)) {
    res.forEach((res) => attachVirtuals.call(this, schema, res));
  }
  else {
    attachVirtuals.call(this, schema, res);
  }
}

function attachVirtuals(schema, doc) {
  if (doc == null) {
    return doc;
  }
  if (!this._mongooseOptions.lean || !this._mongooseOptions.lean.virtuals) {
    return doc;
  }

  if (schema.discriminators && Object.entries(schema.discriminators).length !== 0) {
    Object.values(schema.discriminators).some(
      function findCorrectDiscriminator(discriminator) {
        const key = discriminator.discriminatorMapping.key;
        const value = discriminator.discriminatorMapping.value;
        if (doc[key] == value) {
          schema = discriminator;
          return true;
        }
      }
    );
  }

  const virtuals = [];
  const keys = Object.keys(schema.virtuals);
  for (let i = 0; i < keys.length; ++i) {
    virtuals.push(keys[i]);
  }

  const prop = this._mongooseOptions.lean.virtuals;
  let toApply = virtuals;
  if (Array.isArray(prop)) {
    toApply = prop;
  }

  applyVirtualsToChildren(this, schema, doc);

  return attachVirtualsToDoc(schema, doc, toApply);
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

    attachVirtualsToRes.call(doc, _doc, _schema);
  }
}

function attachVirtualsToDoc(schema, doc, virtuals) {
  const numVirtuals = virtuals.length;
  if (doc == null) return;

  for (let i = 0; i < numVirtuals; ++i) {
    const virtual = virtuals[i];
    const sp = virtual.split('.');
    let cur = doc;
    for (let j = 0; j < sp.length - 1; ++j) {
      cur[sp[j]] = sp[j] in cur ? cur[sp[j]] : {};
      cur = cur[sp[j]];
    }
    cur[sp[sp.length - 1]] = schema.virtuals[virtual].applyGetters(cur[sp[sp.length - 1]], doc);
  }
}
