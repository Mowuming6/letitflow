<template>
  <div class="ff-container" ref="containerRef">
    <canvas ref="canvasRef" class="ff-canvas"
      @mousemove="onMouseMove" @mousedown="onMouseDown" @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
      @touchstart.prevent="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd">
    </canvas>

    <!-- Vignette overlay -->
    <div class="ff-vignette" :style="vignetteStyle"></div>

    <!-- Header -->
    <div class="ff-header">
      <h1 class="ff-title">天 机 流 场</h1>
      <p class="ff-sub">DIVINE FLOW FIELD · {{ MODES[modeIdx].label }}</p>
    </div>

    <!-- Center oracle trigger -->
    <div class="oracle-hub" @click="triggerOracle" :class="{ spinning: oPhase !== 'idle' }">
      <div class="hub-ring r1"></div>
      <div class="hub-ring r2"></div>
      <div class="hub-ring r3"></div>
      <div class="hub-core">{{ oPhase === 'idle' ? '天' : '◉' }}</div>
    </div>

    <!-- Mode switcher -->
    <div class="mode-bar">
      <button v-for="(m, i) in MODES" :key="m.id"
        class="mode-dot" :class="{ active: modeIdx === i }"
        :style="{ background: m.dot }"
        @click="switchMode(i)" :title="m.label">
      </button>
    </div>

    <!-- Hint -->
    <div class="ff-hint">移动 — 扰乱流场 &nbsp;|&nbsp; 按住 — 产生引力涡旋 &nbsp;|&nbsp; 点击「天」— 召唤天机</div>

    <!-- Oracle card -->
    <Transition name="ora">
      <div v-if="oPhase === 'reveal'" class="ora-card" :style="cardStyle">
        <div class="ora-gua">{{ oracle.gua }}</div>
        <div class="ora-name">{{ oracle.name }}</div>
        <div class="ora-divider"></div>
        <div class="ora-poem">{{ oracle.poem }}</div>
        <div class="ora-text">{{ oracle.text }}</div>
        <button class="ora-close" @click="closeOracle">收 卦</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const containerRef = ref(null)
const modeIdx = ref(0)
const oPhase = ref('idle') // idle | gather | burst | reveal
const oracle = ref({})

// ─── Color Modes ──────────────────────────────────────────
const MODES = [
  { id: 'cosmic', label: '宇宙蓝',  dot: '#00bfff', bg: [3,5,16],   hueB: 200, hueR: 50,  alpha: 0.18 },
  { id: 'solar',  label: '熔岩金',  dot: '#ff8c00', bg: [16,6,2],   hueB: 25,  hueR: -20, alpha: 0.18 },
  { id: 'void',   label: '幽冥紫',  dot: '#9d4eff', bg: [7,2,18],   hueB: 270, hueR: 45,  alpha: 0.18 },
  { id: 'jade',   label: '翡翠绿',  dot: '#00ff88', bg: [2,14,6],   hueB: 145, hueR: 35,  alpha: 0.18 },
]

// ─── Oracles ─────────────────────────────────────────────
const ORACLES = [
  { gua:'☰', name:'乾为天', poem:'天行健，君子以自强不息', text:'刚健中正，大业蓬勃。红日东升，锐意进取必有大成。' },
  { gua:'☷', name:'坤为地', poem:'地势坤，君子以厚德载物', text:'柔顺包容，广纳川流。博大胸怀蓄势待发，静候丰收。' },
  { gua:'☳', name:'震为雷', poem:'洊雷震，君子以恐惧修省', text:'雷声隆隆，惊醒沉梦。面对突变保持敬畏，自省无忧。' },
  { gua:'☴', name:'巽为风', poem:'随风巽，君子以申命行事', text:'顺风渗透，润物无声。谦逊听取建议，顺势而为见功。' },
  { gua:'☵', name:'坎为水', poem:'水洊至，习坎，君子以常德行', text:'川流险阻，守正不息。坚韧不拔，化险为夷是正道。' },
  { gua:'☶', name:'艮为山', poem:'兼山艮，君子以思不出其位', text:'止其所当止，安守本分。韬光养晦，天时自至。' },
  { gua:'☲', name:'离为火', poem:'柔丽乎中正，重明以丽乎正', text:'光明附丽，智慧照耀。展现才华的最佳时机已到。' },
  { gua:'☱', name:'兑为泽', poem:'丽泽兑，君子以朋友讲习', text:'欢欣和悦，润泽万物。利于合作，亲和力带来喜悦。' },
]

// ─── Noise ───────────────────────────────────────────────
function n2(x, y, t) {
  return (
    Math.sin(x * 1.5 + t * 0.31) * Math.cos(y * 1.2 + t * 0.41) +
    Math.sin(x * 2.8 + y * 1.9  + t * 0.21) * 0.5 +
    Math.cos(x * 0.7 - y * 2.3  + t * 0.57) * 0.35 +
    Math.sin(x * 4.2 + y * 3.1  - t * 0.14) * 0.2
  ) / 2.05
}

function curl(x, y, t) {
  const e = 0.005
  return {
    fx:  (n2(x, y + e, t) - n2(x, y - e, t)) / (2 * e),
    fy: -(n2(x + e, y, t) - n2(x - e, y, t)) / (2 * e),
  }
}

// ─── Canvas State ────────────────────────────────────────
const NMAX = 4000
let ctx = null
let W = 1, H = 1, dpr = 1
let rafId = null
let tick = 0

const px  = new Float32Array(NMAX)
const py  = new Float32Array(NMAX)
const ppx = new Float32Array(NMAX)
const ppy = new Float32Array(NMAX)
const pvx = new Float32Array(NMAX)
const pvy = new Float32Array(NMAX)
const psp = new Float32Array(NMAX) // base speed

let mX = -9999, mY = -9999, mDown = false

// oracle animation state (plain vars, not reactive - read from oPhase.value in loop)
let oTick = 0

function N() { return window.innerWidth < 600 ? 1800 : NMAX }

function initParticles() {
  const n = N()
  for (let i = 0; i < n; i++) {
    px[i] = Math.random() * W
    py[i] = Math.random() * H
    ppx[i] = px[i]; ppy[i] = py[i]
    pvx[i] = 0; pvy[i] = 0
    psp[i] = 0.4 + Math.random() * 1.6
  }
}

function getColor(speed) {
  const m = MODES[modeIdx.value]
  const t = Math.min(speed / 4, 1)
  const h = m.hueB + m.hueR * t
  const s = 75 + t * 20
  const l = 40 + t * 38
  const a = 0.08 + t * 0.55
  return `hsla(${h|0},${s|0}%,${l|0}%,${a.toFixed(2)})`
}

function loop() {
  tick++
  const t = tick * 0.0005
  const m = MODES[modeIdx.value]
  const [r, g, b] = m.bg
  const cx = W / 2, cy = H / 2
  const phase = oPhase.value
  const n = N()

  // Fade previous frame (creates silky trails)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = `rgba(${r},${g},${b},${m.alpha})`
  ctx.fillRect(0, 0, W, H)

  // Additive blending for luminous particles
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < n; i++) {
    ppx[i] = px[i]; ppy[i] = py[i]

    // Curl noise field (normalize coords to ~[-2, 2])
    const nx = px[i] / W * 4 - 2
    const ny = py[i] / H * 4 - 2
    const { fx, fy } = curl(nx, ny, t)

    pvx[i] += fx * 0.6
    pvy[i] += fy * 0.6

    // Mouse hover → gentle repulsion
    if (mX > 0 && !mDown) {
      const dx = mX - px[i], dy = mY - py[i]
      const d2 = dx * dx + dy * dy
      if (d2 < 80 * 80 && d2 > 0.1) {
        const d = Math.sqrt(d2)
        const f = ((80 - d) / 80) * 0.9
        pvx[i] -= (dx / d) * f
        pvy[i] -= (dy / d) * f
      }
    }

    // Mouse down → strong attraction (gravity vortex)
    if (mDown && mX > 0) {
      const dx = mX - px[i], dy = mY - py[i]
      const d2 = dx * dx + dy * dy
      if (d2 < 220 * 220 && d2 > 0.1) {
        const d = Math.sqrt(d2)
        const f = ((220 - d) / 220) * 3.5
        pvx[i] += (dx / d) * f
        pvy[i] += (dy / d) * f
      }
    }

    // Oracle GATHER: suck particles to center
    if (phase === 'gather') {
      const dx = cx - px[i], dy = cy - py[i]
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001
      const f = Math.min(oTick / 30, 1) * 4.5
      pvx[i] += (dx / d) * f
      pvy[i] += (dy / d) * f
    }

    // Oracle BURST: explode outward in 8 rays
    if (phase === 'burst' && oTick < 5) {
      const rayAngle = (i / n) * Math.PI * 2 + Math.floor((i * 8) / n) * (Math.PI * 2 / 8)
      pvx[i] += Math.cos(rayAngle) * 10
      pvy[i] += Math.sin(rayAngle) * 10
    }

    // Damping
    pvx[i] *= 0.925
    pvy[i] *= 0.925

    // Clamp speed
    const spd = Math.sqrt(pvx[i] * pvx[i] + pvy[i] * pvy[i])
    if (spd > 7) { pvx[i] = pvx[i] / spd * 7; pvy[i] = pvy[i] / spd * 7 }

    px[i] += pvx[i] * psp[i]
    py[i] += pvy[i] * psp[i]

    // Wrap edges (infinite canvas)
    if (px[i] < -2)  { px[i] += W + 4; ppx[i] = px[i] }
    if (px[i] > W+2) { px[i] -= W + 4; ppx[i] = px[i] }
    if (py[i] < -2)  { py[i] += H + 4; ppy[i] = py[i] }
    if (py[i] > H+2) { py[i] -= H + 4; ppy[i] = py[i] }

    // Draw trail segment
    const actualSpd = Math.sqrt(pvx[i] * pvx[i] + pvy[i] * pvy[i])
    ctx.strokeStyle = getColor(actualSpd)
    ctx.lineWidth = 0.5 + Math.min(actualSpd * 0.25, 1.5)
    ctx.beginPath()
    ctx.moveTo(ppx[i], ppy[i])
    ctx.lineTo(px[i], py[i])
    ctx.stroke()
  }

  ctx.globalCompositeOperation = 'source-over'

  // Draw glowing center hub indicator
  const hubR = 28
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.05)
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR * 2)
  grad.addColorStop(0, `rgba(${r + 40},${g + 60},${b + 120},${0.35 * pulse})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, hubR * 2, 0, Math.PI * 2)
  ctx.fill()

  // Oracle phase timing
  oTick++
  if (phase === 'gather' && oTick > 90) {
    oPhase.value = 'burst'; oTick = 0
  } else if (phase === 'burst' && oTick > 25) {
    oPhase.value = 'reveal'; oTick = 0
  }

  rafId = requestAnimationFrame(loop)
}

// ─── Oracle ──────────────────────────────────────────────
function triggerOracle() {
  if (oPhase.value !== 'idle') return
  oracle.value = ORACLES[Math.floor(Math.random() * ORACLES.length)]
  oTick = 0
  oPhase.value = 'gather'
}

function closeOracle() {
  oPhase.value = 'idle'
  oTick = 0
}

function switchMode(i) {
  modeIdx.value = i
  // Re-fill canvas with new background immediately
  if (ctx) {
    const m = MODES[i]
    const [r, g, b] = m.bg
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(0, 0, W, H)
  }
}

// ─── Dynamic styles ──────────────────────────────────────
const vignetteStyle = computed(() => {
  const m = MODES[modeIdx.value]
  return { background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(${m.bg.join(',')}, 0.85) 100%)` }
})

const cardStyle = computed(() => {
  const m = MODES[modeIdx.value]
  const [r, g, b] = m.bg
  return {
    background: `rgba(${Math.min(r+10,30)},${Math.min(g+10,30)},${Math.min(b+10,40)},0.9)`,
    borderColor: m.dot,
    boxShadow: `0 0 60px ${m.dot}22, 0 20px 60px rgba(0,0,0,0.6)`,
  }
})

// ─── Mouse / Touch ───────────────────────────────────────
function toCanvasXY(clientX, clientY) {
  const r = canvasRef.value.getBoundingClientRect()
  return [clientX - r.left, clientY - r.top]
}

function onMouseMove(e) { ;[mX, mY] = toCanvasXY(e.clientX, e.clientY) }
function onMouseDown(e) { mDown = true; ;[mX, mY] = toCanvasXY(e.clientX, e.clientY) }
function onMouseUp()    { mDown = false }
function onMouseLeave() { mX = -9999; mY = -9999; mDown = false }

function onTouchStart(e) {
  mDown = true
  ;[mX, mY] = toCanvasXY(e.touches[0].clientX, e.touches[0].clientY)
}
function onTouchMove(e) {
  ;[mX, mY] = toCanvasXY(e.touches[0].clientX, e.touches[0].clientY)
}
function onTouchEnd() { mDown = false; mX = -9999; mY = -9999 }

// ─── Lifecycle ───────────────────────────────────────────
function resize() {
  const cv = canvasRef.value
  if (!cv) return
  const rect = cv.getBoundingClientRect()
  dpr = window.devicePixelRatio || 1
  W = rect.width; H = rect.height
  cv.width  = Math.floor(W * dpr)
  cv.height = Math.floor(H * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  // Fill with mode bg color
  const m = MODES[modeIdx.value]
  ctx.fillStyle = `rgb(${m.bg.join(',')})`
  ctx.fillRect(0, 0, W, H)
  initParticles()
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d', { alpha: false })
  resize()
  window.addEventListener('resize', resize)
  loop()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.ff-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #030510;
  font-family: 'STSong', 'SimSun', serif;
}

.ff-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.ff-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

/* ─── Header ─── */
.ff-header {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  pointer-events: none;
}
.ff-title {
  color: #ffffff;
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 10px;
  margin: 0;
  text-shadow: 0 0 18px rgba(80,160,255,0.8), 0 0 40px rgba(80,160,255,0.3);
}
.ff-sub {
  color: rgba(140,190,255,0.55);
  font-size: 10.5px;
  letter-spacing: 3px;
  margin: 5px 0 0;
  font-family: monospace;
}

/* ─── Oracle Hub ─── */
.oracle-hub {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.hub-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(120, 190, 255, 0.35);
}
.r1 { width: 70px; height: 70px; animation: hSpin 15s linear infinite; }
.r2 { width: 50px; height: 50px; animation: hSpin 10s linear infinite reverse; border-style: dashed; }
.r3 { width: 32px; height: 32px; animation: hSpin  7s linear infinite; border-color: rgba(120,200,255,0.6); }
@keyframes hSpin { 100% { transform: rotate(360deg); } }

.hub-core {
  font-size: 20px;
  color: #fff;
  text-shadow: 0 0 10px rgba(120,200,255,0.9), 0 0 30px rgba(80,150,255,0.5);
  z-index: 1;
  user-select: none;
  animation: corePulse 4s ease-in-out infinite;
}
@keyframes corePulse {
  0%,100% { text-shadow: 0 0 10px rgba(120,200,255,0.8); }
  50%      { text-shadow: 0 0 24px rgba(140,220,255,1), 0 0 55px rgba(60,140,255,0.6); }
}
.oracle-hub.spinning .hub-core {
  animation: coreActive 0.4s ease-in-out infinite;
}
@keyframes coreActive {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.25); }
}

/* ─── Mode bar ─── */
.mode-bar {
  position: absolute;
  right: 18px;
  bottom: 56px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.mode-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  padding: 0;
}
.mode-dot:hover { transform: scale(1.25); }
.mode-dot.active {
  border-color: rgba(255,255,255,0.8);
  transform: scale(1.35);
  box-shadow: 0 0 8px currentColor;
}

/* ─── Oracle Card ─── */
.ora-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  width: min(88vw, 360px);
  border: 1px solid;
  border-radius: 14px;
  padding: 28px 24px 22px;
  text-align: center;
  backdrop-filter: blur(24px);
}
.ora-gua {
  font-size: 56px;
  color: #aaddff;
  text-shadow: 0 0 20px rgba(120,200,255,0.7);
  margin-bottom: 6px;
  line-height: 1;
}
.ora-name {
  font-size: 19px;
  font-weight: bold;
  color: #fff;
  letter-spacing: 4px;
  margin-bottom: 14px;
  text-shadow: 0 0 12px rgba(120,200,255,0.5);
}
.ora-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(120,200,255,0.3), transparent);
  margin-bottom: 14px;
}
.ora-poem {
  font-size: 13px;
  color: #88aaee;
  font-style: italic;
  letter-spacing: 1.5px;
  margin-bottom: 14px;
}
.ora-text {
  font-size: 12px;
  color: rgba(180, 205, 245, 0.8);
  line-height: 1.9;
  margin-bottom: 18px;
}
.ora-close {
  background: rgba(120, 190, 255, 0.1);
  border: 1px solid rgba(120, 190, 255, 0.35);
  color: #99bbdd;
  padding: 7px 26px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 2px;
  font-family: inherit;
  transition: all 0.2s;
}
.ora-close:hover {
  background: rgba(120, 190, 255, 0.2);
  color: #fff;
  box-shadow: 0 0 12px rgba(120,190,255,0.25);
}

/* ─── Hint ─── */
.ff-hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  color: rgba(140, 175, 220, 0.35);
  font-size: 10px;
  letter-spacing: 1.5px;
  white-space: nowrap;
  font-family: monospace;
  pointer-events: none;
}

/* ─── Transitions ─── */
.ora-enter-active { transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
.ora-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.ora-enter-from   { opacity: 0; transform: translate(-50%, calc(-50% + 24px)) scale(0.94); }
.ora-leave-to     { opacity: 0; transform: translate(-50%, calc(-50% - 18px)) scale(0.97); }

@media (max-width: 480px) {
  .ff-title { font-size: 20px; letter-spacing: 6px; }
  .ff-hint  { font-size: 9px; letter-spacing: 0.8px; }
  .ora-gua  { font-size: 44px; }
}
</style>
