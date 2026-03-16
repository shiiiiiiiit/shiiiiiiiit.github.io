import { CHUNK_W, CHUNK_H, MAX_GROUND_CHUNKS, SAMPLE_STEP, BLEND_HALF, GROUND_THRESHOLDS, VIEW_W, VIEW_H } from '../constants.js'
import { state } from '../state.js'
import { noiseFbm, noise2d } from './noise.js'
import { groundPatterns } from '../assets/images.js'

const groundChunks = new Map()
const groundChunkOrder = []

// 权重缓存
const _weightCache = new Float32Array(4)

function getGroundWeights(n) {
    _weightCache[0] = _weightCache[1] = _weightCache[2] = _weightCache[3] = 0
    
    if (n <= GROUND_THRESHOLDS[0] - BLEND_HALF) {
        _weightCache[0] = 1
        return _weightCache
    }
    if (n >= GROUND_THRESHOLDS[2] + BLEND_HALF) {
        _weightCache[3] = 1
        return _weightCache
    }
    
    const centers = [
        GROUND_THRESHOLDS[0] - 0.3,
        (GROUND_THRESHOLDS[0] + GROUND_THRESHOLDS[1]) * 0.5,
        (GROUND_THRESHOLDS[1] + GROUND_THRESHOLDS[2]) * 0.5,
        GROUND_THRESHOLDS[2] + 0.3
    ]
    
    let total = 0
    for (let i = 0; i < 4; i++) {
        const d = Math.abs(n - centers[i])
        const v = Math.max(0, 1 - d / (BLEND_HALF * 3))
        _weightCache[i] = v * v
        total += _weightCache[i]
    }
    
    if (total > 0) {
        const inv = 1 / total
        _weightCache[0] *= inv
        _weightCache[1] *= inv
        _weightCache[2] *= inv
        _weightCache[3] *= inv
    } else {
        _weightCache[n < -0.2 ? 0 : n < 0.05 ? 1 : n < 0.25 ? 2 : 3] = 1
    }
    return _weightCache
}

function generateGroundChunk(cx, cy) {
    const canvas = document.createElement('canvas')
    canvas.width = CHUNK_W
    canvas.height = CHUNK_H
    const gctx = canvas.getContext('2d')
    const wx0 = cx * CHUNK_W
    const wy0 = cy * CHUNK_H
    
    gctx.fillStyle = '#1a1a2e'
    gctx.fillRect(0, 0, CHUNK_W, CHUNK_H)
    
    const halfStep = SAMPLE_STEP * 0.5
    
    for (let gi = 0; gi < 4; gi++) {
        const pat = groundPatterns[gi]
        if (!pat) continue
        gctx.fillStyle = pat
        
        for (let tx = 0; tx < CHUNK_W; tx += SAMPLE_STEP) {
            for (let ty = 0; ty < CHUNK_H; ty += SAMPLE_STEP) {
                const wx = wx0 + tx + halfStep
                const wy = wy0 + ty + halfStep
                const n = noiseFbm(wx / 800, wy / 800)
                const w = getGroundWeights(n)[gi]
                if (w < 0.01) continue
                gctx.globalAlpha = w * (0.25 + Math.abs(noise2d(wx / 150, wy / 150)) * 0.15)
                gctx.fillRect(tx, ty, SAMPLE_STEP, SAMPLE_STEP)
            }
        }
    }
    gctx.globalAlpha = 1
    return canvas
}

function getGroundChunk(cx, cy) {
    const key = `${cx},${cy}`
    const cached = groundChunks.get(key)
    if (cached) return cached
    
    // LRU逐出
    if (groundChunks.size >= MAX_GROUND_CHUNKS) {
        const oldest = groundChunkOrder.shift()
        groundChunks.delete(oldest)
    }
    
    const chunk = generateGroundChunk(cx, cy)
    groundChunks.set(key, chunk)
    groundChunkOrder.push(key)
    return chunk
}

export function renderGround(ctx) {
    const camX = state.camera.x
    const camY = state.camera.y
    const sx = Math.floor(camX / CHUNK_W)
    const sy = Math.floor(camY / CHUNK_H)
    const ex = Math.floor((camX + VIEW_W) / CHUNK_W)
    const ey = Math.floor((camY + VIEW_H) / CHUNK_H)
    
    for (let cx = sx; cx <= ex; cx++) {
        for (let cy = sy; cy <= ey; cy++) {
            ctx.drawImage(getGroundChunk(cx, cy), cx * CHUNK_W - camX, cy * CHUNK_H - camY)
        }
    }
}

export function clearGroundCache() {
    groundChunks.clear()
    groundChunkOrder.length = 0
}