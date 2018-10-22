'use strict';

const mongoose = require('mongoose');

before(function(done) {
  mongoose.connect('mongodb://localhost:27017/mongooseLeanVirtuals');

  mongoose.Promise = global.Promise;

  mongoose.connection.dropDatabase(done);
});

after(function() {
  return mongoose.disconnect();
});
