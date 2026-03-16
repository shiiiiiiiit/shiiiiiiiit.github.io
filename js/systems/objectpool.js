// 对象池类
export class Objectpool {
    constructor(factory, reset, max = 200) {
        this._pool = []
        this._factory = factory
        this._reset = reset
        this._max = max
    }
    
    get(...args) {
        const obj = this._pool.pop() || this._factory()
        this._reset(obj, ...args)
        return obj
    }
    
    release(obj) {
        if (this._pool.length < this._max) this._pool.push(obj)
    }
}

// 拖尾池
export const trailPool = new Objectpool(
    () => ({ x: 0, y: 0, life: 0 }),
    (t, x, y, life) => { t.x = x; t.y = y; t.life = life }
)

// 子弹池
export const bulletPool = new Objectpool(
    () => ({
        id: '', x: 0, y: 0, vx: 0, vy: 0,
        owner: '', life: 0, dmg: 1,
        isPerfect: false, isCharged: false, isMonster: false
    }),
    (b, data) => Object.assign(b, data)
)

// 爆炸池
export const explosionPool = new Objectpool(
    () => ({ x: 0, y: 0, life: 0, maxLife: 0 }),
    (e, x, y, life) => { e.x = x; e.y = y; e.life = life; e.maxLife = life }
)