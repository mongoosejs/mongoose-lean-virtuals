'use strict';

const acquit = require('acquit');
const fs = require('fs');

require('acquit-ignore')();
require('acquit-markdown')();

acquit.output(function(str) {
  return str.replace(/acquit:ignore:end\s+/g, '');
});

const header = fs.readFileSync('./HEADER.md', 'utf8');
const markdown =
  acquit.parse(fs.readFileSync('./test/examples.test.js', 'utf8'));

fs.writeFileSync('./README.md', `${header}\n\n${markdown}`);
