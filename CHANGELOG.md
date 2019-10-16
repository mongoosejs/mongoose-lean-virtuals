0.5.0 / 2019-10-16
==================
 * fix: use post order traversal so child schema virtuals are set before parent schema #28

0.4.4 / 2019-09-23
==================
 * fix: check for empty path #26 [thoglen](https://github.com/thoglen)

0.4.3 / 2019-06-03
==================
 * fix: avoid trying to virtualize undefined doc #24 [AlexandreGymlib](https://github.com/AlexandreGymlib)

0.4.2 / 2019-05-09
==================
 * fix: handle virtuals in nested schemas with find() #22

0.4.1 / 2019-05-07
==================
 * fix: support Mongoose 5.x cursors #21

0.4.0 / 2019-04-21
==================
 * feat: support virtuals in nested schemas #20

0.3.5 / 2019-03-11
==================
 * fix: support `ref` in virtual options #19 [linusbrolin](https://github.com/linusbrolin)

0.3.4 / 2018-11-13
==================
 * fix: attach all virtuals as opposed to just one #14 [artemkobets](https://github.com/artemkobets)

0.3.3 / 2018-11-09
==================
 * fix: fix one more issue with `eachAsync()` #12 [nico29](https://github.com/nico29)

0.3.2 / 2018-10-23
==================
 * fix: support Mongoose cursor's `eachAsync()` #9

0.3.1 / 2018-10-10
==================
 * docs: link to new docs site on plugins.mongoosejs.io

0.3.0 / 2018-01-29
==================
 * fix: delay checking virtuals until the middleware for 5.0 support #6
