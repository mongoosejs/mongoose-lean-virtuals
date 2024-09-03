'use strict';

const mpath = require('mpath');

const documentParentsMap = new WeakMap();
const attachVirtualsFnMap = new WeakMap();

module.exports = function mongooseLeanVirtuals(schema, options) {
  const fn = attachVirtualsMiddleware(schema, options);
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

module.exports.parent = function(obj) {
  if (obj == null) {
    return void 0;
  }
  const res = documentParentsMap.get(obj);
  // Since we do we apply virtuals to children before parents,
  // we may need to call `applyVirtuals()` on the parent if we're
  // accessing the parent from the child.
  if (attachVirtualsFnMap.get(res)) {
    attachVirtualsFnMap.get(res)();
  }
  return res;
};

function attachVirtualsMiddleware(schema, options = {}) {
  return function(res) {
    let virtuals = this._mongooseOptions.lean && this._mongooseOptions.lean.virtuals != null ? this._mongooseOptions.lean.virtuals : options.enabledByDefault;
    if (virtuals) {
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

function attachVirtuals(schema, res, virtuals, parent) {
  if (res == null) {
    return res;
  }

  let virtualsForChildren = virtuals;
  let toApply = null;

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
  }

  let called = false;
  const applyVirtualsToResultOnce = () => {
    if (called) {
      return;
    }
    called = true;
    applyVirtualsToResult(schema, res, toApply);
  };

  addToParentMap(res, parent, applyVirtualsToResultOnce);

  applyVirtualsToChildren(this, schema, res, virtualsForChildren, parent);
  return applyVirtualsToResultOnce();
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

function addToParentMap(res, parent, attachVirtualsToResult) {
  if (res == null) {
    return;
  }

  if (Array.isArray(parent)) {
    for (let i = 0; i < parent.length; ++i) {
      addToParentMap(res[i], parent[i]);
    }
    return;
  }

  if (Array.isArray(res)) {
    for (const _res of res) {
      if (_res != null && typeof _res === 'object') {
        documentParentsMap.set(_res, parent);
        attachVirtualsFnMap.set(_res, attachVirtualsToResult);
      }
    }
    return;
  }

  if (typeof res === 'object') {
    documentParentsMap.set(res, parent);
    attachVirtualsFnMap.set(res, attachVirtualsToResult);
  }
}

function applyVirtualsToChildren(doc, schema, res, virtuals, parent) {
  const len = schema.childSchemas.length;
  let attachedVirtuals = false;
  for (let i = 0; i < len; ++i) {
    const _path = schema.childSchemas[i].model.path;
    const _schema = schema.childSchemas[i].schema;
    if (!_path) {
      continue;
    }
    const _doc = mpath.get(_path, res);
    if (_doc == null || (Array.isArray(_doc) && _doc.flat(Infinity).length === 0)) {
      continue;
    }

    let virtualsForChild = null;
    if (Array.isArray(virtuals)) {
      virtualsForChild = [];
      const len = virtuals.length;
      for (let i = 0; i < len; ++i) {
        const virtual = virtuals[i];
        if (virtual[0] == _path) {
          virtualsForChild.push(virtual.slice(1));
        }
      }

      if (virtualsForChild.length === 0) {
        continue;
      }
    }

    attachVirtuals.call(doc, _schema, _doc, virtualsForChild, res);
    attachedVirtuals = true;
  }

  if (virtuals && virtuals.length && !attachedVirtuals) {
    attachVirtualsToDoc(schema, res, virtuals.map(function(virtual) {
      return virtual.join('.');
    }), parent);
  }
}

function attachVirtualsToDoc(schema, doc, virtuals) {
  if (doc == null || typeof doc !== 'object') {
    return;
  }
  if (Array.isArray(doc)) {
    for (let i = 0; i < doc.length; ++i) {
      attachVirtualsToDoc(schema, doc[i], virtuals);
    }
    return;
  }

  if (schema.discriminators && Object.keys(schema.discriminators).length > 0) {
    for (const discriminatorKey of Object.keys(schema.discriminators)) {
      const discriminator = schema.discriminators[discriminatorKey];
      const key = discriminator.discriminatorMapping.key;
      const value = discriminator.discriminatorMapping.value;
      if (doc[key] == value) {
        schema = discriminator;
        break;
      }
    }
  }

  if (virtuals == null) {
    virtuals = Object.keys(schema.virtuals);
  }
  const numVirtuals = virtuals.length;
  for (let i = 0; i < numVirtuals; ++i) {
    const virtual = virtuals[i];
    if (schema.virtuals[virtual] == null) {
      continue;
    }
    const virtualType = schema.virtuals[virtual];
    const sp = Array.isArray(virtual) ? virtual : virtual.split('.');
    let cur = doc;
    for (let j = 0; j < sp.length - 1; ++j) {
      cur[sp[j]] = sp[j] in cur ? cur[sp[j]] : {};
      cur = cur[sp[j]];
    }
    let val = virtualType.applyGetters(cur[sp[sp.length - 1]], doc);
    if (isPopulateVirtual(virtualType) && val === undefined) {
      if (virtualType.options.justOne) {
        val = null;
      } else {
        val = [];
      }
    }
    cur[sp[sp.length - 1]] = val;
  }
}

function isPopulateVirtual(virtualType) {
  return virtualType.options && (virtualType.options.ref || virtualType.options.refPath);
}

module.exports.defaults = module.exports;
module.exports.mongooseLeanVirtuals = module.exports;
