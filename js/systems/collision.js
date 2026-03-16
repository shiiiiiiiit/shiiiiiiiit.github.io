import { TANK_R, MONSTER_R } from '../constants.js'
import { state, framePlayerEntries } from '../state.js'
import { distSq, rectCircle } from '../helpers.js'
import { getNearbyWalls, getNearbyObstacles } from './spatialGrid.js'

// 碰撞检测
export function blocked(x, y, r, ignoreMon = false) {
    const z = state.zone
    if (x < z.x + r || x > z.x + z.w - r || y < z.y + r || y > z.y + z.h - r) return true
    
    const walls = getNearbyWalls(x, y, r + 10)
    for (let i = 0; i < walls.length; i++) {
        if (rectCircle(walls[i], x, y, r)) return true
    }
    
    const obsts = getNearbyObstacles(x, y, r + 50)
    for (let i = 0; i < obsts.length; i++) {
        const o = obsts[i]
        if (distSq(x, y, o.x, o.y) < (o.r + r) * (o.r + r)) return true
    }
    
    if (!ignoreMon) {
        const mons = state.monsters
        for (let i = 0; i < mons.length; i++) {
            const m = mons[i]
            if (m.hp > 0 && distSq(x, y, m.x, m.y) < (MONSTER_R + r) * (MONSTER_R + r)) return true
        }
    }
    return false
}

// 滑行碰撞检测
export function slideBlocked(x, y, r) {
    if (blocked(x, y, r)) return true
    const rSq = (r + TANK_R) * (r + TANK_R)
    for (let i = 0; i < framePlayerEntries.length; i++) {
        const [id, p] = framePlayerEntries[i]
        if (id !== state.peerId && p.hp > 0 && distSq(x, y, p.x, p.y) < rSq) return true
    }
    return false
}