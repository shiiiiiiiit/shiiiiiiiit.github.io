import { ITEMS, INV_SIZE, SHIELD_DUR, THROW_DUR, MONSTER_R, TWO_PI, LASER_CHARGE_DUR } from '../constants.js'
import { state, sends } from '../state.js'
import { uid, rand, distSq, me, send } from '../utils.js'
import { blocked } from '../systems/collision.js'

import { MONSTER_HP, MONSTER_CD } from '../constants.js'

export function tryPickItem() {
    const p = me()
    if (!p || p.hp <= 0 || state.inventory.length >= INV_SIZE) return
    
    const px = p.x, py = p.y
    for (let i = state.items.length - 1; i >= 0; i--) {
        const it = state.items[i]
        if (distSq(px, py, it.x, it.y) < 1600) {
            state.inventory.push({ type: it.type, id: it.id })
            state.items.splice(i, 1)
            send('items', { items: state.items })
            break
        }
    }
}

export function useItem(slot) {
    const p = me()
    if (!p || p.hp <= 0 || slot >= state.inventory.length) return
    if (state.shieldTime > 0 || state.laserPhase !== 'none') return
    
    const item = state.inventory.splice(slot, 1)[0]
    const d = { type: item.type, x: p.x, y: p.y, angle: p.angle }
    execItem(d, state.peerId)
    send('useitem', d)
}

export function execItem(d, pid) {
    const p = state.players[pid]
    if (!p) return
    
    const isMe = pid === state.peerId
    const { type, x, y, angle } = d
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    
    const throwProj = (t, ex, ey, extra = {}) => {
        const proj = {
            id: uid('proj'),
            type: t,
            startX: x,
            startY: y,
            endX: ex,
            endY: ey,
            time: 0,
            duration: THROW_DUR,
            owner: pid,
            ...extra
        }
        state.projectiles.push(proj)
        if (isMe) send('entity', { type: 'projectile', entity: proj })
    }
    
    switch (type) {
        case 'mud':
            throwProj('mud', x + cosA * 300, y + sinA * 300)
            break
        case 'banana':
            throwProj('banana', x + cosA * 250, y + sinA * 250, { angle })
            break
        case 'laser':
            if (isMe) {
                state.laserPhase = 'charge'
                state.laserPhaseTime = 0
                state.laserAngle = angle
                state.laserCharging = LASER_CHARGE_DUR
            }
            break
        case 'monster_bottle': {
            const mon = {
                id: uid('m'),
                x: x + cosA * 350,
                y: y + sinA * 350,
                angle: rand(0, TWO_PI),
                hp: MONSTER_HP,
                cooldown: MONSTER_CD
            }
            state.monsters.push(mon)
            if (isMe) send('entity', { type: 'monster', entity: mon })
            break
        }
        case 'magnet':
            if (isMe) state.magnetTime = 5
            p.magnetTime = 5
            break
        case 'smoke':
            throwProj('smoke', x + cosA * 350, y + sinA * 350)
            break
        case 'shield':
            p.shieldTime = SHIELD_DUR
            if (isMe) state.shieldTime = SHIELD_DUR
            break
        case 'invisibility':
            p.invisibleTime = (p.invisibleTime || 0) + 3
            if (isMe) state.invisibleTime = p.invisibleTime
            break
        case 'heal_potion':
            p.hp = p.maxHp
            break
    }
}

export function updateProjectiles(dt) {
    const SMOKE_DUR = 15
    const TANK_R = 22
    
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i]
        p.time += dt
        if (p.time < p.duration) continue
        
        state.projectiles.splice(i, 1)
        
        if (p.type === 'mud') {
            state.mudPools.push({ id: uid('mud'), x: p.endX, y: p.endY, life: 20 })
        } else if (p.type === 'banana') {
            for (let j = 0; j < 5; j++) {
                const d = rand(50, 150)
                const a = p.angle + rand(-0.8, 0.8)
                const bx = p.endX + Math.cos(a) * d
                const by = p.endY + Math.sin(a) * d
                if (!blocked(bx, by, TANK_R, true)) {
                    state.bananas.push({ id: uid('ban'), x: bx, y: by })
                }
            }
        } else if (p.type === 'smoke') {
            const VIEW_W = 800, VIEW_H = 600
            const sm = {
                id: uid('smoke'),
                x: p.endX,
                y: p.endY,
                life: SMOKE_DUR,
                maxLife: SMOKE_DUR,
                r: Math.max(VIEW_W, VIEW_H) / 2,
                spawnTime: 0
            }
            state.smokes.push(sm)
            if (p.owner === state.peerId) {
                send('entity', { type: 'smoke', entity: sm })
            }
        }
    }
}