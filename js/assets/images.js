import { ASSET_PATH, IMAGE_LIST, COLORS } from '../constants.js'
import { $ } from '../utils.js'

// 图片存储
export const images = {}
export const tankCache = {}
export let wallPattern = null
export const groundPatterns = []

// 加载图片
export function loadImages() {
    return new Promise((resolve, reject) => {
        let loaded = 0
        const failed = []
        const total = IMAGE_LIST.length
        
        for (const name of IMAGE_LIST) {
            const img = new Image()
            img.onload = () => {
                images[name] = img
                if (++loaded === total) {
                    if (failed.length > 0) {
                        reject(new Error(`图片加载失败：\n${failed.map(n => n + '.png').join('\n')}`))
                    } else {
                        generateTankCache()
                        resolve()
                    }
                }
                updateLoadingProgress(loaded, total)
            }
            img.onerror = () => {
                failed.push(name)
                if (++loaded === total) {
                    reject(new Error(`图片加载失败：\n${failed.map(n => n + '.png').join('\n')}`))
                }
                updateLoadingProgress(loaded, total)
            }
            img.src = `${ASSET_PATH}${name}.png`
        }
    })
}

function updateLoadingProgress(loaded, total) {
    const el = $('loading-progress')
    if (el) el.textContent = `加载资源中... ${(loaded / total * 100) | 0}%`
}

// 生成坦克颜色缓存
function generateTankCache() {
    const bodyImg = images['tank_body']
    const turretImg = images['tank_turret']
    for (const color of COLORS) {
        tankCache[color] = {
            body: tintImage(bodyImg, color),
            turret: tintImage(turretImg, color)
        }
    }
}

// 图片着色
function tintImage(img, color) {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    c.width = img.width
    c.height = img.height
    ctx.drawImage(img, 0, 0)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(img, 0, 0)
    return c
}

// 初始化墙壁纹理
export function initWallPattern() {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    wallPattern = c.getContext('2d').createPattern(images['wall_tile'], 'repeat')
}

// 初始化地面纹理
const GROUND_NAMES = ['ground_grass', 'ground_dirt', 'ground_sand', 'ground_stone']

export function initGroundPatterns() {
    groundPatterns.length = 0
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d')
    for (const name of GROUND_NAMES) {
        const img = images[name]
        groundPatterns.push(img ? ctx.createPattern(img, 'repeat') : null)
    }
}