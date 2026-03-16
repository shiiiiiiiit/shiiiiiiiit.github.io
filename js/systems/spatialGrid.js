import { GRID_CELL } from '../constants.js'
import { state } from '../state.js'

export const spatialGrid = {
    walls: new Map(),
    obstacles: new Map()
}

export function buildSpatialGrid() {
    spatialGrid.walls.clear()
    spatialGrid.obstacles.clear()
    
    for (const w of state.walls) {
        const x0 = (w.x / GRID_CELL) | 0
        const x1 = ((w.x + w.w) / GRID_CELL) | 0
        const y0 = (w.y / GRID_CELL) | 0
        const y1 = ((w.y + w.h) / GRID_CELL) | 0
        
        for (let cx = x0; cx <= x1; cx++) {
            for (let cy = y0; cy <= y1; cy++) {
                const k = cx * 100000 + cy
                let list = spatialGrid.walls.get(k)
                if (!list) { list = []; spatialGrid.walls.set(k, list) }
                list.push(w)
            }
        }
    }
    
    for (const o of state.obstacles) {
        const x0 = ((o.x - o.r) / GRID_CELL) | 0
        const x1 = ((o.x + o.r) / GRID_CELL) | 0
        const y0 = ((o.y - o.r) / GRID_CELL) | 0
        const y1 = ((o.y + o.r) / GRID_CELL) | 0
        
        for (let cx = x0; cx <= x1; cx++) {
            for (let cy = y0; cy <= y1; cy++) {
                const k = cx * 100000 + cy
                let list = spatialGrid.obstacles.get(k)
                if (!list) { list = []; spatialGrid.obstacles.set(k, list) }
                list.push(o)
            }
        }
    }
}

const _nearbySet = new Set()

function getNearby(grid, x, y, r) {
    const result = []
    _nearbySet.clear()
    const x0 = ((x - r) / GRID_CELL) | 0
    const x1 = ((x + r) / GRID_CELL) | 0
    const y0 = ((y - r) / GRID_CELL) | 0
    const y1 = ((y + r) / GRID_CELL) | 0
    
    for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
            const list = grid.get(cx * 100000 + cy)
            if (!list) continue
            for (let i = 0, len = list.length; i < len; i++) {
                const e = list[i]
                if (!_nearbySet.has(e)) {
                    _nearbySet.add(e)
                    result.push(e)
                }
            }
        }
    }
    return result
}

export function getNearbyWalls(x, y, r) {
    return getNearby(spatialGrid.walls, x, y, r)
}

export function getNearbyObstacles(x, y, r) {
    return getNearby(spatialGrid.obstacles, x, y, r)
}