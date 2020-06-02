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
    if (this._mongooseOptions.lean && this._mongooseOptions.lean.virtuals) {
      let virtuals = this._mongooseOptions.lean.virtuals;

      if (Array.isArray(virtuals)) {
        const arr = virtuals;
        virtuals = [];
        const len = arr.length;
        for (let i = 0; i < len; ++i) {
          virtuals.push(arr[i].split('.'));
        }
      }

      attachVirtuals.call(this, schema, res, virtuals);
    }
  };
}

function attachVirtuals(schema, res, virtuals) {
  if (res == null) {
    return res;
  }

  if (schema.discriminators && Object.entries(schema.discriminators).length !== 0) {
    Object.values(schema.discriminators).some(
      function findCorrectDiscriminator(discriminator) {
        const key = discriminator.discriminatorMapping.key;
        const value = discriminator.discriminatorMapping.value;
        if (res[key] == value) {
          schema = discriminator;
          return true;
        }
      }
    );
  }

  let virtualsForChildren = virtuals;
  let toApply;

  if (Array.isArray(virtuals)) {
    virtualsForChildren = [];
    toApply = [];
    const len = virtuals.length;
    for (let i = 0; i < len; ++i) {
      const virtual = virtuals[i];
      if (virtual.length === 1) {
        toApply.push(virtual[0]);
      } else {
        virtualsForChildren.push(virtual);
      }
    }
  } else {
    toApply = Object.keys(schema.virtuals);
  }

  applyVirtualsToChildren(this, schema, res, virtualsForChildren);
  return applyVirtualsToResult(schema, res, toApply);
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

function applyVirtualsToChildren(doc, schema, res, virtuals) {
  const len = schema.childSchemas.length;
  for (let i = 0; i < len; ++i) {
    const _path = schema.childSchemas[i].model.path;
    const _schema = schema.childSchemas[i].schema;
    if (!_path) {
      continue;
    }
    const _doc = mpath.get(_path, res);
    if (_doc == null) {
      continue;
    }

    let virtualsForChild = virtuals;
    if (Array.isArray(virtuals)) {
      virtualsForChild = [];
      const len = virtuals.length;
      for (let i = 0; i < len; ++i) {
        const virtual = virtuals[i];
        if (virtual[0] == _path) {
          virtualsForChild.push(virtual.slice(1));
        }
      }
    }

    attachVirtuals.call(doc, _schema, _doc, virtualsForChild);
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
    cur[sp[sp.length - 1]] = schema.virtuals[virtual].applyGetters(cur[sp[sp.length - 1]], doc);
  }
}
