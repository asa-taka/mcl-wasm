#!/bin/sh

cd $(dirname ${0})

node -e "mcl = require('../src'); mcl.init().then(() => console.log(mcl))" > exported-fields.orig.dump
node -e "mcl = require('../src'); mcl.init().then(() => console.log(Object.keys(mcl).sort()))" > exported-field-names.orig.dump

npm run tsc
node -e "mcl = require('../dest'); mcl.init().then(() => console.log(mcl))" > exported-fields.ts.dump
node -e "mcl = require('../dest'); mcl.init().then(() => console.log(Object.keys(mcl).sort()))" > exported-field-names.ts.dump

diff -u exported-fields.{orig,ts}.dump > exported-fields.diff
diff -u exported-field-names.{orig,ts}.dump > exported-field-names.diff

echo 'exported-field lists and diff are generated.'
