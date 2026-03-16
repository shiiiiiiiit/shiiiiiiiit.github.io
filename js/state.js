import { DASH_MAX, VIEW_W, VIEW_H, MAP_W, MAP_H, SHRINK_INTERVAL, AMMO_MAX } from './constants.js'

// 默认游戏状态
export function createDefaultState() {
    return {
        gameStarted: false,
        gameOver: false,
        roomLocked: false,
        soloMode: false,
        // 实体
        bullets: [],
        deadPlayers: [],
        winner: null,
        explosions: [],
        muzzleFlashes: [],
        dashTrails: [],
        hitTargets: new Map(),
        
        // 玩家状态
        invincibleTime: 0,
        buffs: [],
        recoil: { vx: 0, vy: 0 },
        shake: 0,
        
        // 相机
        camera: { x: 0, y: 0 },
        
        // 地图
        walls: [],
        obstacles: [],
        monsters: [],
        items: [],
        zone: { x: 0, y: 0, w: MAP_W, h: MAP_H },
        
        // 缩圈
        shrinkTimer: SHRINK_INTERVAL,
        shrinking: false,
        shrinkFrom: null,
        shrinkTo: null,
        shrinkAnimTime: 0,
        
        // 冲刺
        dashing: false,
        dashTime: 0,
        dashRegenTimer: 0,
        dashDir: { x: 0, y: 0 },
        dashType: 'short',
        dashTotalDur: 0,
        dashGhosts: [],
        shiftHoldTime: 0,
        shiftHeld: false,
        
        // 完美闪避
        perfectDodge: false,
        perfectGlow: false,
        perfectGlowTime: 0,
        dodgedBullets: new Set(),
        
        // 受击效果
        hitShake: 0,
        hitExplosions: [],
        
        // 道具
        inventory: [],
        mudPools: [],
        bananas: [],
        smokes: [],
        lasers: [],
        projectiles: [],
        magnetTime: 0,
        shieldTime: 0,
        invisibleTime: 0,
        
        // 激光
        laserCharging: 0,
        laserAngle: 0,
        laserPhase: 'none',
        laserPhaseTime: 0,
        laserOrigin: { x: 0, y: 0 },
        laserImpacts: [],
        
        // 滑行
        slideTime: 0,
        slideDir: { vx: 0, vy: 0 },
        tankMoveTime: 0,
        
        // 输入
        keys: {},
        keysJustPressed: {},
        keysJustReleased: {},
        mouse: { x: VIEW_W / 2, y: VIEW_H / 2 },
        
        // 弹药
        ammo: AMMO_MAX,
        ammoRegenTimer: 0,
        fireIntervalTimer: 0,
        holding: false,
        chargeTime: 0,
        firedOnPress: false,
        
        // 动画
        pickupAnims: []
    }
}

// 全局状态对象
export const state = {
    room: null,
    peerId: null,
    playerName: '',
    roomId: '',
    players: {},
    lastTime: 0,
    animFrameId: null,
    soloStartTime: null,
    ...createDefaultState()
}

// 通信发送函数映射
export const sends = {}

// 帧缓存
export let framePlayerEntries = []
export let frameAlivePlayers = []
export let frameSmokeCache = null
export let frameAliveCount = 0

export function updateFrameCache() {
    framePlayerEntries = Object.entries(state.players)
    frameAlivePlayers = []
    for (let i = 0; i < framePlayerEntries.length; i++) {
        if (framePlayerEntries[i][1].hp > 0) {
            frameAlivePlayers.push(framePlayerEntries[i])
        }
    }
    frameAliveCount = frameAlivePlayers.length
    frameSmokeCache = null
}

export function getActiveSmokes() {
    if (frameSmokeCache === null) {
        frameSmokeCache = []
        for (let i = 0; i < state.smokes.length; i++) {
            if (state.smokes[i].life > 0) {
                frameSmokeCache.push(state.smokes[i])
            }
        }
    }
    return frameSmokeCache
}

// 重置状态
export function resetState(full = false) {
    Object.assign(state, createDefaultState())
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId)
    if (full) {
        state.room = null
        state.players = {}
        state.soloMode = false
    }
}