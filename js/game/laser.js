import { LASER_WARN_DUR, LASER_CHARGE_DUR, LASER_BEAM_DUR, LASER_MAX_LENGTH, LASER_BEAM_WIDTH, TANK_R, MONSTER_R } from '../constants.js'
import { state, framePlayerEntries } from '../state.js'
import { uid, me, send, isHost } from '../utils.js'
import { addExplosion } from './entities.js'
import { spawnBuffAt } from './buffs.js'
import { checkEnd, triggerHitEffect } from './gameLoop.js'

export function updateLaserPhase(dt) {
    if (state.laserPhase === 'none') return
    
    state.laserPhaseTime += dt
    const p = me()
    if (!p || p.hp <= 0) {
        state.laserPhase = 'none'
        return
    }
    
    state.laserOrigin.x = p.x
    state.laserOrigin.y = p.y
    
    switch (state.laserPhase) {
        case 'charge':
            state.laserCharging -= dt
            state.laserAngle = p.angle
            if (state.laserCharging <= 0) {
                state.laserPhase = 'warn'
                state.laserPhaseTime = 0
                state.laserAngle = p.angle
            }
            break
        case 'warn':
            if (state.laserPhaseTime >= LASER_WARN_DUR) {
                state.laserPhase = 'beam'
                state.laserPhaseTime = 0
                fireLaserBeam()
            }
            break
        case 'beam':
            if (state.laserPhaseTime >= LASER_BEAM_DUR) {
                state.laserPhase = 'fade'
                state.laserPhaseTime = 0
            }
            break
        case 'fade':
            if (state.laserPhaseTime >= 0.3) {
                state.laserPhase = 'none'
                state.laserPhaseTime = 0
            }
            break
    }
}

function fireLaserBeam() {
    const p = me()
    if (!p) return
    
    const dmg = p.maxHp
    const cos = Math.cos(state.laserAngle)
    const sin = Math.sin(state.laserAngle)
    const ox = p.x, oy = p.y
    
    const laser = {
        id: uid('laser'),
        x: ox,
        y: oy,
        angle: state.laserAngle,
        length: LASER_MAX_LENGTH,
        life: LASER_BEAM_DUR + 0.3,
        maxLife: LASER_BEAM_DUR + 0.3,
        owner: state.peerId,
        beamTime: 0,
        isNewLaser: true
    }
    state.lasers.push(laser)
    
    const impacts = []
    
    const laserHitCheck = (tx, ty, r) => {
        const dx = tx - ox, dy = ty - oy
        const proj = dx * cos + dy * sin
        if (proj < 0) return false
        const perpDist = Math.abs(dx * sin - dy * cos)
        return perpDist < r + LASER_BEAM_WIDTH * 0.25
    }
    
    for (const [id, pl] of framePlayerEntries) {
        if (id === state.peerId || pl.hp <= 0 || pl.shieldTime > 0) continue
        if (!laserHitCheck(pl.x, pl.y, TANK_R)) continue
        
        pl.hp -= dmg
        if (pl.invisibleTime > 0) pl.invisibleTime = 0
        send('hit', { target: id, bulletId: laser.id, by: state.peerId, dmg })
        if (id === state.peerId) triggerHitEffect(pl.x, pl.y)
        impacts.push({ x: pl.x, y: pl.y, life: 0.8, maxLife: 0.8 })
        
        if (pl.hp <= 0) {
            state.deadPlayers.push([id, pl])
            addExplosion(pl.x, pl.y)
            checkEnd()
        }
    }
    
    for (const m of state.monsters) {
        if (m.hp <= 0 || !laserHitCheck(m.x, m.y, MONSTER_R)) continue
        m.hp -= dmg
        send('monsterhit', { id: m.id, dmg, by: state.peerId })
        impacts.push({ x: m.x, y: m.y, life: 0.8, maxLife: 0.8 })
        
        if (m.hp <= 0) {
            addExplosion(m.x, m.y, 1.5)
            me().dashEnergy = 5 // DASH_MAX
            if (isHost()) spawnBuffAt(m.x, m.y)
        }
    }
    
    impacts.push({
        x: ox + cos * LASER_MAX_LENGTH,
        y: oy + sin * LASER_MAX_LENGTH,
        life: 0.6,
        maxLife: 0.6
    })
    
    state.laserImpacts.push(...impacts)
    send('entity', { type: 'laserbeam', entity: laser, impacts })
}