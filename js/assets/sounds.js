// 音频上下文
let audioContext = null
let soundBuffers = {}
let isAudioReady = false

// 音效状态（模块内部管理）
let muted = false
let volume = 0.7

// 初始化音频上下文
export function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume()
    }
    isAudioReady = true
}

// 加载音效
export function loadSounds(soundList) {
    return new Promise((resolve, reject) => {
        if (soundList.length === 0) {
            resolve()
            return
        }
        
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)()
        }
        
        let loaded = 0
        const failed = []
        const total = soundList.length
        
        for (const name of soundList) {
            fetch(`assets/sounds/${name}.mp3`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`)
                    return response.arrayBuffer()
                })
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    soundBuffers[name] = audioBuffer
                    if (++loaded === total) {
                        if (failed.length > 0) {
                            reject(new Error(`音效加载失败：\n${failed.map(n => n + '.mp3').join('\n')}`))
                        } else {
                            resolve()
                        }
                    }
                    updateSoundLoadingProgress(loaded, total)
                })
                .catch(err => {
                    console.warn(`音效 ${name}.mp3 加载失败:`, err)
                    failed.push(name)
                    if (++loaded === total) {
                        reject(new Error(`音效加载失败：\n${failed.map(n => n + '.mp3').join('\n')}`))
                    }
                    updateSoundLoadingProgress(loaded, total)
                })
        }
    })
}

function updateSoundLoadingProgress(loaded, total) {
    const el = document.getElementById('loading-progress')
    if (el) el.textContent = `加载音效中... ${(loaded / total * 100) | 0}%`
}

// 播放音效
export function playSound(name, volumeMultiplier = 1.0, playbackRate = 1.0) {
    if (!isAudioReady || !audioContext || !soundBuffers[name] || muted) {
        return
    }
    
    try {
        const source = audioContext.createBufferSource()
        const gainNode = audioContext.createGain()
        
        source.buffer = soundBuffers[name]
        source.playbackRate.value = playbackRate
        gainNode.gain.value = volume * volumeMultiplier
        
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)
        source.start(0)
        
        source.onended = () => {
            source.disconnect()
            gainNode.disconnect()
        }
    } catch (err) {
        console.warn(`播放音效 ${name} 失败:`, err)
    }
}

// 切换静音
export function toggleMute() {
    muted = !muted
    updateMuteButton()
}

// 设置音量
export function setVolume(v) {
    volume = Math.max(0, Math.min(1, v))
}

// 获取状态（供外部查询）
export function isMuted() {
    return muted
}

export function getVolume() {
    return volume
}

// 更新按钮显示
function updateMuteButton() {
    const btn = document.getElementById('sound-toggle')
    if (btn) {
        btn.textContent = muted ? '🔇' : '🔊'
        btn.title = muted ? '取消静音' : '静音'
    }
}

export function getAudioContext() {
    return audioContext
}