import { BUFFS, BUFF_TYPES, BUFF_N } from '../constants.js'
import { state } from '../state.js'
import { uid, rand, randItem, distSq, isHost, me, send } from '../utils.js'
import { findPos } from './map.js'

export function spawnBuffs(n) {
    for (let i = 0; i < n; i++) {
        state.buffs.push({
            id: uid('b'),
            ...findPos(30),
            type: randItem(BUFF_TYPES)
        })
    }
    send('buff', { buffs: state.buffs })
}

export function spawnBuffAt(x, y) {
    state.buffs.push({
        id: uid('b'),
        x: x + rand(-30, 30),
        y: y + rand(-30, 30),
        type: randItem(BUFF_TYPES)
    })
    send('buff', { buffs: state.buffs })
}

export function applyBuff(p, t) {
    if (!p) return
    if (t === 'heal') {
        p.maxHp += 5
        p.hp = p.maxHp
    } else if (p[t + 'Buff'] < BUFFS[t].max) {
        p[t + 'Buff']++
    }
}

export function tryPickBuff() {
    const p = me()
    if (!p || p.hp <= 0) return
    
    const px = p.x, py = p.y
    for (let i = 0; i < state.buffs.length; i++) {
        const b = state.buffs[i]
        if (distSq(px, py, b.x, b.y) < 1600) { // 40^2
            // 可以添加拾取动画
            applyBuff(p, b.type)
            send('pickbuff', { id: b.id, type: b.type })
            state.buffs.splice(i, 1)
            break
        }
    }
}