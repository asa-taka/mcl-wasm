import { getMcl } from './mcl'
import { MCLBN_FP_SIZE, MCLBN_FR_SIZE, MCLBN_G1_SIZE, MCLBN_G2_SIZE, MCLBN_GT_SIZE } from './constants'
import getRandomValues from './getRandomValues'
import { _free, toHexStr, fromHexStr, _malloc } from './mcl'

export class Common {
  public a_: Uint32Array

  constructor (size: number) {
    this.a_ = new Uint32Array(size / 4)
  }
  deserialize (s: string) {
    throw new Error('deserialize not implemented')
  }
  serialize (): string {
    throw new Error('serialize not implemented')
  }
  deserializeHexStr (s: string) {
    this.deserialize(fromHexStr(s) as any)
  }
  serializeToHexStr (): string {
    return toHexStr(this.serialize() as any)
  }
  dump (msg = '') {
    console.log(msg + this.serializeToHexStr())
  }
  clear () {
    this.a_.fill(0)
  }
  // copy to allocated memory
  copyToMem (pos: number) {
    getMcl().HEAP32.set(this.a_, pos / 4)
  }
  // copy from allocated memory
  copyFromMem (pos: number) {
    this.a_.set(getMcl().HEAP32.subarray(pos / 4, pos / 4 + this.a_.length))
  }
  // alloc new array
  _alloc () {
    return _malloc(this.a_.length * 4)
  }
  // alloc and copy a_ to getMcl().HEAP32[pos / 4]
  _allocAndCopy () {
    const pos = this._alloc()
    getMcl().HEAP32.set(this.a_, pos / 4)
    return pos
  }
  // save pos to a_
  _save (pos: number) {
    this.a_.set(getMcl().HEAP32.subarray(pos / 4, pos / 4 + this.a_.length))
  }
  // save and free
  _saveAndFree(pos: number) {
    this._save(pos)
    _free(pos)
  }
  // set parameter (p1, p2 may be undefined)
  _setter (func: Function, ...params: any[]) {
    const pos = this._alloc()
    const r = func(pos, ...params)
    this._saveAndFree(pos)
    if (r) throw new Error('_setter err')
  }
  // getter (p1, p2 may be undefined)
  _getter (func: Function, ...params: any[]) {
    const pos = this._allocAndCopy()
    const s = func(pos, ...params)
    _free(pos)
    return s
  }
  _isEqual (func: (xPos: number, yPos: number) => number, rhs: Common) {
    const xPos = this._allocAndCopy()
    const yPos = rhs._allocAndCopy()
    const r = func(xPos, yPos)
    _free(yPos)
    _free(xPos)
    return r === 1
  }
  // func(y, this) and return y
  _op1 (func: (yPos: number, xPos: number) => void) {
    const y = new (this.constructor as any)()
    const xPos = this._allocAndCopy()
    const yPos = y._alloc()
    func(yPos, xPos)
    y._saveAndFree(yPos)
    _free(xPos)
    return y
  }
  // func(z, this, y) and return z
  _op2 (func: (zPos: number, xPos: number, yPos: number) => void, y: Common, Cstr: any = null) {
    const z = Cstr ? new Cstr() : new (this.constructor as any)()
    const xPos = this._allocAndCopy()
    const yPos = y._allocAndCopy()
    const zPos = z._alloc()
    func(zPos, xPos, yPos)
    z._saveAndFree(zPos)
    _free(yPos)
    _free(xPos)
    return z
  }
  // devide Uint32Array a into n and chose the idx-th
  _getSubArray (idx: number, n: number) {
    const d = this.a_.length / n
    return new Uint32Array(this.a_.buffer, d * idx * 4, d)
  }
  // set array lhs to idx
  _setSubArray (lhs: Common, idx: number, n: number) {
    const d = this.a_.length / n
    this.a_.set(lhs.a_, d * idx)
  }
  setHashOf(a: string | Uint8Array) {
    throw new Error('setHashOf not implemented')
  }
}

export interface IntType {
  setInt(x: number): void;
  isOne(): boolean;
  setLittleEndian(a: Uint8Array): void;
  setLittleEndianMod(a: Uint8Array): void;
  setBigEndianMod(a: Uint8Array): void;
  setByCSPRNG(): void;
}

export class Fr extends Common implements IntType {
  constructor () {
    super(MCLBN_FR_SIZE)
  }
  setInt (x: number) {
    this._setter(getMcl()._mclBnFr_setInt32, x)
  }
  deserialize (s: string) {
    this._setter(getMcl().mclBnFr_deserialize, s)
  }
  serialize () {
    return this._getter(getMcl().mclBnFr_serialize)
  }
  setStr (s: string, base = 0) {
    this._setter(getMcl().mclBnFr_setStr, s, base)
  }
  getStr (base = 0) {
    return this._getter(getMcl().mclBnFr_getStr, base)
  }
  isZero () {
    return this._getter(getMcl()._mclBnFr_isZero) === 1
  }
  isOne () {
    return this._getter(getMcl()._mclBnFr_isOne) === 1
  }
  isEqual (rhs: Fr) {
    return this._isEqual(getMcl()._mclBnFr_isEqual, rhs)
  }
  setLittleEndian (a: Uint8Array) {
    this._setter(getMcl().mclBnFr_setLittleEndian, a)
  }
  setLittleEndianMod (a: Uint8Array) {
    this._setter(getMcl().mclBnFr_setLittleEndianMod, a)
  }
  setBigEndianMod (a: Uint8Array) {
    this._setter(getMcl().mclBnFr_setBigEndianMod, a)
  }
  setByCSPRNG () {
    const a = new Uint8Array(MCLBN_FR_SIZE)
    getRandomValues(a)
    this.setLittleEndian(a)
  }
  setHashOf (s: string) {
    this._setter(getMcl().mclBnFr_setHashOf, s)
  }
}

export const deserializeHexStrToFr = (s: string) => {
  const r = new Fr()
  r.deserializeHexStr(s)
  return r
}

export class Fp extends Common implements IntType {
  constructor () {
    super(MCLBN_FP_SIZE)
  }
  setInt (x: number) {
    this._setter(getMcl()._mclBnFp_setInt32, x)
  }
  deserialize (s: string) {
    this._setter(getMcl().mclBnFp_deserialize, s)
  }
  serialize () {
    return this._getter(getMcl().mclBnFp_serialize)
  }
  setStr (s: string, base = 0) {
    this._setter(getMcl().mclBnFp_setStr, s, base)
  }
  getStr (base = 0) {
    return this._getter(getMcl().mclBnFp_getStr, base)
  }
  isOne () {
    return this._getter(getMcl()._mclBnFr_isOne) === 1
  }
  isEqual (rhs: this) {
    return this._isEqual(getMcl()._mclBnFp_isEqual, rhs)
  }
  setLittleEndian (a: Uint8Array) {
    this._setter(getMcl().mclBnFp_setLittleEndian, a)
  }
  setLittleEndianMod (a: Uint8Array) {
    this._setter(getMcl().mclBnFp_setLittleEndianMod, a)
  }
  setBigEndianMod (a: Uint8Array) {
    this._setter(getMcl().mclBnFp_setBigEndianMod, a)
  }
  setByCSPRNG () {
    const a = new Uint8Array(MCLBN_FP_SIZE)
    getRandomValues(a)
    this.setLittleEndian(a)
  }
  setHashOf (s: string) {
    this._setter(getMcl().mclBnFp_setHashOf, s)
  }
  mapToG1 () {
    const y = new G1()
    const xPos = this._allocAndCopy()
    const yPos = y._alloc()
    getMcl()._mclBnFp_mapToG1(yPos, xPos)
    y._saveAndFree(yPos)
    _free(xPos)
   return y
  }
}

export const deserializeHexStrToFp = (s: string) => {
  const r = new Fp()
  r.deserializeHexStr(s)
  return r
}

export class Fp2 extends Common {
  constructor () {
    super(MCLBN_FP_SIZE * 2)
  }
  setInt (x: number, y: number) {
    const v = new Fp()
    v.setInt(x)
    this.set_a(v)
    v.setInt(y)
    this.set_b(v)
  }
  deserialize (s: string) {
    this._setter(getMcl().mclBnFp2_deserialize, s)
  }
  serialize () {
    return this._getter(getMcl().mclBnFp2_serialize)
  }
  isEqual (rhs: this) {
    return this._isEqual(getMcl()._mclBnFp2_isEqual, rhs)
  }
  /*
    x = a + bi where a, b in Fp and i^2 = -1
  */
  get_a () {
    const r = new Fp()
    r.a_ = this._getSubArray(0, 2)
    return r
  }
  get_b () {
    const r = new Fp()
    r.a_ = this._getSubArray(1, 2)
    return r
  }
  set_a(v: Fp) {
    this._setSubArray(v, 0, 2)
  }
  set_b(v: Fp) {
    this._setSubArray(v, 1, 2)
  }
  mapToG2 () {
    const y = new G2()
    const xPos = this._allocAndCopy()
    const yPos = y._alloc()
    getMcl()._mclBnFp2_mapToG2(yPos, xPos)
    y._saveAndFree(yPos)
    _free(xPos)
   return y
  }
}

export const deserializeHexStrToFp2 = (s: string) => {
  const r = new Fp2()
  r.deserializeHexStr(s)
  return r
}

export class G1 extends Common {
  constructor () {
    super(MCLBN_G1_SIZE)
  }
  deserialize (s: string) {
    this._setter(getMcl().mclBnG1_deserialize, s)
  }
  serialize () {
    return this._getter(getMcl().mclBnG1_serialize)
  }
  setStr (s: string, base = 0) {
    this._setter(getMcl().mclBnG1_setStr, s, base)
  }
  getStr (base = 0) {
    return this._getter(getMcl().mclBnG1_getStr, base)
  }
  normalize () {
    this.a_ = normalize(this).a_
  }
  getX () {
    const r = new Fp()
    r.a_ = this._getSubArray(0, 3)
    return r
  }
  getY () {
    const r = new Fp()
    r.a_ = this._getSubArray(1, 3)
    return r
  }
  getZ () {
    const r = new Fp()
    r.a_ = this._getSubArray(2, 3)
    return r
  }
  setX (v: Fp) {
    this._setSubArray(v, 0, 3)
  }
  setY (v: Fp) {
    this._setSubArray(v, 1, 3)
  }
  setZ (v: Fp) {
    this._setSubArray(v, 2, 3)
  }
  isZero () {
    return this._getter(getMcl()._mclBnG1_isZero) === 1
  }
  isValid () {
    return this._getter(getMcl()._mclBnG1_isValid) === 1
  }
  isValidOrder () {
    return this._getter(getMcl()._mclBnG1_isValidOrder) === 1
  }
  isEqual (rhs: this) {
    return this._isEqual(getMcl()._mclBnG1_isEqual, rhs)
  }
  setHashOf (s: string) {
    this._setter(getMcl().mclBnG1_hashAndMapTo, s)
  }
}

export const deserializeHexStrToG1 = (s: string) => {
  const r = new G1()
  r.deserializeHexStr(s)
  return r
}

export const setETHserialization = (ETHserialization: boolean) => {
  getMcl()._mclBn_setETHserialization(ETHserialization ? 1 : 0)
}

// mode = mcl.IRTF for Ethereum 2.0 spec
export const setMapToMode = (mode: number) => {
  getMcl()._mclBn_setMapToMode(mode)
}

export const verifyOrderG1 = (doVerify: boolean) => {
  getMcl()._mclBn_verifyOrderG1(doVerify ? 1 : 0)
}

export const verifyOrderG2 = (doVerify: boolean) => {
  getMcl()._mclBn_verifyOrderG2(doVerify ? 1 : 0)
}

export const getBasePointG1 = () => {
  const x = new G1()
  const xPos = x._alloc()
  getMcl()._mclBnG1_getBasePoint(xPos)
  x._saveAndFree(xPos)
  if (x.isZero()) {
    throw new Error('not supported for pairing curves')
  }
  return x
}

export class G2 extends Common {
  constructor () {
    super(MCLBN_G2_SIZE)
  }
  deserialize (s: string) {
    this._setter(getMcl().mclBnG2_deserialize, s)
  }
  serialize () {
    return this._getter(getMcl().mclBnG2_serialize)
  }
  setStr (s: string, base = 0) {
    this._setter(getMcl().mclBnG2_setStr, s, base)
  }
  getStr (base = 0) {
    return this._getter(getMcl().mclBnG2_getStr, base)
  }
  normalize () {
    this.a_ = normalize(this).a_
  }
  getX () {
    const r = new Fp2()
    r.a_ = this._getSubArray(0, 3)
    return r
  }
  getY () {
    const r = new Fp2()
    r.a_ = this._getSubArray(1, 3)
    return r
  }
  getZ () {
    const r = new Fp2()
    r.a_ = this._getSubArray(2, 3)
    return r
  }
  setX (v: Fp2) {
    this._setSubArray(v, 0, 3)
  }
  setY (v: Fp2) {
    this._setSubArray(v, 1, 3)
  }
  setZ (v: Fp2) {
    this._setSubArray(v, 2, 3)
  }
  isZero () {
    return this._getter(getMcl()._mclBnG2_isZero) === 1
  }
  isValid () {
    return this._getter(getMcl()._mclBnG2_isValid) === 1
  }
  isValidOrder () {
    return this._getter(getMcl()._mclBnG2_isValidOrder) === 1
  }
  isEqual (rhs: this) {
    return this._isEqual(getMcl()._mclBnG2_isEqual, rhs)
  }
  setHashOf (s: string) {
    this._setter(getMcl().mclBnG2_hashAndMapTo, s)
  }
}

export const deserializeHexStrToG2 = (s: string) => {
  const r = new G2()
  r.deserializeHexStr(s)
  return r
}

export class GT extends Common {
  constructor () {
    super(MCLBN_GT_SIZE)
  }
  setInt (x: number) {
    this._setter(getMcl()._mclBnGT_setInt32, x)
  }
  deserialize (s: string) {
    this._setter(getMcl().mclBnGT_deserialize, s)
  }
  serialize () {
    return this._getter(getMcl().mclBnGT_serialize)
  }
  setStr (s: string, base = 0) {
    this._setter(getMcl().mclBnGT_setStr, s, base)
  }
  getStr (base = 0) {
    return this._getter(getMcl().mclBnGT_getStr, base)
  }
  isZero () {
    return this._getter(getMcl()._mclBnGT_isZero) === 1
  }
  isOne () {
    return this._getter(getMcl()._mclBnGT_isOne) === 1
  }
  isEqual (rhs: this) {
    return this._isEqual(getMcl()._mclBnGT_isEqual, rhs)
  }
}

export const deserializeHexStrToGT = (s: string) => {
  const r = new GT()
  r.deserializeHexStr(s)
  return r
}

export class PrecomputedG2 {
  p: number | null
  constructor (Q: G2) {
    if (!(Q instanceof G2)) throw new Error('PrecomputedG2:bad type')
    const byteSize = getMcl()._mclBn_getUint64NumToPrecompute() * 8
    this.p = _malloc(byteSize)
    const Qpos = Q._allocAndCopy()
    getMcl()._mclBn_precomputeG2(this.p, Qpos)
    _free(Qpos)
  }
  /*
    call destroy if PrecomputedG2 is not necessary
    to avoid memory leak
  */
  destroy () {
    if (this.p != null) _free(this.p)
    this.p = null
  }
}

export const neg = (x: Common) => {
  if (x instanceof Fr) {
    return x._op1(getMcl()._mclBnFr_neg)
  }
  if (x instanceof Fp) {
    return x._op1(getMcl()._mclBnFp_neg)
  }
  if (x instanceof G1) {
    return x._op1(getMcl()._mclBnG1_neg)
  }
  if (x instanceof G2) {
    return x._op1(getMcl()._mclBnG2_neg)
  }
  if (x instanceof GT) {
    return x._op1(getMcl()._mclBnGT_neg)
  }
  if (x instanceof Fp2) {
    return x._op1(getMcl()._mclBnFp2_neg)
  }
  throw new Error('neg:bad type')
}

export const sqr = (x: Common) => {
  if (x instanceof Fp) {
    return x._op1(getMcl()._mclBnFp_sqr)
  }
  if (x instanceof Fr) {
    return x._op1(getMcl()._mclBnFr_sqr)
  }
  if (x instanceof GT) {
    return x._op1(getMcl()._mclBnGT_sqr)
  }
  if (x instanceof Fp2) {
    return x._op1(getMcl()._mclBnFp2_sqr)
  }
  throw new Error('sqr:bad type')
}

export const inv = (x: Common) => {
  if (x instanceof Fp) {
    return x._op1(getMcl()._mclBnFp_inv)
  }
  if (x instanceof Fr) {
    return x._op1(getMcl()._mclBnFr_inv)
  }
  if (x instanceof GT) {
    return x._op1(getMcl()._mclBnGT_inv)
  }
  if (x instanceof Fp2) {
    return x._op1(getMcl()._mclBnFp2_inv)
  }
  throw new Error('inv:bad type')
}

export const normalize = (x: Common) => {
  if (x instanceof G1) {
    return x._op1(getMcl()._mclBnG1_normalize)
  }
  if (x instanceof G2) {
    return x._op1(getMcl()._mclBnG2_normalize)
  }
  throw new Error('normalize:bad type')
}

export const add = (x: Common, y: Common) => {
  if (x.constructor !== y.constructor) throw new Error('add:mismatch type')
  if (x instanceof Fp) {
    return x._op2(getMcl()._mclBnFp_add, y)
  }
  if (x instanceof Fr) {
    return x._op2(getMcl()._mclBnFr_add, y)
  }
  if (x instanceof G1) {
    return x._op2(getMcl()._mclBnG1_add, y)
  }
  if (x instanceof G2) {
    return x._op2(getMcl()._mclBnG2_add, y)
  }
  if (x instanceof GT) {
    return x._op2(getMcl()._mclBnGT_add, y)
  }
  if (x instanceof Fp2) {
    return x._op2(getMcl()._mclBnFp2_add, y)
  }
  throw new Error('add:bad type')
}

export const sub = (x: Common, y: Common) => {
  if (x.constructor !== y.constructor) throw new Error('sub:mismatch type')
  if (x instanceof Fp) {
    return x._op2(getMcl()._mclBnFp_sub, y)
  }
  if (x instanceof Fr) {
    return x._op2(getMcl()._mclBnFr_sub, y)
  }
  if (x instanceof G1) {
    return x._op2(getMcl()._mclBnG1_sub, y)
  }
  if (x instanceof G2) {
    return x._op2(getMcl()._mclBnG2_sub, y)
  }
  if (x instanceof GT) {
    return x._op2(getMcl()._mclBnGT_sub, y)
  }
  if (x instanceof Fp2) {
    return x._op2(getMcl()._mclBnFp2_sub, y)
  }
  throw new Error('sub:bad type')
}

/*
  Fr * Fr
  G1 * Fr ; scalar mul
  G2 * Fr ; scalar mul
  GT * GT
*/
export const mul = (x: Common, y: Common) => {
  if (x instanceof Fp && y instanceof Fp) {
    return x._op2(getMcl()._mclBnFp_mul, y)
  }
  if (x instanceof Fr && y instanceof Fr) {
    return x._op2(getMcl()._mclBnFr_mul, y)
  }
  if (x instanceof G1 && y instanceof Fr) {
    return x._op2(getMcl()._mclBnG1_mul, y)
  }
  if (x instanceof G2 && y instanceof Fr) {
    return x._op2(getMcl()._mclBnG2_mul, y)
  }
  if (x instanceof GT && y instanceof GT) {
    return x._op2(getMcl()._mclBnGT_mul, y)
  }
  if (x instanceof Fp2 && y instanceof Fp2) {
    return x._op2(getMcl()._mclBnFp2_mul, y)
  }
  throw new Error('mul:mismatch type')
}

const _mulVec = (func: (zPos: number, xPos: number, yPos: number, n: number) => void, xVec: Common[], yVec: Common[], Cstr: any) => {
  const n = xVec.length
  if (n != yVec.length) throw new Error(`err _mulVec bad length ${n}, ${yVec.length}`)
  const xSize = xVec[0].a_.length
  const ySize = yVec[0].a_.length
  const z = new Cstr()
  const zPos = z._alloc()
  const xPos = _malloc(xSize * n * 4)
  const yPos = _malloc(ySize * n * 4)
  let pos = xPos / 4
  for (let i = 0; i < n; i++) {
    getMcl().HEAP32.set(xVec[i].a_, pos)
    pos += xSize
  }
  pos = yPos / 4
  for (let i = 0; i < n; i++) {
    getMcl().HEAP32.set(yVec[i].a_, pos)
    pos += ySize
  }
  func(zPos, xPos, yPos, n)
  _free(yPos)
  _free(xPos)
  z._saveAndFree(zPos)
  return z
}

/*
  sum G1 * Fr ; scalar mul
  sum G2 * Fr ; scalar mul
*/
export const mulVec = <X extends G1 | G2>(xVec: X[], yVec: Fr[]) => {
  if (xVec.length == 0) throw new Error('mulVec:zero array')
  if (xVec[0] instanceof G1 && yVec[0] instanceof Fr) {
    return _mulVec(getMcl()._mclBnG1_mulVec, xVec, yVec, G1) as G1
  }
  if (xVec[0] instanceof G2 && yVec[0] instanceof Fr) {
    return _mulVec(getMcl()._mclBnG2_mulVec, xVec, yVec, G2) as G2
  }
  throw new Error('mulVec:mismatch type')
}

export const div = (x: Common, y: Common) => {
  if (x.constructor !== y.constructor) throw new Error('div:mismatch type')
  if (x instanceof Fp) {
    return x._op2(getMcl()._mclBnFp_div, y)
  }
  if (x instanceof Fr) {
    return x._op2(getMcl()._mclBnFr_div, y)
  }
  if (x instanceof GT) {
    return x._op2(getMcl()._mclBnGT_div, y)
  }
  if (x instanceof Fp2) {
    return x._op2(getMcl()._mclBnFp2_div, y)
  }
  throw new Error('div:bad type')
}

export const dbl = <X extends G1 | G2>(x: X) => {
  if (x instanceof G1) {
    return x._op1(getMcl()._mclBnG1_dbl) as G1
  }
  if (x instanceof G2) {
    return x._op1(getMcl()._mclBnG2_dbl) as G2
  }
  throw new Error('dbl:bad type')
}

export const hashToFr = (s: string) => {
  const x = new Fr()
  x.setHashOf(s)
  return x
}

export const hashAndMapToG1 = (s: string) => {
  const x = new G1()
  x.setHashOf(s)
  return x
}

export const hashAndMapToG2 = (s: string) => {
  const x = new G2()
  x.setHashOf(s)
  return x
}

// pow(GT x, Fr y)
export const pow = (x: GT, y: Fr) => {
  if (x instanceof GT && y instanceof Fr) {
    return x._op2(getMcl()._mclBnGT_pow, y)
  }
  throw new Error('pow:bad type')
}

// pairing(G1 P, G2 Q)
export const pairing = (P: G1, Q: G2) => {
  if (P instanceof G1 && Q instanceof G2) {
    return P._op2(getMcl()._mclBn_pairing, Q, GT)
  }
  throw new Error('exports.pairing:bad type')
}

// millerLoop(G1 P, G2 Q)
export const millerLoop = (P: G1, Q: G2) => {
  if (P instanceof G1 && Q instanceof G2) {
    return P._op2(getMcl()._mclBn_millerLoop, Q, GT)
  }
  throw new Error('exports.millerLoop:bad type')
}

export const precomputedMillerLoop = (P: G1, Qcoeff: PrecomputedG2) => {
  if (!(P instanceof G1 && Qcoeff instanceof PrecomputedG2)) throw new Error('exports.precomputedMillerLoop:bad type')
  const e = new GT()
  const PPos = P._allocAndCopy()
  const ePos = e._alloc()
  getMcl()._mclBn_precomputedMillerLoop(ePos, PPos, Qcoeff.p)
  e._saveAndFree(ePos)
  _free(PPos)
  return e
}

// millerLoop(P1, Q1coeff) * millerLoop(P2, Q2coeff)
export const precomputedMillerLoop2 = (P1: G1, Q1coeff: PrecomputedG2, P2: G1, Q2coeff: PrecomputedG2) => {
  if (!(P1 instanceof G1 && Q1coeff instanceof PrecomputedG2 && P2 instanceof G1 && Q2coeff instanceof PrecomputedG2)) throw new Error('exports.precomputedMillerLoop2mixed:bad type')
  const e = new GT()
  const P1Pos = P1._allocAndCopy()
  const P2Pos = P2._allocAndCopy()
  const ePos = e._alloc()
  getMcl()._mclBn_precomputedMillerLoop2(ePos, P1Pos, Q1coeff.p, P2Pos, Q2coeff.p)
  e._saveAndFree(ePos)
  _free(P1Pos)
  _free(P2Pos)
  return e
}

// millerLoop(P1, Q1) * millerLoop(P2, Q2coeff)
export const precomputedMillerLoop2mixed = (P1: G1, Q1: G2, P2: G1, Q2coeff: PrecomputedG2) => {
  if (!(P1 instanceof G1 && Q1 instanceof G2 && P2 instanceof G1 && Q2coeff instanceof PrecomputedG2)) throw new Error('exports.precomputedMillerLoop2mixed:bad type')
  const e = new GT()
  const P1Pos = P1._allocAndCopy()
  const Q1Pos = Q1._allocAndCopy()
  const P2Pos = P2._allocAndCopy()
  const ePos = e._alloc()
  getMcl()._mclBn_precomputedMillerLoop2mixed(ePos, P1Pos, Q1Pos, P2Pos, Q2coeff.p)
  e._saveAndFree(ePos)
  _free(P1Pos)
  _free(Q1Pos)
  _free(P2Pos)
  return e
}

export const finalExp = (x: GT) => {
  if (x instanceof GT) {
    return x._op1(getMcl()._mclBn_finalExp)
  }
  throw new Error('finalExp:bad type')
}
