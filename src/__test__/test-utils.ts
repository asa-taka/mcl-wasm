import * as mcl from '..'
import { Fr, G1, G2 } from '..'

type IdType = [G1, Fr]

/** Enc(m) = [r P, m + h(e(r mpk, H(id)))] */
export function IDenc (id: string, P: G1, mpk: G1, m: Fr): IdType {
  const r = new mcl.Fr()
  r.setByCSPRNG()
  const Q = mcl.hashAndMapToG2(id)
  const e = mcl.pairing(mcl.mul(mpk, r), Q)
  return [mcl.mul(P, r), mcl.add(m, mcl.hashToFr(e.serialize()))]
}

/** Dec([U, v]) = v - h(e(U, sk)) */
export function IDdec ([U, v]: IdType, sk: G2) {
  const e = mcl.pairing(U, sk)
  return mcl.sub(v, mcl.hashToFr(e.serialize()))
}
