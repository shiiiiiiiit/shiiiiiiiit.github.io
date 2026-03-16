import {
    SPEED, BODY_ROT_SPEED, TANK_R, DASH_MAX,
    DASH_SHORT_DIST, DASH_LONG_DIST, DASH_SHORT_DUR, DASH_LONG_DUR,
    DASH_HOLD_THRESHOLD, RECOIL_DECAY, RECOIL_MIN,
    SLIDE_DUR, SLIDE_MULT, BULLET_R
} from '../constants.js'
import { state, framePlayerEntries } from '../state.js'
import { clamp, dist, distSq, angleDiff, rectCircle } from '../helpers.js'
import { me, send, pushOut, speedMult } from '../utils.js'
import { blocked, slideBlocked } from '../systems/collision.js'
import { getNearbyWalls, getNearbyObstacles } from '../systems/spatialGrid.js'

// 冲刺输入处理
export function updateDashInput(dt, p) {
    const shiftDown = state.keys['ShiftLeft'] || state.keys['ShiftRight']
    const shiftJustPressed = state.keysJustPressed['ShiftLeft'] || state.keysJustPressed['ShiftRight']
    const shiftJustReleased = state.keysJustReleased['ShiftLeft'] || state.keysJustReleased['ShiftRight']
    
    if (shiftJustPressed && !state.dashing && p.dashEnergy > 0) {
        state.shiftHeld = true
        state.shiftHoldTime = 0
    }
    
    if (state.shiftHeld && shiftDown) {
        state.shiftHoldTime += dt
        
        // 长按：按住超过阈值立即触发长冲刺
        if (state.shiftHoldTime >= DASH_HOLD_THRESHOLD && !state.dashing && p.dashEnergy > 0) {
            state.shiftHeld = false
            p.dashEnergy--
            state.dashing = true
            state.dashDir.x = Math.cos(p.bodyAngle)
            state.dashDir.y = Math.sin(p.bodyAngle)
            state.dashType = 'long'
            state.dashTime = DASH_LONG_DUR
            state.dashTotalDur = DASH_LONG_DUR
            addDashGhost(p)
        }
    }
    
    // 短按：释放时未超过阈值，触发短冲刺
    if (shiftJustReleased && state.shiftHeld && !state.dashing && p.dashEnergy > 0) {
        state.shiftHeld = false
        p.dashEnergy--
        state.dashing = true
        state.dashDir.x = Math.cos(p.bodyAngle)
        state.dashDir.y = Math.sin(p.bodyAngle)
        state.dashType = 'short'
        state.dashTime = DASH_SHORT_DUR
        state.dashTotalDur = DASH_SHORT_DUR
        state.dodgedBullets.clear()
        state.perfectDodge = false
        addDashGhost(p)
    }
}

// 添加冲刺残影
export function addDashGhost(p) {
    state.dashGhosts.push({
        x: p.x,
        y: p.y,
        bodyAngle: p.bodyAngle,
        angle: p.angle,
        color: p.color,
        life: 0.4,
        maxLife: 0.4
    })
}

// 更新冲刺残影
export function updateDashGhosts(dt) {
    for (let i = state.dashGhosts.length - 1; i >= 0; i--) {
        state.dashGhosts[i].life -= dt
        if (state.dashGhosts[i].life <= 0) {
            state.dashGhosts.splice(i, 1)
        }
    }
}

// 更新冲刺
export function updateDash(dt, p) {
    state.dashTime -= dt
    const dashDist = state.dashType === 'long' ? DASH_LONG_DIST : DASH_SHORT_DIST
    const spd = dashDist / state.dashTotalDur
    const nx = p.x + state.dashDir.x * spd * dt
    const ny = p.y + state.dashDir.y * spd * dt
    
    if (blocked(nx, ny, TANK_R)) {
        state.dashing = false
        return
    }
    
    p.x = nx
    p.y = ny
    
    if (Math.random() < dt * 30) addDashGhost(p)
    
    // 短冲刺：完美闪避检测
    if (state.dashType === 'short') {
        const dodgeRadSq = (TANK_R + BULLET_R + 15) * (TANK_R + BULLET_R + 15)
        for (let i = 0; i < state.bullets.length; i++) {
            const b = state.bullets[i]
            if (b.owner === state.peerId || state.dodgedBullets.has(b.id)) continue
            if (distSq(p.x, p.y, b.x, b.y) < dodgeRadSq) {
                state.dodgedBullets.add(b.id)
                state.perfectDodge = true
            }
        }
    }
    
    if (state.dashTime <= 0) {
        state.dashing = false
        if (state.dashType === 'short' && state.perfectDodge) {
            state.perfectGlow = true
            state.perfectGlowTime = 0
            state.dashRegenTimer = Math.max(0, state.dashRegenTimer - 1)
        }
    }
}

// 更新滑行
export function updateSlide(dt, p) {
    state.slideTime -= dt
    const spd = SPEED * SLIDE_MULT
    const nx = p.x + state.slideDir.vx * spd * dt
    const ny = p.y + state.slideDir.vy * spd * dt
    
    // 检测是否踩到更多香蕉
    for (let i = state.bananas.length - 1; i >= 0; i--) {
        if (distSq(nx, ny, state.bananas[i].x, state.bananas[i].y) < (TANK_R * 2) * (TANK_R * 2)) {
            state.bananas.splice(i, 1)
            state.slideTime += SLIDE_DUR
            break
        }
    }
    
    if (slideBlocked(nx, ny, TANK_R)) {
        state.slideTime = 0
    } else {
        p.x = nx
        p.y = ny
    }
    
    p.angle = Math.atan2(state.mouse.y + state.camera.y - p.y, state.mouse.x + state.camera.x - p.x)
    p.bodyAngle = Math.atan2(state.slideDir.vy, state.slideDir.vx)
    pushOut(p, TANK_R)
    send('move', { x: p.x, y: p.y, angle: p.angle, bodyAngle: p.bodyAngle, hp: p.hp })
}

// 检测香蕉
export function checkBanana(p) {
    const radSq = (TANK_R * 2) * (TANK_R * 2)
    for (let i = state.bananas.length - 1; i >= 0; i--) {
        if (distSq(p.x, p.y, state.bananas[i].x, state.bananas[i].y) < radSq) {
            state.bananas.splice(i, 1)
            state.slideTime = SLIDE_DUR
            
            let dx = 0, dy = 0
            if (state.keys['KeyW'] || state.keys['ArrowUp']) dy -= 1
            if (state.keys['KeyS'] || state.keys['ArrowDown']) dy += 1
            if (state.keys['KeyA'] || state.keys['ArrowLeft']) dx -= 1
            if (state.keys['KeyD'] || state.keys['ArrowRight']) dx += 1
            
            if (dx === 0 && dy === 0) {
                dx = Math.cos(p.bodyAngle)
                dy = Math.sin(p.bodyAngle)
            } else {
                const len = Math.hypot(dx, dy)
                dx /= len
                dy /= len
            }
            
            state.slideDir.vx = dx
            state.slideDir.vy = dy
            break
        }
    }
}

// 更新移动
export function updateMovement(dt, p) {
    if (state.dashing) return false
    
    let moved = false
    const mult = speedMult(p)
    
    p.angle = Math.atan2(state.mouse.y + state.camera.y - p.y, state.mouse.x + state.camera.x - p.x)
    
    // 磁铁效果
    if (state.magnetTime > 0) {
        for (let i = 0; i < framePlayerEntries.length; i++) {
            const [id, pl] = framePlayerEntries[i]
            if (id === state.peerId || pl.hp <= 0) continue
            const d = dist(p.x, p.y, pl.x, pl.y)
            if (d > 10 && d < 500) {
                const f = 30 * dt / d
                p.x += (pl.x - p.x) * f
                p.y += (pl.y - p.y) * f
                moved = true
            }
        }
        for (let i = 0; i < state.monsters.length; i++) {
            const m = state.monsters[i]
            if (m.hp <= 0) continue
            const d = dist(p.x, p.y, m.x, m.y)
            if (d > 10 && d < 500) {
                const f = 30 * dt / d
                p.x += (m.x - p.x) * f
                p.y += (m.y - p.y) * f
                moved = true
            }
        }
    }
    
    let dx = 0, dy = 0
    if (state.keys['KeyW'] || state.keys['ArrowUp']) dy -= 1
    if (state.keys['KeyS'] || state.keys['ArrowDown']) dy += 1
    if (state.keys['KeyA'] || state.keys['ArrowLeft']) dx -= 1
    if (state.keys['KeyD'] || state.keys['ArrowRight']) dx += 1
    
    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy)
        const invLen = 1 / len
        dx *= invLen
        dy *= invLen
        const spd = SPEED * mult * dt
        p.x += dx * spd
        p.y += dy * spd
        const diff = angleDiff(p.bodyAngle, Math.atan2(dy, dx))
        p.bodyAngle += clamp(diff, -BODY_ROT_SPEED * dt, BODY_ROT_SPEED * dt)
        state.tankMoveTime += dt
        moved = true
    } else {
        state.tankMoveTime = 0
    }
    
    // 后坐力
    if (state.recoil.vx || state.recoil.vy) {
        p.x += state.recoil.vx * dt
        p.y += state.recoil.vy * dt
        state.recoil.vx *= RECOIL_DECAY
        state.recoil.vy *= RECOIL_DECAY
        if (Math.abs(state.recoil.vx) < RECOIL_MIN) state.recoil.vx = 0
        if (Math.abs(state.recoil.vy) < RECOIL_MIN) state.recoil.vy = 0
    }
    
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt)
    
    return moved
}

// 处理碰撞
export function handleCollisions(e, r) {
    // 墙壁碰撞
    const walls = getNearbyWalls(e.x, e.y, r + 10)
    for (let i = 0; i < walls.length; i++) {
        const w = walls[i]
        if (!rectCircle(w, e.x, e.y, r)) continue
        const cx = clamp(e.x, w.x, w.x + w.w)
        const cy = clamp(e.y, w.y, w.y + w.h)
        const d = dist(e.x, e.y, cx, cy)
        if (d > 0) {
            const f = (r - d) * 1.1 / d
            e.x += (e.x - cx) * f
            e.y += (e.y - cy) * f
        }
    }
    
    // 障碍物碰撞
    const obsts = getNearbyObstacles(e.x, e.y, r + 50)
    for (let i = 0; i < obsts.length; i++) {
        const o = obsts[i]
        const d = dist(e.x, e.y, o.x, o.y)
        const mn = r + o.r
        if (d < mn && d > 0) {
            const f = (mn - d) * 1.1 / d
            e.x += (e.x - o.x) * f
            e.y += (e.y - o.y) * f
        }
    }
    
    // 怪物碰撞
    const MONSTER_R = 44
    for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i]
        if (m.hp <= 0) continue
        const d = dist(e.x, e.y, m.x, m.y)
        const mn = r + MONSTER_R
        if (d < mn && d > 0) {
            const f = (mn - d) * 1.1 / d
            e.x += (e.x - m.x) * f
            e.y += (e.y - m.y) * f
        }
    }
    
    // 玩家碰撞
    for (let i = 0; i < framePlayerEntries.length; i++) {
        const [id, p] = framePlayerEntries[i]
        if (id === state.peerId || p.hp <= 0) continue
        const d = dist(e.x, e.y, p.x, p.y)
        const mn = r + TANK_R
        if (d < mn && d > 0.01) {
            const f = (mn - d) * 0.6 / d
            e.x += (e.x - p.x) * f
            e.y += (e.y - p.y) * f
        }
    }
}