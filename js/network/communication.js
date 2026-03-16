import { joinRoom, selfId } from 'https://esm.sh/trystero/nostr'
import {
    APP_ID, COLORS, MAX_PLAYERS, DASH_MAX, INVINCIBLE_T,
    MONSTER_HP, MONSTER_CD, MONSTER_R, TWO_PI, ITEM_TYPES, BUFF_N,
    MAP_W, MAP_H, VIEW_W, VIEW_H
} from '../constants.js'
import { state, sends, createDefaultState, updateFrameCache, resetState } from '../state.js'
import { $, uid, rand, randItem } from '../helpers.js'
import { send, isHost, me, isRoomFull } from '../utils.js'
import { genMap, genSpawns, findPos } from '../game/map.js'
import { applyBuff, spawnBuffs, spawnBuffAt } from '../game/buffs.js'
import { execItem } from '../game/items.js'
import { addExplosion, addFlash } from '../game/entities.js'
import { triggerHitEffect, checkEnd, gameLoop, endGame } from '../game/gameLoop.js'
import { buildSpatialGrid } from '../systems/spatialGrid.js'
import { initWallPattern, initGroundPatterns } from '../assets/images.js'
import { initNoise } from '../systems/noise.js'
import { clearGroundCache } from '../systems/ground.js'
import { showScreen, updateLobby, backToLobby } from '../ui/screens.js'
import { blocked } from '../systems/collision.js'

export { selfId }

// 创建玩家
export function createPlayer(name, color) {
    return {
        name,
        ready: false,
        hp: 5,
        maxHp: 5,
        x: 0,
        y: 0,
        angle: 0,
        bodyAngle: 0,
        color,
        dashEnergy: DASH_MAX,
        speedBuff: 0,
        firerateBuff: 0,
        bulletBuff: 0,
        shieldTime: 0,
        invisibleTime: 0
    }
}

// 重新分配颜色
function reassignColors() {
    const ids = Object.keys(state.players).sort()
    for (let i = 0; i < ids.length; i++) {
        state.players[ids[i]].color = COLORS[i % MAX_PLAYERS]
    }
}

// 广播状态
export function broadcastState() {
    const p = me()
    if (!p || state.soloMode) return
    
    send('state', {
        name: p.name,
        ready: p.ready,
        hp: p.hp,
        maxHp: p.maxHp,
        x: p.x,
        y: p.y,
        angle: p.angle,
        bodyAngle: p.bodyAngle,
        color: p.color,
        dashEnergy: p.dashEnergy,
        speedBuff: p.speedBuff,
        firerateBuff: p.firerateBuff,
        bulletBuff: p.bulletBuff,
        shieldTime: p.shieldTime,
        invisibleTime: p.invisibleTime
    })
}

// 加入游戏房间
export function joinGameRoom() {
    const name = $('name-input').value.trim()
    const roomId = $('room-input').value.trim()
    
    if (!name || !roomId) {
        return alert(!name ? '请输入名称' : '请输入房间号')
    }
    
    state.playerName = name
    state.roomId = roomId
    state.peerId = selfId
    state.soloMode = false
    
    try {
        state.room = joinRoom({ appId: APP_ID }, roomId)
        setupComm()
        setupRoomEvents()
        state.players[state.peerId] = createPlayer(name, COLORS[0])
        showScreen('lobby-screen')
        updateLobby()
        setTimeout(broadcastState, 500)
        setTimeout(broadcastState, 1500)
        setTimeout(broadcastState, 3000)
    } catch (e) {
        alert('加入失败: ' + e.message)
    }
}

// 单人训练模式
export function startSoloMode() {
    const name = $('name-input').value.trim() || '训练生'
    
    // 完全重置状态（清除之前的游戏残留）
    resetState(true)
    
    // 设置单人模式状态
    Object.assign(state, {
        playerName: name,
        peerId: 'solo',
        roomId: 'solo',
        soloMode: true,
        room: null
    })
    
    // 创建单人玩家
    state.players[state.peerId] = createPlayer(name, COLORS[0])
    
    // 生成地图
    const map = genMap()
    const pos = genSpawns(1, map.walls, map.obstacles)
    const data = {
        positions: { [state.peerId]: pos[0] },
        ...map,
        monsters: [],
        items: []
    }
    
    state.walls = map.walls
    state.obstacles = map.obstacles
    state.monsters = []
    
    // 生成怪物
    for (let i = 0; i < 10; i++) {
        data.monsters.push({
            id: uid('m'),
            ...findPos(MONSTER_R, { x: 0, y: 0, w: MAP_W, h: MAP_H }),
            angle: rand(0, TWO_PI),
            hp: MONSTER_HP,
            cooldown: rand(0, MONSTER_CD)
        })
    }
    state.monsters = data.monsters
    
    // 生成道具
    for (let i = 0; i < 15; i++) {
        data.items.push({
            id: uid('i'),
            ...findPos(25, { x: 0, y: 0, w: MAP_W, h: MAP_H }),
            type: randItem(ITEM_TYPES)
        })
    }
    
    // 记录开始时间
    state.soloStartTime = Date.now()
    
    // 启动游戏
    handleStart(data)
}

// 设置通信
function setupComm() {
    if (!state.room) return
    
    const make = (name, handler) => {
        const [s, g] = state.room.makeAction(name)
        g(handler)
        sends[name] = s
    }
    
    make('state', (d, pid) => {
        if (state.gameOver) return
        if (state.roomLocked && !state.players[pid]) return
        if (!state.players[pid] && isRoomFull()) {
            send('roomfull', { target: pid })
            return
        }
        const ex = !!state.players[pid]
        const cur = state.players[pid] || {}
        state.players[pid] = {
            ...cur,
            ...d,
            color: d.color || cur.color || COLORS[Object.keys(state.players).length % MAX_PLAYERS]
        }
        if (!ex) {
            reassignColors()
            broadcastState()
        }
        if (!state.gameStarted) updateLobby()
    })
    
    make('ready', (d, pid) => {
        if (state.players[pid]) {
            state.players[pid].ready = d.ready
            updateLobby()
        }
    })
    
    make('start', d => {
        if (!state.gameStarted) handleStart(d)
    })
    
    make('move', (d, pid) => {
        if (state.players[pid] && state.gameStarted) {
            Object.assign(state.players[pid], d)
        }
    })
    
    make('shoot', (d, pid) => {
        if (!state.gameStarted || !state.players[pid] || state.players[pid].hp <= 0) return
        if (state.invincibleTime > 0) return
        
        const BULLET_R = 6
        for (const b of d.bullets) {
            if (!blocked(b.x, b.y, BULLET_R)) {
                state.bullets.push({ ...b, owner: pid, life: 500 })
            }
        }
        if (pid !== state.peerId && d.bullets[0]) {
            addFlash(d.bullets[0].x, d.bullets[0].y, state.players[pid].angle)
        }
    })
    
    make('hit', d => {
        const t = state.players[d.target]
        if (!t || t.hp <= 0 || state.invincibleTime > 0 || t.shieldTime) return
        if (t.invisibleTime > 0) t.invisibleTime = 0
        t.hp -= d.dmg || 1
        if (d.target === state.peerId) triggerHitEffect(t.x, t.y)
        if (t.hp <= 0) {
            state.deadPlayers.push([d.target, t])
            addExplosion(t.x, t.y)
            checkEnd()
        }
        state.bullets = state.bullets.filter(b => b.id !== d.bulletId)
    })
    
    make('gameover', d => {
        if (!state.gameOver) {
            state.gameOver = true
            state.winner = d.winner
            endGame()
        }
    })
    
    make('lock', d => { state.roomLocked = d.locked })
    make('buff', d => { state.buffs = d.buffs })
    
    make('pickbuff', (d, pid) => {
        state.buffs = state.buffs.filter(b => b.id !== d.id)
        applyBuff(state.players[pid], d.type)
        if (state.buffs.length < BUFF_N && isHost()) {
            setTimeout(() => spawnBuffs(BUFF_N - state.buffs.length), 2000)
        }
    })
    
    make('monsterhit', d => {
        const m = state.monsters.find(x => x.id === d.id)
        if (!m || m.hp <= 0) return
        m.hp -= d.dmg
        if (m.hp <= 0) {
            addExplosion(m.x, m.y, 1.5)
            if (d.by === state.peerId) me().dashEnergy = DASH_MAX
            if (isHost()) spawnBuffAt(m.x, m.y)
        }
    })
    
    make('shrink', d => {
        if (d.fromZone && d.toZone) {
            state.shrinking = true
            state.shrinkFrom = d.fromZone
            state.shrinkTo = d.toZone
            state.shrinkAnimTime = 0
        }
        if (d.monsters) state.monsters = d.monsters
        if (d.items) state.items = d.items
        if (d.buffs) state.buffs = d.buffs
    })
    
    make('items', d => { state.items = d.items })
    make('useitem', (d, pid) => execItem(d, pid))
    
    make('entity', d => {
        if (d.type === 'banana') state.bananas.push(...d.entities)
        else if (d.type === 'laserbeam') {
            state.lasers.push(d.entity)
            if (d.impacts) state.laserImpacts.push(...d.impacts)
        }
        else if (d.type === 'mud') state.mudPools.push(d.entity)
        else if (d.type === 'smoke') state.smokes.push(d.entity)
        else if (d.type === 'laser') state.lasers.push(d.entity)
        else if (d.type === 'monster') state.monsters.push(d.entity)
        else if (d.type === 'projectile') state.projectiles.push(d.entity)
    })
    
    make('roomfull', d => {
        if (d.target === state.peerId) {
            alert(`房间已满（${MAX_PLAYERS}/${MAX_PLAYERS}），无法加入！`)
            backToLobby()
        }
    })
}

// 设置房间事件
function setupRoomEvents() {
    if (!state.room) return
    
    state.room.onPeerJoin(() => {
        if (!state.roomLocked) setTimeout(broadcastState, 300)
    })
    
    state.room.onPeerLeave(pid => {
        if (state.gameStarted && !state.gameOver && state.players[pid]?.hp > 0) {
            state.players[pid].hp = 0
            state.deadPlayers.push([pid, state.players[pid]])
            addExplosion(state.players[pid].x, state.players[pid].y)
            checkEnd()
        } else if (!state.gameStarted) {
            delete state.players[pid]
            reassignColors()
            updateLobby()
        }
    })
}

// 开始游戏
export function startGame() {
    const entries = Object.entries(state.players)
    const map = genMap()
    const pos = genSpawns(entries.length, map.walls, map.obstacles)
    const data = { positions: {}, ...map, monsters: [], items: [] }
    
    entries.sort(([a], [b]) => a.localeCompare(b)).forEach(([id], i) => {
        data.positions[id] = pos[i]
    })
    
    state.walls = map.walls
    state.obstacles = map.obstacles
    state.monsters = []
    
    const n = entries.length * 3
    for (let i = 0; i < n; i++) {
        data.monsters.push({
            id: uid('m'),
            ...findPos(MONSTER_R, { x: 0, y: 0, w: MAP_W, h: MAP_H }),
            angle: rand(0, TWO_PI),
            hp: MONSTER_HP,
            cooldown: rand(0, MONSTER_CD)
        })
    }
    state.monsters = data.monsters
    
    for (let i = 0; i < n; i++) {
        data.items.push({
            id: uid('i'),
            ...findPos(25, { x: 0, y: 0, w: MAP_W, h: MAP_H }),
            type: randItem(ITEM_TYPES)
        })
    }
    
    send('start', data)
    handleStart(data)
}

// 处理游戏开始
export function handleStart(data) {
    const players = state.players
    
    Object.assign(state, createDefaultState(), {
        gameStarted: true,
        roomLocked: true,
        invincibleTime: INVINCIBLE_T,
        walls: data.walls || [],
        obstacles: data.obstacles || [],
        monsters: data.monsters || [],
        items: data.items || []
    })
    
    state.players = players
    send('lock', { locked: true })
    
    for (const [id, pos] of Object.entries(data.positions)) {
        const p = state.players[id]
        if (p) {
            Object.assign(p, pos, {
                bodyAngle: pos.angle,
                hp: 5,
                maxHp: 5,
                dashEnergy: DASH_MAX,
                speedBuff: 0,
                firerateBuff: 0,
                bulletBuff: 0,
                shieldTime: 0,
                invisibleTime: 0,
                magnetTime: 0
            })
        }
    }
    
    buildSpatialGrid()
    initWallPattern()
    initNoise()
    initGroundPatterns()
    clearGroundCache()
    updateFrameCache()
    
    showScreen('game-screen')
    setupGameInput()
    
    state.lastTime = performance.now()
    gameLoop(state.lastTime)
}

// 设置游戏输入
function setupGameInput() {
    const c = $('game-canvas')
    c.width = VIEW_W
    c.height = VIEW_H
    
    c.onmousemove = e => {
        const r = c.getBoundingClientRect()
        state.mouse.x = e.clientX - r.left
        state.mouse.y = e.clientY - r.top
    }
    
    c.onmousedown = e => {
        if (e.button === 0) {
            state.keys['Mouse0'] = true
            state.keysJustPressed['Mouse0'] = true
        }
    }
    
    c.onmouseup = e => {
        if (e.button === 0) {
            state.keys['Mouse0'] = false
            state.keysJustReleased['Mouse0'] = true
        }
    }
    
    const preventKeys = new Set([
        'Space', 'ShiftLeft', 'ShiftRight',
        'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
        'KeyW', 'KeyA', 'KeyS', 'KeyD'
    ])
    
    window.onkeydown = e => {
        if (!state.keys[e.code]) state.keysJustPressed[e.code] = true
        state.keys[e.code] = true
        if (preventKeys.has(e.code)) e.preventDefault()
    }
    
    window.onkeyup = e => {
        state.keys[e.code] = false
        state.keysJustReleased[e.code] = true
    }
}

// 切换准备状态
export function toggleReady() {
    const p = me()
    if (!p) return
    
    p.ready = !p.ready
    send('ready', { ready: p.ready })
    broadcastState()
    updateLobby()
    
    $('ready-btn').textContent = p.ready ? '取消准备' : '准备'
    $('ready-btn').className = p.ready ? 'btn btn-cancel' : 'btn btn-ready'
}