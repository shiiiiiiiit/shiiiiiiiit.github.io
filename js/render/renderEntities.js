import { TANK_R, MONSTER_R, MONSTER_HP, MUD_RX, MUD_RY, BUFFS, ITEMS, TWO_PI, HALF_PI, SHAKE_DUR, SHAKE_INTENSITY, HIT_SHAKE_DUR, HIT_SHAKE_INTENSITY, CHARGE_TIME, CHARGE_AMMO_COST, LASER_CHARGE_DUR } from '../constants.js'
import { state, framePlayerEntries } from '../state.js'
import { inView, dist } from '../utils.js'
import { images, tankCache, wallPattern } from '../assets/images.js'
import { fillCircle, strokeCircle, drawImg, drawTintedTank, lerp } from './renderUtils.js'

export function renderWalls(ctx, camX, camY) {
    if (!wallPattern) return
    
    for (let i = 0; i < state.walls.length; i++) {
        const w = state.walls[i]
        if (!inView(w.x + w.w * 0.5, w.y + w.h * 0.5, Math.max(w.w, w.h) * 0.5 + 100)) continue
        
        const sx = w.x - camX
        const sy = w.y - camY
        
        ctx.save()
        ctx.beginPath()
        ctx.rect(sx, sy, w.w, w.h)
        ctx.clip()
        ctx.fillStyle = wallPattern
        ctx.translate(sx, sy)
        ctx.fillRect(0, 0, w.w, w.h)
        ctx.restore()
        
        ctx.strokeStyle = '#6a6a8a'
        ctx.lineWidth = 2
        ctx.strokeRect(sx, sy, w.w, w.h)
    }
}

export function renderObstacles(ctx, camX, camY) {
    for (let i = 0; i < state.obstacles.length; i++) {
        const o = state.obstacles[i]
        if (!inView(o.x, o.y, 80)) continue
        drawImg(ctx, o.type === 'tree' ? 'obstacle_tree' : 'obstacle_rock', o.x - camX, o.y - camY, o.r * 2.2, o.r * 2.2)
    }
}

export function renderMudPools(ctx, camX, camY) {
    for (let i = 0; i < state.mudPools.length; i++) {
        const m = state.mudPools[i]
        if (!inView(m.x, m.y, MUD_RX + 50)) continue
        drawImg(ctx, 'mud_pool', m.x - camX, m.y - camY, MUD_RX * 2, MUD_RY * 2)
    }
}

export function renderBananas(ctx, camX, camY) {
    for (let i = 0; i < state.bananas.length; i++) {
        const b = state.bananas[i]
        if (!inView(b.x, b.y, 30)) continue
        drawImg(ctx, 'banana_peel', b.x - camX, b.y - camY, 32, 32)
    }
}

export function renderProjectiles(ctx, camX, camY) {
    for (let i = 0; i < state.projectiles.length; i++) {
        const pr = state.projectiles[i]
        const t = pr.time / pr.duration
        const x = lerp(pr.startX, pr.endX, t)
        const y = lerp(pr.startY, pr.endY, t) - Math.sin(t * Math.PI) * 100
        if (!inView(x, y, 30)) continue
        
        const imgName = pr.type === 'mud' ? 'item_mud' : pr.type === 'smoke' ? 'item_smoke' : 'item_banana'
        drawImg(ctx, imgName, x - camX, y - camY, 32, 32)
    }
}

export function renderItems(ctx, camX, camY) {
    for (let i = 0; i < state.items.length; i++) {
        const it = state.items[i]
        if (!inView(it.x, it.y, 30)) continue
        
        const sx = it.x - camX
        const sy = it.y - camY
        fillCircle(ctx, sx, sy, 22, 'rgba(255,255,255,0.15)')
        drawImg(ctx, ITEMS[it.type], sx, sy, 36, 36)
    }
}

export function renderBuffs(ctx, camX, camY) {
    const t = Date.now() * 0.001
    for (let i = 0; i < state.buffs.length; i++) {
        const b = state.buffs[i]
        if (!inView(b.x, b.y, 50)) continue
        
        const sx = b.x - camX
        const sy = b.y - camY + Math.sin(t * 3) * 5
        strokeCircle(ctx, sx, sy, 22, BUFFS[b.type].color, 3)
        drawImg(ctx, BUFFS[b.type].icon, sx, sy, 40, 40)
    }
}

export function renderMonsters(ctx, camX, camY) {
    for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i]
        if (m.hp <= 0 || !inView(m.x, m.y, MONSTER_R + 20)) continue
        
        const sx = m.x - camX
        const sy = m.y - camY
        drawImg(ctx, 'monster', sx, sy, MONSTER_R * 2.2, MONSTER_R * 2.2, m.angle)
        
        // 血条
        ctx.fillStyle = '#333'
        ctx.fillRect(sx - 30, sy - MONSTER_R - 15, 60, 8)
        ctx.fillStyle = '#e74c3c'
        ctx.fillRect(sx - 29, sy - MONSTER_R - 14, 58 * m.hp / MONSTER_HP, 6)
    }
}

export function renderDashGhosts(ctx, camX, camY) {
    for (let i = 0; i < state.dashGhosts.length; i++) {
        const g = state.dashGhosts[i]
        if (!inView(g.x, g.y, 50)) continue
        
        const sx = g.x - camX
        const sy = g.y - camY
        ctx.save()
        ctx.globalAlpha = (g.life / g.maxLife) * 0.5
        drawTintedTank(ctx, 'body', g.color, sx, sy, 56, 56, g.bodyAngle)
        drawTintedTank(ctx, 'turret', g.color, sx, sy, 48, 48, g.angle)
        ctx.restore()
    }
}

export function renderTanks(ctx, camX, camY, myP) {
    const now = Date.now()
    
    for (let pi = 0; pi < framePlayerEntries.length; pi++) {
        const [id, p] = framePlayerEntries[pi]
        if (p.hp <= 0 || !inView(p.x, p.y, 50)) continue
        if (p.invisibleTime > 0 && id !== state.peerId) continue
        
        const isMe = id === state.peerId
        let sx = p.x - camX
        let sy = p.y - camY
        
        // 移动晃动
        if (isMe && state.tankMoveTime > 0) {
            const v = Math.sin(state.tankMoveTime * 40) * 0.75
            sx += v * Math.cos(p.bodyAngle + HALF_PI)
            sy += v * Math.sin(p.bodyAngle + HALF_PI)
        }
        
        // 射击抖动
        if (isMe && state.shake > 0) {
            const intensity = (state.shake / SHAKE_DUR) * SHAKE_INTENSITY
            sx += (Math.random() - 0.5) * intensity * 2
            sy += (Math.random() - 0.5) * intensity * 2
        }
        
        // 受击抖动
        if (isMe && state.hitShake > 0) {
            const intensity = (state.hitShake / HIT_SHAKE_DUR) * HIT_SHAKE_INTENSITY
            sx += (Math.random() - 0.5) * intensity * 2
            sy += (Math.random() - 0.5) * intensity * 2
        }
        
        ctx.save()
        let alpha = 1
        if (state.invincibleTime > 0) alpha = ((now / 100) | 0) % 2 ? 1 : 0.5
        if (p.invisibleTime > 0) alpha = 0.3
        
        // 阴影
        ctx.globalAlpha = alpha * 0.4
        drawImg(ctx, 'tank_shadow', sx + 3, sy + 3, 50, 50)
        ctx.globalAlpha = alpha
        
        // 护盾
        if (p.shieldTime > 0) {
            ctx.shadowColor = '#ffd700'
            ctx.shadowBlur = 25
            drawImg(ctx, 'shield_effect', sx, sy, 80, 80)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
        }
        
        // 蓄力光效
        if (isMe && state.holding && state.chargeTime > 0.3 && state.ammo >= CHARGE_AMMO_COST) {
            const pct = Math.min(1, (state.chargeTime - 0.3) / (CHARGE_TIME - 0.3))
            const ready = state.chargeTime >= CHARGE_TIME
            ctx.shadowColor = ready ? '#ff4444' : '#ffaa00'
            ctx.shadowBlur = 10 + pct * 30
            fillCircle(ctx, sx, sy, 30 + pct * 10, `rgba(${ready ? '255,50,50' : '255,170,0'},${pct * 0.3})`)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
        }
        
        // 完美闪避光芒
        if (isMe && state.perfectGlow) {
            const pulse = 0.8 + Math.sin(state.perfectGlowTime * 8) * 0.2
            ctx.shadowColor = '#ffdd44'
            ctx.shadowBlur = 30 + Math.sin(state.perfectGlowTime * 6) * 15
            drawImg(ctx, 'perfect_glow', sx, sy, 128 * pulse, 128 * pulse, state.perfectGlowTime * 2)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
        }
        
        // 短冲刺闪烁
        if (isMe && state.dashing && state.dashType === 'short') {
            ctx.globalAlpha = alpha * (((now / 40) | 0) % 2 ? 1 : 0.4)
        }
        
        // 激光蓄力能量球
        if (isMe && state.laserPhase === 'charge') {
            const chargePct = 1 - state.laserCharging / LASER_CHARGE_DUR
            const chargeSize = 16 + chargePct * 32
            const mx = sx + Math.cos(p.angle) * 30
            const my = sy + Math.sin(p.angle) * 30
            ctx.shadowColor = '#00ccff'
            ctx.shadowBlur = 15 + chargePct * 25
            drawImg(ctx, 'laser_charge', mx, my, chargeSize, chargeSize)
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
        }
        
        // 坦克本体
        if (isMe && state.hitShake > 0) {
            drawTintedTank(ctx, 'body', p.color, sx, sy, 56, 56, p.bodyAngle)
            drawTintedTank(ctx, 'turret', p.color, sx, sy, 48, 48, p.angle)
            ctx.globalAlpha = (state.hitShake / HIT_SHAKE_DUR) * 0.4
            fillCircle(ctx, sx, sy, 30, 'rgba(255,50,50,0.6)')
            ctx.globalAlpha = alpha
        } else {
            drawTintedTank(ctx, 'body', p.color, sx, sy, 56, 56, p.bodyAngle)
            drawTintedTank(ctx, 'turret', p.color, sx, sy, 48, 48, p.angle)
        }
        
        ctx.restore()
        
        // 血条
        if (isMe) {
            ctx.fillStyle = '#333'
            ctx.fillRect(sx - 25, sy - 42, 50, 6)
            ctx.fillStyle = p.hp > p.maxHp * 0.3 ? '#2ecc71' : '#e74c3c'
            ctx.fillRect(sx - 24, sy - 41, 48 * p.hp / p.maxHp, 4)
        }
    }
}

export function renderBullets(ctx, camX, camY) {
    for (let i = 0; i < state.bullets.length; i++) {
        const b = state.bullets[i]
        if (!inView(b.x, b.y, 20)) continue
        
        let imgName = 'bullet_normal'
        let size = 16
        if (b.isPerfect) {
            imgName = 'bullet_perfect'
            size = 24
        } else if (b.isMonster) {
            imgName = 'bullet_monster'
            size = 16
        }
        drawImg(ctx, imgName, b.x - camX, b.y - camY, size, size)
    }
}