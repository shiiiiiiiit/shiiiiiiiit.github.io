import { BULLET_SPD, BULLET_R, TANK_R, MONSTER_R, MONSTER_RANGE, MONSTER_CD, DASH_MAX } from '../constants.js'
import { state, framePlayerEntries, frameAlivePlayers } from '../state.js'
import { uid, send, isHost, me, inZone, inSmoke, dist, distSq, clamp, angleDiff, inView , rectCircle } from '../utils.js'
import { blocked } from '../systems/collision.js'
import { getNearbyWalls, getNearbyObstacles } from '../systems/spatialGrid.js'
import { trailPool } from '../systems/objectPool.js'
import { spawnBuffAt } from './buffs.js'
import { checkEnd, triggerHitEffect } from './gameLoop.js'

// 爆炸
export function addExplosion(x, y, life = 1) {
    state.explosions.push({ x, y, life, maxLife: life })
}

// 枪口闪光
export function addFlash(x, y, a) {
    if (x != null && y != null) {
        state.muzzleFlashes.push({ x, y, angle: a, life: 0.1, maxLife: 0.1 })
    }
}

// 怪物AI
export function updateMonsters(dt) {
    for (let mi = 0; mi < state.monsters.length; mi++) {
        const m = state.monsters[mi]
        if (m.hp <= 0) continue
        if (!inZone(m.x, m.y, MONSTER_R)) {
            m.hp = 0
            continue
        }
        
        let closest = null
        let minD = Infinity
        const mInSmoke = inSmoke(m.x, m.y)
        
        for (let i = 0; i < frameAlivePlayers.length; i++) {
            const [, p] = frameAlivePlayers[i]
            if (inSmoke(p.x, p.y) || p.invisibleTime > 0) continue
            const d = dist(m.x, m.y, p.x, p.y)
            if (d < minD) {
                minD = d
                closest = p
            }
        }
        
        if (closest && minD < MONSTER_RANGE * 1.5) {
            const diff = angleDiff(m.angle, Math.atan2(closest.y - m.y, closest.x - m.x))
            m.angle += clamp(diff, -2.4 * dt, 2.4 * dt)
        }
        
        if (closest && minD < MONSTER_RANGE && state.invincibleTime <= 0 && !mInSmoke) {
            m.cooldown -= dt
            if (m.cooldown <= 0) {
                m.cooldown = MONSTER_CD
                const cosA = Math.cos(m.angle)
                const sinA = Math.sin(m.angle)
                const bx = m.x + cosA * (MONSTER_R + 10)
                const by = m.y + sinA * (MONSTER_R + 10)
                
                if (!blocked(bx, by, BULLET_R, true)) {
                    state.bullets.push({
                        id: uid('mb'),
                        x: bx, y: by,
                        vx: cosA * BULLET_SPD * 0.8,
                        vy: sinA * BULLET_SPD * 0.8,
                        owner: m.id,
                        life: 300,
                        isMonster: true,
                        dmg: 1
                    })
                    addFlash(bx, by, m.angle)
                }
            }
        }
    }
}

// 子弹更新
export function updateBullets(dt) {
    const z = state.zone
    const zxMin = z.x + BULLET_R
    const zxMax = z.x + z.w - BULLET_R
    const zyMin = z.y + BULLET_R
    const zyMax = z.y + z.h - BULLET_R
    
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i]
        const ox = b.x, oy = b.y
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.life--
        
        // 边界反弹
        if (b.x < zxMin) { b.vx = Math.abs(b.vx); b.x = zxMin }
        else if (b.x > zxMax) { b.vx = -Math.abs(b.vx); b.x = zxMax }
        if (b.y < zyMin) { b.vy = Math.abs(b.vy); b.y = zyMin }
        else if (b.y > zyMax) { b.vy = -Math.abs(b.vy); b.y = zyMax }
        
        // 墙壁反弹
        const walls = getNearbyWalls(b.x, b.y, BULLET_R + 5)
        for (let wi = 0; wi < walls.length; wi++) {
            const w = walls[wi]
            if (!rectCircle(w, b.x, b.y, BULLET_R)) continue
            
            b.x = ox; b.y = oy
            const cx = clamp(b.x, w.x, w.x + w.w)
            const cy = clamp(b.y, w.y, w.y + w.h)
            const dx = b.x - cx
            const dy = b.y - cy
            
            if (Math.abs(dx) > Math.abs(dy)) {
                b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx)
            } else {
                b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy)
            }
            b.x += b.vx * dt * 0.5
            b.y += b.vy * dt * 0.5
            break
        }
        
        // 障碍物碰撞
        let rm = false
        const obsts = getNearbyObstacles(b.x, b.y, BULLET_R + 50)
        for (let oi = 0; oi < obsts.length; oi++) {
            const o = obsts[oi]
            if (distSq(b.x, b.y, o.x, o.y) < (o.r + BULLET_R) * (o.r + BULLET_R)) {
                removeBullet(i, b)
                addExplosion(b.x, b.y, 0.3)
                rm = true
                break
            }
        }
        
        if (rm || b.life <= 0) {
            if (!rm) removeBullet(i, b)
            continue
        }
        
        if (state.invincibleTime > 0) continue
        
        // 怪物碰撞
        if (!b.isMonster) {
            for (let mi = 0; mi < state.monsters.length; mi++) {
                const m = state.monsters[mi]
                if (m.hp <= 0) continue
                if (distSq(b.x, b.y, m.x, m.y) >= MONSTER_R * MONSTER_R) continue
                
                m.hp -= b.dmg || 1
                removeBullet(i, b)
                addExplosion(b.x, b.y, 0.3)
                send('monsterhit', { id: m.id, dmg: b.dmg || 1, by: b.owner })
                
                if (m.hp <= 0) {
                    addExplosion(m.x, m.y, 1.5)
                    if (b.owner === state.peerId) me().dashEnergy = DASH_MAX
                    if (isHost()) spawnBuffAt(m.x, m.y)
                }
                rm = true
                break
            }
            if (rm) continue
        }
        
        // 玩家碰撞
        for (let pi = 0; pi < framePlayerEntries.length; pi++) {
            const [id, p] = framePlayerEntries[pi]
            if (p.hp <= 0 || p.invisibleTime > 0 || b.owner === id) continue
            if (distSq(b.x, b.y, p.x, p.y) >= TANK_R * TANK_R) continue
            if (id === state.peerId && state.dashing && state.dashType === 'short') continue
            
            // 护盾反弹
            if (p.shieldTime > 0 && b.owner !== id) {
                const a = Math.atan2(b.y - p.y, b.x - p.x)
                b.vx = Math.cos(a) * BULLET_SPD
                b.vy = Math.sin(a) * BULLET_SPD
                b.owner = id
                b.isMonster = false
                continue
            }
            
            const key = `${b.id}-${id}`
            if (state.hitTargets.has(key)) continue
            state.hitTargets.set(key, b.id)
            
            p.hp -= b.dmg || 1
            if (id === state.peerId) triggerHitEffect(p.x, p.y)
            if (!b.isMonster) {
                send('hit', { target: id, bulletId: b.id, by: b.owner, dmg: b.dmg || 1 })
            }
            
            if (p.hp <= 0) {
                state.deadPlayers.push([id, p])
                addExplosion(p.x, p.y)
                checkEnd()
            }
            
            removeBullet(i, b)
            break
        }
    }
}

function removeBullet(index, bullet) {
    state.bullets.splice(index, 1)
    const bid = bullet.id
    for (const [key, storedId] of state.hitTargets) {
        if (storedId === bid) state.hitTargets.delete(key)
    }
}

// 生命周期更新
export function updateLife(dt) {
    updateLifeList(state.dashTrails, dt, t => trailPool.release(t))
    updateLifeList(state.mudPools, dt)
    updateLifeList(state.smokes, dt)
    updateLifeList(state.lasers, dt)
    updateLifeList(state.explosions, dt)
    updateLifeList(state.muzzleFlashes, dt)
}

function updateLifeList(list, dt, onRemove = null) {
    for (let i = list.length - 1; i >= 0; i--) {
        list[i].life -= dt
        if (list[i].life <= 0) {
            if (onRemove) onRemove(list[i])
            list.splice(i, 1)
        }
    }
}