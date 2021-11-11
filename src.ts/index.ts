const mclCreateModule = require('./mcl_c.js')
import mclSetupFactory from './mcl'

const mcl = mclSetupFactory(mclCreateModule)

module.exports = mcl
