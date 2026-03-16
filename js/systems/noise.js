import { lerp } from '../utils.js'

// Perlin Noise
const _perm = new Uint8Array(512)

export function initNoise() {
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    let s = 12345
    for (let i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647
        const j = s % (i + 1)
        const t = p[i]
        p[i] = p[j]
        p[j] = t
    }
    for (let i = 0; i < 512; i++) _perm[i] = p[i & 255]
}

function noiseFade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10)
}

function noiseGrad(hash, x, y) {
    const h = hash & 3
    return ((h & 1) ? -x : x) + ((h & 2) ? -y : y)
}

export function noise2d(x, y) {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = noiseFade(xf)
    const v = noiseFade(yf)
    const aa = _perm[_perm[X] + Y]
    const ab = _perm[_perm[X] + Y + 1]
    const ba = _perm[_perm[X + 1] + Y]
    const bb = _perm[_perm[X + 1] + Y + 1]
    return lerp(
        lerp(noiseGrad(aa, xf, yf), noiseGrad(ba, xf - 1, yf), u),
        lerp(noiseGrad(ab, xf, yf - 1), noiseGrad(bb, xf - 1, yf - 1), u),
        v
    )
}

export function noiseFbm(x, y) {
    return noise2d(x, y) * 0.6 + noise2d(x * 2, y * 2) * 0.3 + noise2d(x * 4, y * 4) * 0.1
}