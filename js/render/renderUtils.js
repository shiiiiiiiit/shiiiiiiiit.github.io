import { TWO_PI } from '../constants.js'
import { images, tankCache } from '../assets/images.js'

export const lerp = (a, b, t) => a + (b - a) * t

export function fillCircle(ctx, x, y, r, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TWO_PI)
    ctx.fill()
}

export function strokeCircle(ctx, x, y, r, color, w = 2) {
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TWO_PI)
    ctx.stroke()
}

export function drawImg(ctx, name, x, y, w, h, angle = 0) {
    const img = images[name]
    if (!img) return
    
    ctx.save()
    ctx.translate(x, y)
    if (angle) ctx.rotate(angle)
    ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h)
    ctx.restore()
}

export function drawTintedTank(ctx, part, color, x, y, w, h, angle) {
    const cache = tankCache[color]
    if (!cache || !cache[part]) return
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.drawImage(cache[part], -w * 0.5, -h * 0.5, w, h)
    ctx.restore()
}