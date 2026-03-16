// ==================== 游戏常量 ====================
export const APP_ID = 'tank-battle-p2p-game-v8'

// 地图与视图
export const MAP_W = 16000
export const MAP_H = 12000
export const VIEW_W = 800
export const VIEW_H = 600

// 坦克属性
export const SPEED = 120
export const BODY_ROT_SPEED = 6
export const TANK_R = 22

// 子弹属性
export const BULLET_SPD = 350
export const BULLET_R = 6

// 射击系统
export const BASE_CD = 1.2
export const BUFF_RED = 0.1
export const RECOIL = 35
export const SHAKE_DUR = 0.12
export const SHAKE_INTENSITY = 4
export const AMMO_MAX = 10
export const FIRE_INTERVAL = 0.3
export const CHARGE_TIME = 2
export const CHARGE_AMMO_COST = 5
export const CHARGE_SPREAD = BULLET_R * 6

// 冲刺系统
export const DASH_MAX = 5
export const DASH_REGEN = 3
export const DASH_SHORT_DIST = TANK_R * 4
export const DASH_LONG_DIST = TANK_R * 16
export const DASH_SHORT_DUR = 0.1
export const DASH_LONG_DUR = 0.35
export const DASH_HOLD_THRESHOLD = 0.1

// 无敌与效果
export const INVINCIBLE_T = 5
export const HIT_SHAKE_DUR = 0.25
export const HIT_SHAKE_INTENSITY = 6
export const RECOIL_DECAY = 0.92
export const RECOIL_MIN = 0.5

// 怪物
export const MONSTER_R = 44
export const MONSTER_HP = 30
export const MONSTER_RANGE = 450
export const MONSTER_CD = 0.6

// 缩圈
export const SHRINK_INTERVAL = 20
export const SHRINK_RATIO = 1/15
export const SHRINK_DUR = 2

// 道具与Buff
export const BUFF_N = 3
export const INV_SIZE = 5
export const MUD_RX = 300
export const MUD_RY = 200
export const SLIDE_DUR = 3
export const SLIDE_MULT = 9
export const SMOKE_DUR = 15
export const SMOKE_FADEIN_DUR = 0.8
export const THROW_DUR = 0.5
export const SHIELD_DUR = 3

// 激光
export const LASER_WARN_DUR = 0.5
export const LASER_CHARGE_DUR = 0.6
export const LASER_BEAM_DUR = 0.3
export const LASER_BEAM_WIDTH = 70
export const LASER_MAX_LENGTH = Math.hypot(MAP_W, MAP_H)

// 地图生成
export const WALL_N = 80
export const OBST_N = 120
export const GRID_CELL = 200

// 地面渲染
export const CHUNK_W = 800
export const CHUNK_H = 600
export const MAX_GROUND_CHUNKS = 16
export const SAMPLE_STEP = 16
export const BLEND_HALF = 0.15
export const GROUND_THRESHOLDS = [-0.2, 0.05, 0.25]

// 玩家
export const MAX_PLAYERS = 8
export const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#00cec9']

// 资源路径
export const ASSET_PATH = 'assets/'

// 数学常量
export const TWO_PI = Math.PI * 2
export const HALF_PI = Math.PI / 2

// Buff定义
export const BUFFS = {
    heal:     { icon: 'buff_heal',     color: '#e74c3c', max: 999 },
    firerate: { icon: 'buff_firerate', color: '#f39c12', max: 5 },
    speed:    { icon: 'buff_speed',    color: '#3498db', max: 6 },
    bullet:   { icon: 'buff_bullet',   color: '#9b59b6', max: 5 }
}

// 道具定义
export const ITEMS = {
    mud: 'item_mud',
    laser: 'item_laser',
    banana: 'item_banana',
    monster_bottle: 'item_monster_bottle',
    magnet: 'item_magnet',
    smoke: 'item_smoke',
    shield: 'item_shield',
    invisibility: 'item_invisibility',
    heal_potion: 'item_heal_potion'
}

export const BUFF_TYPES = Object.keys(BUFFS)
export const ITEM_TYPES = Object.keys(ITEMS)

// 图片列表
export const IMAGE_LIST = [
    'tank_body','tank_turret','tank_shadow',
    'bullet_normal','bullet_perfect','bullet_monster',
    'muzzle_flash','explosion','monster',
    'obstacle_tree','obstacle_rock','wall_tile',
    'buff_heal','buff_firerate','buff_speed','buff_bullet',
    'item_mud','item_laser','item_banana','item_monster_bottle',
    'item_magnet','item_smoke','item_shield','item_invisibility','item_heal_potion',
    'mud_pool','smoke_cloud','banana_peel','dash_trail','shield_effect',
    'icon_hp','icon_dash','icon_timer',
    'ground_grass','ground_dirt','ground_sand','ground_stone',
    'perfect_glow','laser_impact','laser_charge'
]
// 音效列表
export const SOUND_LIST = [
    'shoot',
    'shoot_charged',
    'shoot_perfect'
]

// 音效配置
export const DEFAULT_VOLUME = 0.7