import { TWO_PI, LASER_MAX_LENGTH, LASER_BEAM_WIDTH, LASER_BEAM_DUR, SMOKE_FADEIN_DUR } from '../constants.js'
import { state, framePlayerEntries } from '../state.js'
import { inView, dist, easeOut, lerp } from '../utils.js'
import { fillCircle, strokeCircle, drawImg } from './renderUtils.js'

export function renderMagnetLines(ctx, camX, camY, p) {
    if (state.magnetTime <= 0 || !p || p.hp <= 0) return
    
    const px = p.x - camX
    const py = p.y - camY
    
    ctx.strokeStyle = 'rgba(255,100,100,0.4)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.lineDashOffset = -(Date.now() / 50) % 16
    ctx.beginPath()
    
    for (let i = 0; i < framePlayerEntries.length; i++) {
        const [id, pl] = framePlayerEntries[i]
        if (id === state.peerId || pl.hp <= 0 || !inView(pl.x, pl.y, 0)) continue
        if (dist(p.x, p.y, pl.x, pl.y) < 500) {
            ctx.moveTo(px, py)
            ctx.lineTo(pl.x - camX, pl.y - camY)
        }
    }
    
    for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i]
        if (m.hp <= 0 || !inView(m.x, m.y, 0)) continue
        if (dist(p.x, p.y, m.x, m.y) < 500) {
            ctx.moveTo(px, py)
            ctx.lineTo(m.x - camX, m.y - camY)
        }
    }
    
    ctx.stroke()
    ctx.setLineDash([])
}

export function renderHitExplosions(ctx, camX, camY) {
    for (let i = 0; i < state.hitExplosions.length; i++) {
        const he = state.hitExplosions[i]
        if (!inView(he.x, he.y, 60)) continue
        
        const p = 1 - he.life / he.maxLife
        const r = 15 + p * 35
        ctx.globalAlpha = (1 - p) * 0.8
        drawImg(ctx, 'explosion', he.x - camX, he.y - camY, r * 2.5, r * 2.5)
        ctx.globalAlpha = 1
    }
}

export function renderLaserSystem(ctx, camX, camY) {
    const now = performance.now() * 0.001
    
    // 自己的激光
    if (state.laserPhase === 'warn' || state.laserPhase === 'beam' || state.laserPhase === 'fade') {
        const ox = state.laserOrigin.x - camX
        const oy = state.laserOrigin.y - camY
        
        ctx.save()
        ctx.translate(ox, oy)
        ctx.rotate(state.laserAngle)
        
        if (state.laserPhase === 'warn') {
            const t = state.laserPhaseTime
            const flashAlpha = 0.4 + Math.sin(t * (8 + t * 12) * TWO_PI) * 0.4
            
            ctx.globalAlpha = flashAlpha
            ctx.strokeStyle = '#ff3333'
            ctx.lineWidth = 6
            ctx.setLineDash([20, 15])
            ctx.lineDashOffset = -(now * 200) % 35
            ctx.beginPath()
            ctx.moveTo(30, 0)
            ctx.lineTo(LASER_MAX_LENGTH, 0)
            ctx.stroke()
            ctx.setLineDash([])
            
            ctx.globalAlpha = flashAlpha * 0.3
            ctx.strokeStyle = '#ff0000'
            ctx.lineWidth = 16
            ctx.beginPath()
            ctx.moveTo(30, 0)
            ctx.lineTo(LASER_MAX_LENGTH, 0)
            ctx.stroke()
            ctx.globalAlpha = 1
        } else if (state.laserPhase === 'beam') {
            const widthMult = Math.min(1, state.laserPhaseTime / 0.05)
            renderBeamLayers(ctx, LASER_BEAM_WIDTH * widthMult, now, 1.0)
        } else {
            const fadeT = 1 - easeOut(Math.min(1, state.laserPhaseTime / 0.3))
            const beamW = LASER_BEAM_WIDTH * fadeT
            if (beamW > 1) renderBeamLayers(ctx, beamW, now, fadeT)
        }
        
        ctx.restore()
    }
    
    // 其他玩家的激光
    for (let i = 0; i < state.lasers.length; i++) {
        const l = state.lasers[i]
        if (!l.isNewLaser) {
            renderOldLaser(ctx, l, camX, camY)
            continue
        }
        if (l.owner === state.peerId) continue
        
        ctx.save()
        ctx.translate(l.x - camX, l.y - camY)
        ctx.rotate(l.angle)
        
        const elapsed = l.maxLife - l.life
        if (elapsed < LASER_BEAM_DUR) {
            renderBeamLayers(ctx, LASER_BEAM_WIDTH * Math.min(1, elapsed / 0.05), now, 1.0)
        } else {
            const fadeT = 1 - easeOut(Math.min(1, (elapsed - LASER_BEAM_DUR) / 0.3))
            if (LASER_BEAM_WIDTH * fadeT > 1) {
                renderBeamLayers(ctx, LASER_BEAM_WIDTH * fadeT, now, fadeT)
            }
        }
        
        ctx.restore()
    }
}

function renderBeamLayers(ctx, beamW, now, alphaBase) {
    const halfW = beamW * 0.5
    const len = LASER_MAX_LENGTH
    
    const layers = [
        [0.15, '#1a3a8a', 1.8, 0.3],
        [0.25, '#2244cc', 1.4, 0.5],
        [0.5,  '#44aaff', 1.0, 0.8],
        [0.7,  '#88ddff', 0.6, 1.2],
        [0.9,  '#ffffff', 0.25, 2.0]
    ]
    
    for (const [a, col, wMult, waveFreq] of layers) {
        ctx.globalAlpha = alphaBase * a
        ctx.fillStyle = col
        ctx.beginPath()
        drawWavyBeam(ctx, len, halfW * wMult, now, waveFreq)
        ctx.fill()
    }
    
    // 发光
    ctx.shadowColor = '#44aaff'
    ctx.shadowBlur = beamW * 0.8
    ctx.globalAlpha = alphaBase * 0.3
    ctx.fillStyle = '#66ccff'
    ctx.fillRect(30, -halfW * 0.15, len, halfW * 0.3)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
}

function drawWavyBeam(ctx, length, halfWidth, now, waveFreq) {
    const segments = 60
    const segLen = length / segments
    const speed = now * 800
    
    ctx.moveTo(30, -halfWidth)
    for (let i = 0; i <= segments; i++) {
        const x = 30 + i * segLen
        const wave = Math.sin((x - speed) * waveFreq * 0.01) * halfWidth * 0.12
            + Math.sin((x - speed * 1.3) * waveFreq * 0.023) * halfWidth * 0.06
        ctx.lineTo(x, -halfWidth + wave)
    }
    for (let i = segments; i >= 0; i--) {
        const x = 30 + i * segLen
        const wave = Math.sin((x - speed + 100) * waveFreq * 0.01) * halfWidth * 0.12
            + Math.sin((x - speed * 1.3 + 50) * waveFreq * 0.023) * halfWidth * 0.06
        ctx.lineTo(x, halfWidth + wave)
    }
    ctx.closePath()
}

function renderOldLaser(ctx, l, camX, camY) {
    const sx = l.x - camX
    const sy = l.y - camY
    const a = l.life / l.maxLife
    const ex = sx + Math.cos(l.angle) * l.length
    const ey = sy + Math.sin(l.angle) * l.length
    
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = `rgba(0,200,255,${a * 0.3})`
    ctx.lineWidth = 32
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.strokeStyle = `rgba(255,255,255,${a})`
    ctx.lineWidth = 16
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.restore()
}

export function renderLaserImpacts(ctx, camX, camY) {
    for (let i = 0; i < state.laserImpacts.length; i++) {
        const imp = state.laserImpacts[i]
        if (!inView(imp.x, imp.y, 200)) continue
        
        const sx = imp.x - camX
        const sy = imp.y - camY
        const t = 1 - imp.life / imp.maxLife
        const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7
        const size = 64 + t * 128
        
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = '#44aaff'
        ctx.shadowBlur = 30 + (1 - t) * 20
        drawImg(ctx, 'laser_impact', sx, sy, size, size, t * 0.5)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.globalAlpha = alpha * 0.4
        strokeCircle(ctx, sx, sy, size * 0.4, `rgba(100,200,255,${alpha})`, 3)
        ctx.restore()
    }
}

export function renderFlashes(ctx, camX, camY) {
    for (let i = 0; i < state.muzzleFlashes.length; i++) {
        const f = state.muzzleFlashes[i]
        if (!inView(f.x, f.y, 30)) continue
        
        const p = f.life / f.maxLife
        const r = 12 + (1 - p) * 15
        ctx.globalAlpha = p
        drawImg(ctx, 'muzzle_flash', f.x - camX, f.y - camY, r * 3, r * 3, f.angle)
        ctx.globalAlpha = 1
    }
}

export function renderSmokes(ctx, camX, camY) {
    for (let i = 0; i < state.smokes.length; i++) {
        const sm = state.smokes[i]
        if (!inView(sm.x, sm.y, sm.r)) continue
        
        let fadeAlpha = 1
        if (sm.spawnTime !== undefined && sm.spawnTime < SMOKE_FADEIN_DUR) {
            fadeAlpha = easeOut(sm.spawnTime / SMOKE_FADEIN_DUR)
        }
        
        const lifeAlpha = Math.min(1, sm.life / 3)
        ctx.globalAlpha = lifeAlpha * fadeAlpha
        
        const scale = sm.spawnTime !== undefined && sm.spawnTime < SMOKE_FADEIN_DUR
            ? 0.3 + 0.7 * easeOut(sm.spawnTime / SMOKE_FADEIN_DUR)
            : 1
        const s = sm.r * 2 * scale
        drawImg(ctx, 'smoke_cloud', sm.x - camX, sm.y - camY, s, s)
        ctx.globalAlpha = 1
    }
}

export function renderExplosions(ctx, camX, camY) {
    for (let i = 0; i < state.explosions.length; i++) {
        const e = state.explosions[i]
        if (!inView(e.x, e.y, 100)) continue
        
        const p = 1 - e.life / e.maxLife
        const r = 25 + p * 60 * e.maxLife
        ctx.globalAlpha = 1 - p
        drawImg(ctx, 'explosion', e.x - camX, e.y - camY, r * 2.5, r * 2.5)
        ctx.globalAlpha = 1
    }
}

export function renderPickupAnims(ctx) {
    for (const a of state.pickupAnims) {
        const t = a.time / a.duration
        const midY = a.sy - 60
        let x, y, alpha
        
        if (t < 0.3) {
            const st = t / 0.3
            x = a.sx
            y = lerp(a.sy, midY, easeOut(st))
            alpha = 1
        } else {
            const st = (t - 0.3) / 0.7
            const et = easeOut(st)
            x = lerp(a.sx, a.ex, et)
            y = lerp(midY, a.ey, et)
            alpha = 1 - st * 0.5
        }
        
        ctx.globalAlpha = alpha
        const s = 32 * (1 - t * 0.4)
        drawImg(ctx, a.icon, x, y, s, s)
        ctx.globalAlpha = 1
    }
}