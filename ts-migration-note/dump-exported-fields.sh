#!/bin/sh

cd $(dirname ${0})

node -e "mcl = require('../src'); mcl.init().then(() => console.log(mcl))" > exported-fields.orig.dump

npm run tsc
node -e "mcl = require('../dest'); mcl.init().then(() => console.log(mcl))" > exported-fields.ts.dump

diff -u exported-fields.{orig,ts}.dump > exported-fields.diff

echo 'exported-field lists and diff are generated.'
