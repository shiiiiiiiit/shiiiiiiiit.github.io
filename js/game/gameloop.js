import { VIEW_W, VIEW_H, DASH_MAX, DASH_REGEN, SHRINK_INTERVAL, BUFF_N, INVINCIBLE_T, HIT_SHAKE_DUR, HIT_SHAKE_INTENSITY, TANK_R, SMOKE_FADEIN_DUR } from '../constants.js'
import { state, updateFrameCache, framePlayerEntries, frameAlivePlayers, frameAliveCount, createDefaultState } from '../state.js'
import { $, me, send, isHost, clamp, pushOut } from '../utils.js'
import { updateShrink, doShrink } from './shrink.js'
import { updateProjectiles } from './items.js'
import { updateLaserPhase } from './laser.js'
import { updateDashInput, updateDash, updateDashGhosts, updateSlide, checkBanana, updateMovement, handleCollisions } from './movement.js'
import { updateShooting } from './shooting.js'
import { updateBullets, updateMonsters, updateLife } from './entities.js'
import { tryPickBuff, spawnBuffs } from './buffs.js'
import { tryPickItem, useItem } from './items.js'
import { render } from '../render/renderer.js'
import { showScreen, showResult } from '../ui/screens.js'

// 触发受击特效
export function triggerHitEffect(x, y) {
    state.hitShake = HIT_SHAKE_DUR
    state.hitExplosions.push({ x, y, life: 0.4, maxLife: 0.4 })
}

// 检查游戏结束
export function checkEnd() {
    if (state.soloMode) {
        if (me()?.hp <= 0) {
            state.gameOver = true
            state.winner = null
            setTimeout(endGame, 500)
        }
        return
    }
    
    if (frameAliveCount <= 1) {
        state.gameOver = true
        state.winner = frameAlivePlayers[0]?.[0] || null
        send('gameover', { winner: state.winner })
        setTimeout(endGame, 500)
    }
}

// 结束游戏
export function endGame() {
    cancelAnimationFrame(state.animFrameId)
    window.onkeydown = window.onkeyup = null
    const c = $('game-canvas')
    if (c) {
        c.onmousemove = c.onmousedown = c.onmouseup = null
    }
    showResult()
}

// 更新相机
function updateCamera() {
    const p = me()
    if (!p) return
    
    state.camera.x += (p.x - VIEW_W * 0.5 - state.camera.x) * 0.1
    state.camera.y += (p.y - VIEW_H * 0.5 - state.camera.y) * 0.1
    
    const z = state.zone
    state.camera.x = clamp(state.camera.x, z.x, z.x + z.w - VIEW_W)
    state.camera.y = clamp(state.camera.y, z.y, z.y + z.h - VIEW_H)
}

// 更新拾取动画
function updatePickupAnims(dt) {
    for (let i = state.pickupAnims.length - 1; i >= 0; i--) {
        state.pickupAnims[i].time += dt
        if (state.pickupAnims[i].time >= state.pickupAnims[i].duration) {
            state.pickupAnims.splice(i, 1)
        }
    }
}

// 主更新函数
function update(dt) {
    updateShrink(dt)
    updateProjectiles(dt)
    updatePickupAnims(dt)
    updateDashGhosts(dt)
    updateLaserPhase(dt)
    
    if (state.hitShake > 0) state.hitShake = Math.max(0, state.hitShake - dt)
    
    // 受击爆炸
    for (let i = state.hitExplosions.length - 1; i >= 0; i--) {
        state.hitExplosions[i].life -= dt
        if (state.hitExplosions[i].life <= 0) state.hitExplosions.splice(i, 1)
    }
    
    // 烟雾淡入
    for (let i = 0; i < state.smokes.length; i++) {
        const sm = state.smokes[i]
        if (sm.spawnTime !== undefined && sm.spawnTime < SMOKE_FADEIN_DUR) {
            sm.spawnTime += dt
        }
    }
    
    // 激光命中特效
    for (let i = state.laserImpacts.length - 1; i >= 0; i--) {
        state.laserImpacts[i].life -= dt
        if (state.laserImpacts[i].life <= 0) state.laserImpacts.splice(i, 1)
    }
    
    // 无敌时间
    if (state.invincibleTime > 0) {
        state.invincibleTime -= dt
        if (state.invincibleTime <= 0 && isHost()) {
            setTimeout(() => spawnBuffs(BUFF_N), 500)
        }
    } else if (isHost() && !state.shrinking) {
        state.shrinkTimer -= dt
        if (state.shrinkTimer <= 0) {
            state.shrinkTimer = SHRINK_INTERVAL
            doShrink()
        }
    }
    
    // 数字键道具
    for (let i = 1; i <= 5; i++) {
        if (state.keysJustPressed[`Digit${i}`]) useItem(i - 1)
    }
    
    const p = me()
    if (!p || p.hp <= 0) {
        updateBullets(dt)
        updateMonsters(dt)
        updateLife(dt)
        return
    }
    
    // 喷发能量恢复
    if (p.dashEnergy < DASH_MAX) {
        state.dashRegenTimer += dt
        if (state.dashRegenTimer >= DASH_REGEN) {
            state.dashRegenTimer = 0
            p.dashEnergy++
        }
    } else {
        state.dashRegenTimer = 0
    }
    
    // 状态计时
    if (state.shieldTime > 0) { state.shieldTime -= dt; p.shieldTime = state.shieldTime }
    if (state.invisibleTime > 0) { state.invisibleTime -= dt; p.invisibleTime = state.invisibleTime }
    if (state.magnetTime > 0) { state.magnetTime -= dt; p.magnetTime = state.magnetTime }
    if (state.perfectGlow) state.perfectGlowTime += dt
    
    // 特殊状态
    if (state.laserPhase !== 'none' || state.shieldTime > 0) {
        updateBullets(dt)
        updateMonsters(dt)
        updateLife(dt)
        return
    }
    
    if (state.slideTime > 0) {
        updateSlide(dt, p)
        return
    }
    
    checkBanana(p)
    updateDashInput(dt, p)
    if (state.dashing) updateDash(dt, p)
    
    let moved = updateMovement(dt, p)
    pushOut(p, TANK_R)
    handleCollisions(p, TANK_R)
    
    if ((moved || state.recoil.vx || state.recoil.vy || state.dashing) && !state.soloMode) {
        send('move', {
            x: p.x, y: p.y, angle: p.angle, bodyAngle: p.bodyAngle,
            hp: p.hp, dashEnergy: p.dashEnergy
        })
    }
    
    updateShooting(dt, p)
    tryPickBuff()
    tryPickItem()
    updateBullets(dt)
    updateMonsters(dt)
    updateLife(dt)
}

// 游戏主循环
export function gameLoop(t) {
    const dt = Math.min((t - state.lastTime) * 0.001, 0.05)
    state.lastTime = t
    
    if (state.gameOver) return
    
    updateFrameCache()
    update(dt)
    updateCamera()
    render()
    
    state.keysJustPressed = {}
    state.keysJustReleased = {}
    state.animFrameId = requestAnimationFrame(gameLoop)
}