import {
    VIEW_W, VIEW_H, INV_SIZE, AMMO_MAX, DASH_MAX, DASH_REGEN,
    CHARGE_TIME, CHARGE_AMMO_COST, TWO_PI, HALF_PI,
    DASH_HOLD_THRESHOLD, ITEMS, BASE_CD, BUFF_RED
} from '../constants.js'
import { state, framePlayerEntries } from '../state.js'
import { me } from '../utils.js'
import { images } from '../assets/images.js'
import { fillCircle, strokeCircle, drawImg } from './renderUtils.js'

export function renderOverlay(ctx, p) {
    if (state.invincibleTime > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, 0, VIEW_W, VIEW_H)
        
        const sec = Math.ceil(state.invincibleTime)
        ctx.fillStyle = '#f39c12'
        ctx.font = 'bold 120px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(sec, VIEW_W * 0.5, VIEW_H * 0.5 - 20)
        
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 28px sans-serif'
        ctx.fillText(state.soloMode ? '🎯 训练开始！' : '⚔️ 准备战斗！', VIEW_W * 0.5, VIEW_H * 0.5 + 80)
    }
    
    if (p && p.hp <= 0 && !state.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(0, 240, VIEW_W, 120)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('💀 你已被击毁！', VIEW_W * 0.5, 290)
        ctx.font = '20px sans-serif'
        ctx.fillStyle = '#aaa'
        ctx.fillText(state.soloMode ? '训练结束...' : '等待其他玩家完成战斗...', VIEW_W * 0.5, 330)
    }
}

export function renderCrosshair(ctx) {
    const p = me()
    if (!p || p.hp <= 0) return
    
    const mx = state.mouse.x
    const my = state.mouse.y
    const crossColor = state.perfectGlow ? 'rgba(255,221,68,0.9)' : 'rgba(255,255,255,0.7)'
    
    ctx.strokeStyle = crossColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(mx - 12, my)
    ctx.lineTo(mx - 5, my)
    ctx.moveTo(mx + 5, my)
    ctx.lineTo(mx + 12, my)
    ctx.moveTo(mx, my - 12)
    ctx.lineTo(mx, my - 5)
    ctx.moveTo(mx, my + 5)
    ctx.lineTo(mx, my + 12)
    ctx.stroke()
    
    const showCharge = state.holding && state.chargeTime > 0.3 && state.ammo >= CHARGE_AMMO_COST
    if (showCharge) {
        const pct = Math.min(1, (state.chargeTime - 0.3) / (CHARGE_TIME - 0.3))
        const ready = state.chargeTime >= CHARGE_TIME
        ctx.strokeStyle = ready ? '#ff4444' : '#ffaa00'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(mx, my, 18, -HALF_PI, -HALF_PI + TWO_PI * pct)
        ctx.stroke()
        fillCircle(ctx, mx, my, ready ? 3 : 2, ready ? '#ff4444' : 'rgba(255,255,255,0.9)')
    } else if (state.perfectGlow) {
        const pulse = 0.6 + Math.sin(state.perfectGlowTime * 6) * 0.4
        ctx.strokeStyle = `rgba(255,221,68,${pulse})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(mx, my, 16, 0, TWO_PI)
        ctx.stroke()
        fillCircle(ctx, mx, my, 3, '#ffdd44')
    } else {
        fillCircle(ctx, mx, my, 2, 'rgba(255,255,255,0.9)')
    }
}

export function renderHUD(ctx, p) {
    if (!p) return
    
    // 左上角状态面板
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(10, 10, 180, 130)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    
    let y = 32
    const drawHudLine = (iconName, text) => {
        const icon = images[iconName]
        if (icon) ctx.drawImage(icon, 18, y - 12, 16, 16)
        ctx.fillText(text, 40, y)
        y += 20
    }
    
    drawHudLine('icon_hp', `${p.hp}/${p.maxHp}`)
    const rp = p.dashEnergy < DASH_MAX ? ` (${((1 - state.dashRegenTimer / DASH_REGEN) * 100) | 0}%)` : ''
    drawHudLine('icon_dash', `喷发: ${p.dashEnergy}/${DASH_MAX}${rp}`)
    ctx.fillText(`🔫 射速: +${p.firerateBuff}`, 20, y)
    y += 20
    ctx.fillText(`💨 移速: +${p.speedBuff * 10}%`, 20, y)
    y += 20
    ctx.fillText(`🎯 子弹: +${p.bulletBuff}`, 20, y)
    
    // 状态效果
    let ey = 150
    ctx.fillStyle = '#fff'
    if (state.perfectGlow) {
        ctx.fillStyle = '#ffdd44'
        ctx.fillText('⚡ 反击光芒', 20, ey)
        ey += 18
    }
    if (state.laserPhase !== 'none') {
        ctx.fillStyle = '#00ccff'
        const labels = { charge: '蓄力', warn: '瞄准', beam: '发射', fade: '消散' }
        ctx.fillText(`💥 激光${labels[state.laserPhase] || ''}中`, 20, ey)
        ey += 18
    }
    if (state.shieldTime > 0) {
        ctx.fillStyle = '#ffd700'
        ctx.fillText(`🛡️ ${state.shieldTime.toFixed(1)}s`, 20, ey)
        ey += 18
    }
    if (state.invisibleTime > 0) {
        ctx.fillStyle = '#aaa'
        ctx.fillText(`👻 ${state.invisibleTime.toFixed(1)}s`, 20, ey)
        ey += 18
    }
    if (state.magnetTime > 0) {
        ctx.fillStyle = '#ff6b6b'
        ctx.fillText(`🧲 ${state.magnetTime.toFixed(1)}s`, 20, ey)
        ey += 18
    }
    if (state.slideTime > 0) {
        ctx.fillStyle = '#ffeb3b'
        ctx.fillText(`🍌 ${state.slideTime.toFixed(1)}s`, 20, ey)
    }
    
    // 物品栏
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(VIEW_W * 0.5 - 130, VIEW_H - 60, 260, 50)
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    
    for (let i = 0; i < INV_SIZE; i++) {
        const x = VIEW_W * 0.5 - 120 + i * 50
        const iy = VIEW_H - 55
        ctx.strokeStyle = state.inventory[i] ? '#fff' : '#555'
        ctx.lineWidth = 2
        ctx.strokeRect(x, iy, 40, 40)
        ctx.fillStyle = '#888'
        ctx.fillText(i + 1, x + 20, iy + 48)
        if (state.inventory[i]) {
            drawImg(ctx, ITEMS[state.inventory[i].type], x + 20, iy + 20, 32, 32)
        }
    }
    
    // 缩圈计时
    if (state.invincibleTime <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fillRect(VIEW_W * 0.5 - 60, 10, 120, 30)
        ctx.fillStyle = state.shrinking ? '#ff6b6b' : '#e74c3c'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        const timerIcon = images['icon_timer']
        if (timerIcon) ctx.drawImage(timerIcon, VIEW_W * 0.5 - 50, 13, 20, 20)
        ctx.fillText(state.shrinking ? '缩圈中' : `${Math.ceil(state.shrinkTimer)}s`, VIEW_W * 0.5 + 10, 30)
    }
    
    // 弹药条
    if (state.invincibleTime <= 0 && p.hp > 0 && state.shieldTime <= 0 && state.laserPhase === 'none') {
        const barX = 10
        const barY = VIEW_H - 45
        const barW = 150
        const barH = 35
        
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fillRect(barX, barY, barW, barH)
        
        const cellW = (barW - 16) / AMMO_MAX
        const isCharging = state.holding && state.chargeTime >= CHARGE_TIME && state.ammo >= CHARGE_AMMO_COST
        
        for (let i = 0; i < AMMO_MAX; i++) {
            if (i < state.ammo) {
                if (isCharging) {
                    ctx.fillStyle = '#ff6644'
                } else if (state.perfectGlow) {
                    ctx.fillStyle = '#ffdd44'
                } else {
                    ctx.fillStyle = '#2ecc71'
                }
            } else {
                ctx.fillStyle = '#333'
            }
            ctx.fillRect(barX + 8 + i * cellW, barY + 6, cellW - 2, 10)
        }
        
        // 弹药恢复进度
        if (state.ammo < AMMO_MAX && !isCharging) {
            const rate = Math.max(0.3, BASE_CD - p.firerateBuff * BUFF_RED)
            const pct = state.ammoRegenTimer / rate
            ctx.fillStyle = 'rgba(46,204,113,0.4)'
            ctx.fillRect(barX + 8 + state.ammo * cellW, barY + 6, (cellW - 2) * pct, 10)
        }
        
        ctx.fillStyle = '#fff'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        
        let label = `🔫 ${state.ammo}/${AMMO_MAX}`
        if (state.perfectGlow) {
            label = `⚡ ${state.ammo}/${AMMO_MAX} 反击!`
        } else if (state.holding && state.chargeTime > 0.3 && state.ammo >= CHARGE_AMMO_COST) {
            const pct = Math.min(100, (state.chargeTime / CHARGE_TIME * 100) | 0)
            label = state.chargeTime >= CHARGE_TIME ? '⚡ 蓄力完成!' : `⚡ 蓄力 ${pct}%`
        }
        ctx.fillText(label, barX + barW * 0.5, barY + 30)
    }
    
    
    // 训练计时
    if (state.soloMode && state.soloStartTime) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.fillRect(VIEW_W - 100, 10, 90, 30)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`⏱️ ${((Date.now() - state.soloStartTime) / 1000) | 0}s`, VIEW_W - 55, 30)
    }
}

export function renderMinimap(ctx) {
    const mw = 160
    const mh = 120
    const mx = VIEW_W - mw - 10
    const my = VIEW_H - mh - 70
    const z = state.zone
    const sx = mw / z.w
    const sy = mh / z.h
    
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(mx, my, mw, mh)
    ctx.strokeStyle = state.shrinking ? '#ff6b6b' : '#e74c3c'
    ctx.lineWidth = 2
    ctx.strokeRect(mx, my, mw, mh)
    
    // 缩圈预览
    if (state.shrinking && state.shrinkTo) {
        ctx.strokeStyle = 'rgba(231,76,60,0.5)'
        ctx.setLineDash([3, 3])
        ctx.strokeRect(
            mx + (state.shrinkTo.x - z.x) * sx,
            my + (state.shrinkTo.y - z.y) * sy,
            state.shrinkTo.w * sx,
            state.shrinkTo.h * sy
        )
        ctx.setLineDash([])
    }
    
    // 墙壁
    ctx.fillStyle = '#4a4a6a'
    for (let i = 0; i < state.walls.length; i++) {
        const w = state.walls[i]
        ctx.fillRect(
            mx + (w.x - z.x) * sx,
            my + (w.y - z.y) * sy,
            Math.max(2, w.w * sx),
            Math.max(2, w.h * sy)
        )
    }
    
    // 障碍物
    ctx.fillStyle = '#3a5a3a'
    ctx.beginPath()
    for (let i = 0; i < state.obstacles.length; i++) {
        const o = state.obstacles[i]
        const ox = mx + (o.x - z.x) * sx
        const oy = my + (o.y - z.y) * sy
        ctx.moveTo(ox + Math.max(2, o.r * sx), oy)
        ctx.arc(ox, oy, Math.max(2, o.r * sx), 0, TWO_PI)
    }
    ctx.fill()
    
    // 怪物
    ctx.strokeStyle = '#ff4444'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i]
        if (m.hp <= 0) continue
        const ox = mx + (m.x - z.x) * sx
        const oy = my + (m.y - z.y) * sy
        ctx.moveTo(ox + 5, oy)
        ctx.arc(ox, oy, 5, 0, TWO_PI)
    }
    ctx.stroke()
    
    // Buff
    ctx.fillStyle = '#f39c12'
    ctx.beginPath()
    for (let i = 0; i < state.buffs.length; i++) {
        const b = state.buffs[i]
        const ox = mx + (b.x - z.x) * sx
        const oy = my + (b.y - z.y) * sy
        ctx.moveTo(ox + 3, oy)
        ctx.arc(ox, oy, 3, 0, TWO_PI)
    }
    ctx.fill()
    
    // 道具
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    for (let i = 0; i < state.items.length; i++) {
        const it = state.items[i]
        const ox = mx + (it.x - z.x) * sx
        const oy = my + (it.y - z.y) * sy
        ctx.moveTo(ox + 3, oy)
        ctx.arc(ox, oy, 3, 0, TWO_PI)
    }
    ctx.fill()
    
    // 烟雾
    for (let i = 0; i < state.smokes.length; i++) {
        const s = state.smokes[i]
        fillCircle(
            ctx,
            mx + (s.x - z.x) * sx,
            my + (s.y - z.y) * sy,
            Math.max(5, s.r * sx),
            'rgba(120,120,140,0.7)'
        )
    }
    
    // 自己
    const p = me()
    if (p && p.hp > 0) {
        const px = mx + (p.x - z.x) * sx
        const py = my + (p.y - z.y) * sy
        fillCircle(ctx, px, py, 4, p.color)
        strokeCircle(ctx, px, py, 6, '#fff', 1)
    }
    
    // 视野框
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(
        mx + (state.camera.x - z.x) * sx,
        my + (state.camera.y - z.y) * sy,
        VIEW_W * sx,
        VIEW_H * sy
    )
}