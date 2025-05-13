1.1.1 / 2025-05-13
==================
 * fix: avoid unnecessarily setting populate virtuals to `[]` if query didn't have populate() #80 #79

1.1.0 / 2025-01-04
==================
 * types: add VirtualsForModel helper to make it easier to set the correct type overrides for lean()

1.0.0 / 2024-09-03
==================
 * BREAKING CHANGE: test on node v16+, drop support for Node v14
 * BREAKING CHANGE: remove array.prototype.flat polyfill
 * feat: add `enabledByDefault` option #68 #52
 * fix: allow calling `parent()` on parent, allow accessing parent's virtual from child subdoc #73

0.9.1 / 2022-04-28
==================
 * fix(types): allow default import, named import, wildcard import #60 [IslandRhythms](https://github.com/IslandRhythms)

0.9.0 / 2021-10-14
==================
 * fix: set populate virtuals to `null` or `[]` if no results based on `justOne` for Mongoose 6 Automattic/mongoose#10816

0.8.1 / 2021-09-18
==================
 * fix: upgrade to mpath ^0.8.4 to fix security warnings #54

0.8.0 / 2021-04-26
==================
 * fix: handle calling `parent()` in virtual when using `find()` with multiple results #51
 * fix: require Mongoose >= 5.11.10 for fix to #48

0.7.6 / 2020-12-15
==================
 * fix: propagate `virtuals: true` to subdocuments #47 #43

0.7.5 / 2020-11-28
==================
 * fix: fix .length invalid property access on null #44 [maximilianschmid](https://github.com/maximilianschmid)

0.7.4 / 2020-11-20
==================
 * fix: support nested virtuals #43 [rdougan](https://github.com/rdougan)

0.7.3 / 2020-11-12
==================
 * fix: skip non-existent virtuals when passing a list of virtual names to `lean()` #42

0.7.2 / 2020-10-12
==================
 * fix: make `parent()` tracking support case where array of subdocs contains primitives #41

0.7.1 / 2020-10-09
==================
 * fix: avoid WeakMap error when using arrays with `null` elements #41

0.7.0 / 2020-10-06
==================
 * feat: add top-level `parent()` function that lets you get the subdocument's parent even though the subdoc is lean #40

0.6.9 / 2020-08-29
==================
 * fix: avoid TypeError when there are multiple discriminators #39

0.6.8 / 2020-06-11
==================
 * fix: apply virtuals in doubly nested document arrays #38

0.6.7 / 2020-06-04
==================
 * fix build for node v6 and v4

0.6.6 / 2020-06-03
==================
 * fix: discriminators when the query result is an array #37 #36 [FERNman](https://github.com/FERNman)

0.6.5 / 2020-06-02
==================
 * fix: avoid infinite recursion on recursive schemas with virtuals #33

0.6.4 / 2020-06-02
==================
 * fix: allow explicitly selecting subdocument virtuals #35 #34 [ChrisLahaye](https://github.com/ChrisLahaye)

0.6.3 / 2020-05-24
==================
 * fix: skip checking discriminators if result is null #32

0.6.2 / 2020-04-27
==================
 * fix: correctly pass existing field value to applyGetters #31 [makinde](https://github.com/makinde)

0.6.1 / 2020-03-17
==================
 * fix: get virtuals from discriminator schema if discriminator key set #30 [makinde](https://github.com/makinde)

0.6.0 / 2020-03-04
==================
 * feat: attach lean virtuals to result of `findOneAndRemove()` and `findOneAndDelete()` #29 [isaacdecoded](https://github.com/isaacdecoded)

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
