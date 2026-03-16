import { VIEW_W, VIEW_H } from '../constants.js'
import { state } from '../state.js'
import { $ } from '../utils.js'
import { renderGround } from '../systems/ground.js'
import {
    renderWalls, renderObstacles, renderMudPools, renderBananas,
    renderProjectiles, renderItems, renderBuffs, renderMonsters,
    renderDashGhosts, renderTanks, renderBullets
} from './renderEntities.js'
import {
    renderMagnetLines, renderHitExplosions, renderLaserSystem,
    renderFlashes, renderSmokes, renderExplosions, renderLaserImpacts,
    renderPickupAnims
} from './renderEffects.js'
import {
    renderOverlay, renderCrosshair, renderHUD, renderMinimap
} from './renderUI.js'

export function render() {
    const ctx = $('game-canvas').getContext('2d')
    const p = state.players[state.peerId]
    const z = state.zone
    const camX = state.camera.x
    const camY = state.camera.y
    
    // 背景
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
    
    // 地面
    renderGround(ctx)
    
    // 缩圈预览
    if (state.shrinking && state.shrinkTo) {
        ctx.strokeStyle = 'rgba(231,76,60,0.4)'
        ctx.lineWidth = 4
        ctx.setLineDash([10, 10])
        ctx.strokeRect(
            state.shrinkTo.x - camX,
            state.shrinkTo.y - camY,
            state.shrinkTo.w,
            state.shrinkTo.h
        )
        ctx.setLineDash([])
    }
    
    // 区域边界
    ctx.strokeStyle = state.invincibleTime > 0 ? '#f39c12' : (state.shrinking ? '#ff6b6b' : '#e74c3c')
    ctx.lineWidth = 8
    ctx.strokeRect(z.x - camX, z.y - camY, z.w, z.h)
    
    // 实体渲染
    renderWalls(ctx, camX, camY)
    renderObstacles(ctx, camX, camY)
    renderMudPools(ctx, camX, camY)
    renderBananas(ctx, camX, camY)
    renderProjectiles(ctx, camX, camY)
    renderItems(ctx, camX, camY)
    renderBuffs(ctx, camX, camY)
    renderMonsters(ctx, camX, camY)
    renderDashGhosts(ctx, camX, camY)
    renderMagnetLines(ctx, camX, camY, p)
    renderTanks(ctx, camX, camY, p)
    renderHitExplosions(ctx, camX, camY)
    renderLaserSystem(ctx, camX, camY)
    renderFlashes(ctx, camX, camY)
    renderBullets(ctx, camX, camY)
    renderSmokes(ctx, camX, camY)
    renderExplosions(ctx, camX, camY)
    renderLaserImpacts(ctx, camX, camY)
    
    // UI渲染
    renderOverlay(ctx, p)
    renderHUD(ctx, p)
    renderMinimap(ctx)
    renderCrosshair(ctx)
    renderPickupAnims(ctx)
}