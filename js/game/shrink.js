import { VIEW_W, VIEW_H, SHRINK_RATIO, SHRINK_DUR, MONSTER_R, MUD_RX, TANK_R } from '../constants.js'
import { state, frameAliveCount, framePlayerEntries } from '../state.js'
import { send, isHost, inZone, easeOut, lerp, pushOut } from '../utils.js'
import { buildSpatialGrid } from '../systems/spatialGrid.js'
import { spawnMonsters, spawnItems } from './map.js'

export function filterEntities(z) {
    state.walls = state.walls.filter(w => 
        w.x + w.w > z.x && w.x < z.x + z.w && 
        w.y + w.h > z.y && w.y < z.y + z.h
    )
    state.obstacles = state.obstacles.filter(o => inZone(o.x, o.y, 0, z))
    state.mudPools = state.mudPools.filter(m => inZone(m.x, m.y, MUD_RX, z))
    state.bananas = state.bananas.filter(b => inZone(b.x, b.y, TANK_R, z))
    state.smokes = state.smokes.filter(s => inZone(s.x, s.y, s.r, z))
    
    buildSpatialGrid()
    
    for (const [, p] of framePlayerEntries) {
        if (p.hp > 0) pushOut(p, TANK_R)
    }
}

export function doShrink() {
    const z = state.zone
    if ((z.w <= VIEW_W && z.h <= VIEW_H) || state.shrinking) return
    
    const nw = Math.max(VIEW_W, z.w * (1 - SHRINK_RATIO))
    const nh = Math.max(VIEW_H, z.h * (1 - SHRINK_RATIO))
    const to = {
        x: z.x + (z.w - nw) * 0.5,
        y: z.y + (z.h - nh) * 0.5,
        w: nw,
        h: nh
    }
    
    state.buffs = state.buffs.filter(b => inZone(b.x, b.y, 30, to))
    state.items = state.items.filter(i => inZone(i.x, i.y, 30, to))
    state.monsters = state.monsters.filter(m => m.hp > 0 && inZone(m.x, m.y, MONSTER_R, to))
    
    const saved = { ...state.zone }
    state.zone = to
    const n = Math.max(1, frameAliveCount) * 3
    spawnMonsters(n)
    spawnItems(n)
    state.zone = saved
    
    state.shrinking = true
    state.shrinkFrom = saved
    state.shrinkTo = to
    state.shrinkAnimTime = 0
    
    send('shrink', {
        fromZone: state.shrinkFrom,
        toZone: state.shrinkTo,
        monsters: state.monsters,
        items: state.items,
        buffs: state.buffs
    })
}

export function updateShrink(dt) {
    if (!state.shrinking) return
    
    state.shrinkAnimTime += dt
    const t = Math.min(1, state.shrinkAnimTime / SHRINK_DUR)
    const e = easeOut(t)
    const f = state.shrinkFrom
    const to = state.shrinkTo
    
    state.zone.x = lerp(f.x, to.x, e)
    state.zone.y = lerp(f.y, to.y, e)
    state.zone.w = lerp(f.w, to.w, e)
    state.zone.h = lerp(f.h, to.h, e)
    
    if (t >= 1) {
        state.shrinking = false
        state.zone.x = to.x
        state.zone.y = to.y
        state.zone.w = to.w
        state.zone.h = to.h
        filterEntities(to)
    }
}