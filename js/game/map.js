import { MAP_W, MAP_H, WALL_N, OBST_N, MONSTER_R, TWO_PI, ITEM_TYPES } from '../constants.js'
import { state } from '../state.js'
import { rand, randItem, rectCircle, distSq, uid } from '../utils.js'

export function genMap() {
    const walls = []
    const obstacles = []
    
    for (let i = 0; i < WALL_N; i++) {
        const h = Math.random() > 0.5
        walls.push({
            x: 300 + rand(0, MAP_W - 600),
            y: 300 + rand(0, MAP_H - 600),
            w: h ? rand(150, 400) : 25,
            h: h ? 25 : rand(150, 400)
        })
    }
    
    for (let i = 0; i < OBST_N; i++) {
        const t = Math.random() > 0.4 ? 'tree' : 'rock'
        obstacles.push({
            type: t,
            x: 200 + rand(0, MAP_W - 400),
            y: 200 + rand(0, MAP_H - 400),
            r: t === 'tree' ? rand(25, 45) : rand(20, 45)
        })
    }
    
    return { walls, obstacles }
}

export function genSpawns(n, walls, obst) {
    const pos = []
    const MARGIN = 300
    const MIN_SQ = 1200 * 1200
    
    for (let i = 0; i < n; i++) {
        let x, y, ok, att = 0
        do {
            ok = true
            x = rand(MARGIN, MAP_W - MARGIN)
            y = rand(MARGIN, MAP_H - MARGIN)
            
            for (const w of walls) {
                if (rectCircle(w, x, y, 60)) { ok = false; break }
            }
            if (ok) {
                for (const o of obst) {
                    if (distSq(x, y, o.x, o.y) < (o.r + 60) * (o.r + 60)) { ok = false; break }
                }
            }
            if (ok) {
                for (const p of pos) {
                    if (distSq(x, y, p.x, p.y) < MIN_SQ) { ok = false; break }
                }
            }
        } while (!ok && ++att < 300)
        
        pos.push({ x, y, angle: rand(0, TWO_PI) })
    }
    return pos
}

export function findPos(r, zone = state.zone) {
    let x, y, ok, att = 0
    do {
        ok = true
        x = zone.x + rand(100, zone.w - 200)
        y = zone.y + rand(100, zone.h - 200)
        
        for (const w of state.walls) {
            if (rectCircle(w, x, y, r + 20)) { ok = false; break }
        }
        if (ok) {
            for (const o of state.obstacles) {
                if (distSq(x, y, o.x, o.y) < (o.r + r + 20) * (o.r + r + 20)) { ok = false; break }
            }
        }
        if (ok) {
            for (const m of state.monsters) {
                if (m.hp > 0 && distSq(x, y, m.x, m.y) < (MONSTER_R + r + 20) * (MONSTER_R + r + 20)) { ok = false; break }
            }
        }
    } while (!ok && ++att < 100)
    
    return { x, y }
}

export function spawnMonsters(n) {
    const MONSTER_HP = 30
    const MONSTER_CD = 0.6
    
    for (let i = 0; i < n; i++) {
        state.monsters.push({
            id: uid('m'),
            ...findPos(MONSTER_R),
            angle: rand(0, TWO_PI),
            hp: MONSTER_HP,
            cooldown: rand(0, MONSTER_CD)
        })
    }
}

export function spawnItems(n) {
    for (let i = 0; i < n; i++) {
        state.items.push({
            id: uid('i'),
            ...findPos(25),
            type: randItem(ITEM_TYPES)
        })
    }
}