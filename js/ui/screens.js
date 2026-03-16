import { state, framePlayerEntries, resetState } from '../state.js'
import { $, send, me, isHost } from '../utils.js'
import { DASH_MAX, MAX_PLAYERS } from '../constants.js'
import { startGame, broadcastState, startSoloMode } from '../network/communication.js'

// 显示指定界面
export function showScreen(id) {
    const screens = document.querySelectorAll('.screen')
    for (let i = 0; i < screens.length; i++) {
        screens[i].classList.toggle('active', screens[i].id === id)
    }
}

// 切换帮助面板
export function toggleHelp() {
    const m = $('help-modal')
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex'
}

// 更新大厅界面
export function updateLobby() {
    const entries = Object.entries(state.players)
    let html = ''
    
    for (const [id, p] of entries) {
        html += `<div class="player-item" style="border-left:4px solid ${p.color}">
            <span class="player-name">${p.name}${id === state.peerId ? ' (我)' : ''}</span>
            <span class="player-status ${p.ready ? 'ready' : ''}">${p.ready ? '✔ 已准备' : '未准备'}</span>
        </div>`
    }
    
    $('player-list').innerHTML = html
    $('room-display').textContent = `房间: ${state.roomId}`
    $('player-count').textContent = `玩家: ${entries.length}/${MAX_PLAYERS}`
    
    // 检查是否可以开始游戏
    if (entries.length >= 2 && entries.every(([, p]) => p.ready) && !state.gameStarted && isHost()) {
        startGame()
    }
}

// 显示结果界面
export function showResult() {
    showScreen('result-screen')
    
    const alive = framePlayerEntries.filter(([, p]) => p.hp > 0)
    const ranking = [
        ...alive.map(([id, p]) => ({ id, ...p, rank: 1 })),
        ...[...state.deadPlayers].reverse().map(([id, p], i) => ({ id, ...p, rank: i + 2 }))
    ]
    
    const medals = ['🥇', '🥈', '🥉']
    
    // 单人模式：只显示训练结束和存活时间，不判断胜利
    const title = state.soloMode
        ? `<div class="result-title lose">💀 训练结束</div>
           <div style="color:#aaa;margin-bottom:20px">存活时间: ${((Date.now() - state.soloStartTime) / 1000) | 0}秒</div>`
        : `<div class="result-title ${state.winner === state.peerId ? 'win' : 'lose'}">
            ${state.winner === state.peerId ? '🏆 胜利！' : '💀 游戏结束'}
           </div>`
    
    let rankHtml = ''
    for (const r of ranking) {
        rankHtml += `<div class="rank-item" style="border-left:4px solid ${r.color}">
            <span class="rank-medal">${medals[r.rank - 1] || '#' + r.rank}</span>
            <span>${r.name}${r.id === state.peerId ? ' (我)' : ''}</span>
        </div>`
    }
    
    $('result-content').innerHTML = `${title}<div class="ranking">${rankHtml}</div>`
    $('back-btn').textContent = state.soloMode ? '再次训练' : '再来一局'
    $('quit-btn').textContent = state.soloMode ? '返回主页' : '退出房间'
}

// 返回房间（再来一局）
export function backToRoom() {
    // 单人模式：直接重置并重启训练，不进入准备界面
    if (state.soloMode) {
        resetState(true)  // 完全重置（包括玩家列表）
        startSoloMode()   // 直接启动单人训练
        return
    }
    
    // 多人模式：重置并返回准备界面
    resetState()
    
    for (const p of Object.values(state.players)) {
        Object.assign(p, {
            ready: false,
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
    
    send('lock', { locked: false })
    broadcastState()
    
    $('ready-btn').textContent = '准备'
    $('ready-btn').className = 'btn btn-ready'
    showScreen('lobby-screen')
    updateLobby()
}

// 退出到主界面
export function backToLobby() {
    if (state.room) state.room.leave()
    resetState(true)
    showScreen('join-screen')
}