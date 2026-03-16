// 纯工具函数 - 不依赖任何其他模块
export const $ = id => document.getElementById(id)
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v
export const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2)
export const distSq = (x1, y1, x2, y2) => {
    const dx = x1 - x2, dy = y1 - y2
    return dx * dx + dy * dy
}
export const rand = (a, b) => a + Math.random() * (b - a)
export const randItem = arr => arr[(Math.random() * arr.length) | 0]
export const lerp = (a, b, t) => a + (b - a) * t
export const easeOut = t => t * (2 - t)

export const TWO_PI = Math.PI * 2
export const HALF_PI = Math.PI / 2

// 角度差值
export function angleDiff(from, to) {
    let d = to - from
    if (d > Math.PI) d -= TWO_PI
    else if (d < -Math.PI) d += TWO_PI
    return d
}

// 矩形与圆碰撞
export function rectCircle(r, cx, cy, cr) {
    const dx = cx - clamp(cx, r.x, r.x + r.w)
    const dy = cy - clamp(cy, r.y, r.y + r.h)
    return dx * dx + dy * dy < cr * cr
}

// ID生成器
let _uid = 0
export const uid = (prefix = '') => `${prefix}${++_uid}`