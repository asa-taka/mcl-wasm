const crypto = require('crypto')
const mclCreateModule = require('./mcl_c.js')
import mclSetupFactory from './mcl'

const getRandomValues = crypto.randomFillSync
const mcl = mclSetupFactory(mclCreateModule, getRandomValues)

module.exports = mcl
