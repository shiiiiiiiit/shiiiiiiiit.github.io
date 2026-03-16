import { AMMO_MAX, FIRE_INTERVAL, CHARGE_TIME, CHARGE_AMMO_COST, CHARGE_SPREAD, BASE_CD, BUFF_RED, BULLET_SPD, BULLET_R, RECOIL, SHAKE_DUR } from '../constants.js'
import { state } from '../state.js'
import { uid, me, send } from '../utils.js'
import { blocked } from '../systems/collision.js'
import { addFlash, addExplosion } from './entities.js'
import { playSound } from '../assets/sounds.js'

function getAmmoRegenRate(p) {
    return Math.max(0.3, BASE_CD - p.firerateBuff * BUFF_RED)
}

export function updateShooting(dt, p) {
    if (state.invincibleTime > 0 || state.dashing || state.shieldTime > 0 || state.laserPhase !== 'none') {
        state.holding = false
        state.chargeTime = 0
        return
    }
    
    if (state.fireIntervalTimer > 0) state.fireIntervalTimer -= dt
    
    const fireHeld = state.keys['Space'] || state.keys['Mouse0']
    const firePressed = state.keysJustPressed['Space'] || state.keysJustPressed['Mouse0']
    const fireReleased = state.keysJustReleased['Space'] || state.keysJustReleased['Mouse0']
    
    const chargeComplete = state.holding && state.chargeTime >= CHARGE_TIME && state.ammo >= CHARGE_AMMO_COST
    if (!chargeComplete && state.ammo < AMMO_MAX) {
        state.ammoRegenTimer += dt
        const rate = getAmmoRegenRate(p)
        if (state.ammoRegenTimer >= rate) {
            state.ammoRegenTimer -= rate
            state.ammo = Math.min(AMMO_MAX, state.ammo + 1)
        }
    }
    
    if (firePressed && state.ammo > 0) {
        if (state.perfectGlow) {
            if (state.fireIntervalTimer <= 0) firePerfectCounterShot(p)
        } else if (state.ammo >= CHARGE_AMMO_COST) {
            state.holding = true
            state.chargeTime = 0
        } else {
            if (state.fireIntervalTimer <= 0) fireNormalShot(p)
        }
    }
    
    if (state.holding && fireHeld) state.chargeTime += dt
    
    if (fireReleased && state.holding) {
        if (state.chargeTime >= CHARGE_TIME && state.ammo >= CHARGE_AMMO_COST) {
            fireChargedShot(p)
        } else if (state.ammo > 0 && state.fireIntervalTimer <= 0) {
            fireNormalShot(p)
        }
        state.holding = false
        state.chargeTime = 0
    }
}

function cancelInvisible(p) {
    if (state.invisibleTime > 0) {
        state.invisibleTime = 0
        p.invisibleTime = 0
    }
}

export function fireNormalShot(p) {
    if (state.ammo <= 0 || state.fireIntervalTimer > 0) return
    
    cancelInvisible(p)
    state.ammo--
    state.fireIntervalTimer = FIRE_INTERVAL
    
    const n = 1 + p.bulletBuff
    const spread = n > 1 ? 0.15 : 0
    const bullets = []
    const cosA = Math.cos(p.angle)
    const sinA = Math.sin(p.angle)
    
    for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i - (n - 1) * 0.5) * spread : 0
        const a = p.angle + off
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const bx = p.x + ca * 30
        const by = p.y + sa * 30
        
        if (!blocked(bx, by, BULLET_R)) {
            const b = {
                id: uid('b'),
                x: bx, y: by,
                vx: ca * BULLET_SPD,
                vy: sa * BULLET_SPD,
                owner: state.peerId,
                life: 500,
                dmg: 1
            }
            state.bullets.push(b)
            bullets.push(b)
        }
    }
    
    if (bullets.length) {
        send('shoot', { bullets })
        addFlash(p.x + cosA * 30, p.y + sinA * 30, p.angle)
		playSound('shoot', 0.6)  // 添加普通射击音效
    }
    
    state.recoil.vx -= cosA * RECOIL
    state.recoil.vy -= sinA * RECOIL
    state.shake = SHAKE_DUR
}

export function fireChargedShot(p) {
    if (state.ammo < CHARGE_AMMO_COST) return
    cancelInvisible(p)
    state.ammo -= CHARGE_AMMO_COST
    state.fireIntervalTimer = FIRE_INTERVAL
    _fireChargedBullets(p)
}

export function firePerfectCounterShot(p) {
    if (state.ammo <= 0 || state.fireIntervalTimer > 0) return
    cancelInvisible(p)
    state.ammo--
    state.fireIntervalTimer = FIRE_INTERVAL
    state.perfectGlow = false
    state.perfectGlowTime = 0
    _fireChargedBullets(p)
}

function _fireChargedBullets(p) {
    const spd = BULLET_SPD * 2
    const bullets = []
    const a = p.angle
    const cosA = Math.cos(a)
    const sinA = Math.sin(a)
    const perpX = -sinA
    const perpY = cosA
    const S = CHARGE_SPREAD
    
    const offsets = [
        [0, 0, 3, true],
        [0, -S, 1, false],
        [0, S, 1, false],
        [-S, 0, 1, false],
        [S, 0, 1, false]
    ]
    
    for (const [ox, oy, dmg, isPerfect] of offsets) {
        const sx = p.x + cosA * (30 + oy) + perpX * ox
        const sy = p.y + sinA * (30 + oy) + perpY * ox
        
        if (!blocked(sx, sy, BULLET_R)) {
            const b = {
                id: uid('cb'),
                x: sx, y: sy,
                vx: cosA * spd,
                vy: sinA * spd,
                owner: state.peerId,
                life: 500,
                dmg,
                isPerfect,
                isCharged: true
            }
            state.bullets.push(b)
            bullets.push(b)
        }
    }
    
    if (bullets.length) {
        send('shoot', { bullets })
        addFlash(p.x + cosA * 30, p.y + sinA * 30, a)
    }
    
    state.recoil.vx -= cosA * RECOIL * 2
    state.recoil.vy -= sinA * RECOIL * 2
    state.shake = SHAKE_DUR * 2
    addExplosion(p.x, p.y, 0.3)
	// 根据是否完美反击播放不同音效
    if (state.perfectGlowTime > 0) {
        playSound('shoot_perfect', 0.8)  // 完美反击音效
    } else {
        playSound('shoot_charged', 0.7)  // 蓄力射击音效
    }
}