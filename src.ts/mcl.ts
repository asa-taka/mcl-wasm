const createModule = require('./mcl_c.js')
import CurveType from './CurveType'
import getRandomValues from './getRandomValues'
import { MCLBN_COMPILED_TIME_VAR } from './constants'
import { MCLBN_FP_SIZE, MCLBN_FR_SIZE, MCLBN_G1_SIZE, MCLBN_G2_SIZE, MCLBN_GT_SIZE } from './constants'

// TODO: typing
type MclEmsModule = any

export let mod: MclEmsModule | undefined

export const _malloc = (size: number) => {
  return mod._mclBnMalloc(size)
}

export const _free = (pos: number) => {
  mod._mclBnFree(pos)
}

const ptrToAsciiStr = (pos: number, n: number) => {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += String.fromCharCode(mod.HEAP8[pos + i])
  }
  return s
}
const asciiStrToPtr = (pos: number, s: string) => {
  for (let i = 0; i < s.length; i++) {
    mod.HEAP8[pos + i] = s.charCodeAt(i)
  }
}

const toHex = (a: Uint8Array, start: number, n: number) => {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += ('0' + a[start + i].toString(16)).slice(-2)
  }
  return s
}

// Uint8Array to hex string
export const toHexStr = (a: Uint8Array) => {
  return toHex(a, 0, a.length)
}

// hex string to Uint8Array
export const fromHexStr = (s: string) => {
  if (s.length & 1) throw new Error('fromHexStr:length must be even ' + s.length)
  const n = s.length / 2
  const a = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    a[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
  }
  return a
}

type StringReader = (pos: number, maxBufSize: number, x: number, ioMode: number) => number

const _wrapGetStr = (func: StringReader, returnAsStr = true) => {
  return (x: number, ioMode = 0) => {
    const maxBufSize = 3096
    const pos = _malloc(maxBufSize)
    const n = func(pos, maxBufSize, x, ioMode)
    if (n <= 0) {
      throw new Error('err gen_str:' + x)
    }
    let s = null
    if (returnAsStr) {
      s = ptrToAsciiStr(pos, n)
    } else {
      s = new Uint8Array(mod.HEAP8.subarray(pos, pos + n))
    }
    _free(pos)
    return s
  }
}
const _wrapSerialize = (func: StringReader) => {
  return _wrapGetStr(func, false)
}

type StringWriter = (pos: number, maxBufSize: number, x: number) => number

const _wrapDeserialize = (func: StringWriter) => {
  return (x: number, buf: any[]) => {
    const pos = _malloc(buf.length)
    mod.HEAP8.set(buf, pos)
    const r = func(x, pos, buf.length)
    _free(pos)
    if (r === 0 || r !== buf.length) throw new Error(`err _wrapDeserialize: ${r} != ${buf.length}`)
  }
}
/*
  argNum : n
  func(x0, ..., x_(n-1), buf, ioMode)
  => func(x0, ..., x_(n-1), pos, buf.length, ioMode)
*/
const _wrapInput = (func: Function, argNum: number) => {
  return function (...args: any[]) {
    const buf = args[argNum]
    const typeStr = Object.prototype.toString.apply(buf)
    if (['[object String]', '[object Uint8Array]', '[object Array]'].indexOf(typeStr) < 0) {
      throw new Error(`err bad type:"${typeStr}". Use String or Uint8Array.`)
    }
    const ioMode = args[argNum + 1] // may undefined
    const pos = _malloc(buf.length)
    if (typeStr === '[object String]') {
      asciiStrToPtr(pos, buf)
    } else {
      mod.HEAP8.set(buf, pos)
    }
    const r = func(...args.slice(0, argNum), pos, buf.length, ioMode)
    _free(pos)
    if (r) throw new Error('err _wrapInput ' + buf)
  }
}

const addWrappedMethods = (mod: MclEmsModule) => {
  mod.mclBnFr_malloc = () => {
    return _malloc(MCLBN_FR_SIZE)
  }
  const free = (x: number) => {
    _free(x)
  }
  mod.mclBnFr_setLittleEndian = _wrapInput(mod._mclBnFr_setLittleEndian, 1)
  mod.mclBnFr_setLittleEndianMod = _wrapInput(mod._mclBnFr_setLittleEndianMod, 1)
  mod.mclBnFr_setBigEndianMod = _wrapInput(mod._mclBnFr_setBigEndianMod, 1)
  mod.mclBnFr_setStr = _wrapInput(mod._mclBnFr_setStr, 1)
  mod.mclBnFr_getStr = _wrapGetStr(mod._mclBnFr_getStr)
  mod.mclBnFr_deserialize = _wrapDeserialize(mod._mclBnFr_deserialize)
  mod.mclBnFr_serialize = _wrapSerialize(mod._mclBnFr_serialize)
  mod.mclBnFr_setHashOf = _wrapInput(mod._mclBnFr_setHashOf, 1)
  /// ////////////////////////////////////////////////////////////
  mod.mclBnFp_malloc = () => {
    return _malloc(MCLBN_FP_SIZE)
  }
  mod.mclBnFp_setLittleEndian = _wrapInput(mod._mclBnFp_setLittleEndian, 1)
  mod.mclBnFp_setLittleEndianMod = _wrapInput(mod._mclBnFp_setLittleEndianMod, 1)
  mod.mclBnFp_setBigEndianMod = _wrapInput(mod._mclBnFp_setBigEndianMod, 1)
  mod.mclBnFp_setStr = _wrapInput(mod._mclBnFp_setStr, 1)
  mod.mclBnFp_getStr = _wrapGetStr(mod._mclBnFp_getStr)
  mod.mclBnFp_deserialize = _wrapDeserialize(mod._mclBnFp_deserialize)
  mod.mclBnFp_serialize = _wrapSerialize(mod._mclBnFp_serialize)
  mod.mclBnFp_setHashOf = _wrapInput(mod._mclBnFp_setHashOf, 1)

  mod.mclBnFp2_malloc = () => {
    return _malloc(MCLBN_FP_SIZE * 2)
  }
  mod.mclBnFp2_deserialize = _wrapDeserialize(mod._mclBnFp2_deserialize)
  mod.mclBnFp2_serialize = _wrapSerialize(mod._mclBnFp2_serialize)

  /// ////////////////////////////////////////////////////////////
  mod.mclBnG1_malloc = () => {
    return _malloc(MCLBN_G1_SIZE)
  }
  mod.mclBnG1_setStr = _wrapInput(mod._mclBnG1_setStr, 1)
  mod.mclBnG1_getStr = _wrapGetStr(mod._mclBnG1_getStr)
  mod.mclBnG1_deserialize = _wrapDeserialize(mod._mclBnG1_deserialize)
  mod.mclBnG1_serialize = _wrapSerialize(mod._mclBnG1_serialize)
  mod.mclBnG1_hashAndMapTo = _wrapInput(mod._mclBnG1_hashAndMapTo, 1)

  /// ////////////////////////////////////////////////////////////
  mod.mclBnG2_malloc = () => {
    return _malloc(MCLBN_G2_SIZE)
  }
  mod.mclBnG2_setStr = _wrapInput(mod._mclBnG2_setStr, 1)
  mod.mclBnG2_getStr = _wrapGetStr(mod._mclBnG2_getStr)
  mod.mclBnG2_deserialize = _wrapDeserialize(mod._mclBnG2_deserialize)
  mod.mclBnG2_serialize = _wrapSerialize(mod._mclBnG2_serialize)
  mod.mclBnG2_hashAndMapTo = _wrapInput(mod._mclBnG2_hashAndMapTo, 1)

  /// ////////////////////////////////////////////////////////////
  mod.mclBnGT_malloc = () => {
    return _malloc(MCLBN_GT_SIZE)
  }
  mod.mclBnGT_deserialize = _wrapDeserialize(mod._mclBnGT_deserialize)
  mod.mclBnGT_serialize = _wrapSerialize(mod._mclBnGT_serialize)
  mod.mclBnGT_setStr = _wrapInput(mod._mclBnGT_setStr, 1)
  mod.mclBnGT_getStr = _wrapGetStr(mod._mclBnGT_getStr)
}

export const initializeMcl = async (curveType = CurveType.BN254) => {
  mod = await createModule({
    cryptoGetRandomValues: (p: number, n: number) => {
      const a = new Uint8Array(n)
      getRandomValues(a)
      for (let i = 0; i < n; i++) {
        mod.HEAP8[p + i] = a[i]
      }
    }
  })
  
  addWrappedMethods(mod)

  const r = mod._mclBn_init(curveType, MCLBN_COMPILED_TIME_VAR)
  if (r) throw new Error('_mclBn_init err ' + r)
}

/** Get initialized WASM MCL. If not, throw an error. */
export const getMcl = () => {
  if (!mod) throw new Error('MCL module not initialized')
  return mod
}
