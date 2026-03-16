import { $ } from './helpers.js'
import { loadImages } from './assets/images.js'
import { loadSounds, initAudioContext, toggleMute } from './assets/sounds.js'
import { SOUND_LIST } from './constants.js'
import { joinGameRoom, startSoloMode, toggleReady } from './network/communication.js'
import { showScreen, toggleHelp, backToRoom, backToLobby } from './ui/screens.js'

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 加载图片资源
        await loadImages()
        
        // 加载音效资源
        $('loading-progress').textContent = '加载音效中...'
        try {
            await loadSounds(SOUND_LIST)
        } catch (e) {
            console.warn('音效加载失败，游戏将以静音模式运行：', e.message)
        }
        
    } catch (e) {
        alert('⚠️ 资源加载失败！\n\n' + e.message + '\n\n请检查 assets 文件夹后刷新页面。')
        return
    }
    
    $('loading-progress').style.display = 'none'
    $('join-form').style.display = 'block'
    
    // 绑定事件
    $('join-btn').onclick = () => {
        initAudioContext()
        joinGameRoom()
    }
    $('solo-btn').onclick = () => {
        initAudioContext()
        startSoloMode()
    }
    $('ready-btn').onclick = toggleReady
    $('back-btn').onclick = backToRoom
    $('quit-btn').onclick = backToLobby
    $('help-btn').onclick = toggleHelp
    $('help-close').onclick = toggleHelp
    $('sound-toggle').onclick = toggleMute
    
    $('help-modal').onclick = e => {
        if (e.target.id === 'help-modal') toggleHelp()
    }
    
    $('name-input').onkeypress = e => {
        if (e.key === 'Enter') $('room-input').focus()
    }
    
    $('room-input').onkeypress = e => {
        if (e.key === 'Enter') {
            initAudioContext()
            joinGameRoom()
        }
    }
    
    // 用户首次交互时激活音频上下文（处理浏览器自动播放策略）
    const activateAudio = () => {
        initAudioContext()
        document.removeEventListener('click', activateAudio)
        document.removeEventListener('keydown', activateAudio)
    }
    document.addEventListener('click', activateAudio)
    document.addEventListener('keydown', activateAudio)
})