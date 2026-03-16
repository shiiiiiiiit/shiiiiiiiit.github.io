import { VIEW_W, VIEW_H, MUD_RX, MAX_PLAYERS } from './constants.js'
import { state, sends, getActiveSmokes, framePlayerEntries } from './state.js'
import { clamp } from './helpers.js'

// 从 helpers 重新导出所有基础工具
export * from './helpers.js'

// 视野检测
export function inView(x, y, m = 100) {
    const cx = state.camera.x, cy = state.camera.y
    return x >= cx - m && x <= cx + VIEW_W + m && y >= cy - m && y <= cy + VIEW_H + m
}

// 区域检测
export function inZone(x, y, r = 0, z = state.zone) {
    return x - r >= z.x && x + r <= z.x + z.w && y - r >= z.y && y + r <= z.y + z.h
}

// 网络发送
export const send = (name, data) => {
    if (!state.soloMode && sends[name]) sends[name](data)
}

// 主机检测
export const isHost = () => state.soloMode || Object.keys(state.players).sort()[0] === state.peerId

// 获取自己
export const me = () => state.players[state.peerId]

// 玩家数量
export const playerCount = () => Object.keys(state.players).length

// 房间是否已满
export const isRoomFull = () => playerCount() >= MAX_PLAYERS

// 是否在烟雾中
export function inSmoke(x, y) {
    const s = getActiveSmokes()
    for (let i = 0; i < s.length; i++) {
        const sm = s[i]
        const dx = x - sm.x, dy = y - sm.y
        if (dx * dx + dy * dy < sm.r * sm.r) return true
    }
    return false
}

// 速度倍率（受泥浆影响）
export function speedMult(e) {
    let m = 1 + (e.speedBuff || 0) * 0.1
    const pools = state.mudPools
    for (let i = 0; i < pools.length; i++) {
        const p = pools[i]
        if (p.life > 0) {
            const dx = e.x - p.x, dy = e.y - p.y
            if (dx * dx + dy * dy < MUD_RX * MUD_RX) {
                m *= 0.5
                break
            }
        }
    }
    return m
}

// 推出边界
export function pushOut(e, r) {
    const z = state.zone
    e.x = clamp(e.x, z.x + r + 5, z.x + z.w - r - 5)
    e.y = clamp(e.y, z.y + r + 5, z.y + z.h - r - 5)
}