<template>
  <div class="zen-container">
    <!-- Xuan Paper Textured Background -->
    <div class="xuan-paper-overlay"></div>

    <!-- Background Ink wash and mountains landscape -->
    <div class="landscape-bg">
      <div class="mountain mt-1"></div>
      <div class="mountain mt-2"></div>
      <div class="mountain mt-3"></div>
    </div>

    <!-- Active dynamic canvas for real-time ink bleeding, splash and glitters -->
    <canvas ref="canvasRef" class="ink-canvas"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"></canvas>

    <div class="header">
      <router-link to="/" class="back-btn">← 归去</router-link>
      <h1 class="title">泼墨意象 · 禅意乾坤</h1>
      <p class="subtitle">实时物理渲染泼墨晕染、泥金溅射与八卦天星图</p>
    </div>

    <!-- Main interactive center disk -->
    <div class="dial-wrap" :class="{ 'is-spinning': spinning }">
      <div class="zen-dial-container" @click="triggerDivination">
        <div class="outer-starmap"></div>
        <div class="middle-bagua"></div>
        <div class="center-taiji">☯</div>
      </div>
      <div class="dial-hint">← 泼墨划过宣纸积蓄灵气，点击太极八卦星盘破局 →</div>
    </div>

    <!-- Luminous divination text overlays -->
    <Transition name="fade">
      <div v-if="showingHex" class="oracle-scroll">
        <div class="scroll-border"></div>
        <div class="oracle-name">{{ currentOracle.name }}</div>
        <div class="oracle-poem">{{ currentOracle.poem }}</div>
        <div class="oracle-meaning">{{ currentOracle.meaning }}</div>
      </div>
    </Transition>

    <!-- Tech specs footer -->
    <div class="zen-specs">
      <div class="spec-item"><span class="spec-label">意境:</span> HTML5 2D Canvas 实时粒子晕染</div>
      <div class="spec-item"><span class="spec-label">墨法:</span> 半透明多叠合成、径向高斯物理虚化</div>
      <div class="spec-item"><span class="spec-label">金法:</span> 随机动能洒金（泥金工艺）</div>
      <div class="spec-item"><span class="spec-label">演数:</span> 伏羲先天八卦・易数神示</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { play } from '../sound.js'

const canvasRef = ref(null)

// --- Interaction & State ---
const spinning = ref(false)
const showingHex = ref(false)
const currentOracle = ref({ name: '', poem: '', meaning: '' })

// 8 Trigram Oracles
const ORACLES = [
  { name: '乾为天 (大吉)', poem: '天行健，君子以自强不息', meaning: '刚健中正，大业蓬勃。象征着浩然正气，如红日东升，锐意进取必有大成。' },
  { name: '坤为地 (上吉)', poem: '地势坤，君子以厚德载物', meaning: '柔顺包容，广纳川流。象征温和稳健，以博大胸怀蓄势待发，静候丰收。' },
  { name: '离为火 (中吉)', poem: '柔丽乎中正，重明以丽乎正', meaning: '光明附丽，如火熊熊。代表智慧照耀，展现才华的最佳时机，前途一片光明。' },
  { name: '坎为水 (平吉)', poem: '水洊至，习坎。君子以常德行', meaning: '行险守正，川流不息。面对险阻仍需心怀正道，坚韧不拔，自能化险为夷。' },
  { name: '巽为风 (小吉)', poem: '随风巽，君子以申命行事', meaning: '顺风而行，谦逊渗透。适合虚心听取建议，顺势而为，润物细无声。' },
  { name: '震为雷 (平)', poem: '洊雷震，君子以恐惧修省', meaning: '雷声隆隆，震惊百里。虽有突发震动或变故，但只需心存敬畏、反省自身，自无忧。' },
  { name: '艮为山 (平)', poem: '兼山艮，君子以思不出其位', meaning: '动静得宜，止其所当止。面对困局，当安守本分，韬光养晦，不轻举妄动。' },
  { name: '兑为泽 (中吉)', poem: '丽泽兑，君子以朋友讲习', meaning: '欢欣和悦，润泽万物。利于团队交流、合作商谈，展现亲和力，喜悦降临。' }
]

// --- Canvas Ink Wash & Gold Leaf Physics Particle System ---
let ctx = null
let rafId = null
const particles = []

// Mouse trail vectors
let lastX = 0, lastY = 0
let isDrawing = false

function initInkPhysics(cv) {
  ctx = cv.getContext('2d')

  const resize = () => {
    cv.width = window.innerWidth
    cv.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // Particle updates loop
  function loop() {
    // 💡 宣纸呼吸式微渗法：不直接用 clearRect，而是每帧平铺超高透明度的“淡黄纸白色”
    // 使得墨迹随时间自然“变干、渗透、淡化、融入纸张”，空气感惊艳！
    ctx.fillStyle = 'rgba(250, 246, 237, 0.08)'
    ctx.fillRect(0, 0, cv.width, cv.height)

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= p.drag
      p.vy *= p.drag
      p.size += p.growth // Ink spreads outwards!

      if (p.type === 'ink') {
        // 💡 泼墨：高斯物理虚化，重叠形成多阶墨晕，韵味无穷
        const grad = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size)
        grad.addColorStop(0, `rgba(${p.color}, ${p.alpha})`)
        grad.addColorStop(0.3, `rgba(${p.color}, ${p.alpha * 0.6})`)
        grad.addColorStop(1, `rgba(${p.color}, 0.0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        p.alpha -= 0.0035 // Fade out gradually
      } else {
        // 💡 泥金：高亮度微粒喷溅效果，金属光泽亮眼
        ctx.fillStyle = `rgba(218, 168, 83, ${p.alpha})`
        ctx.shadowColor = 'rgba(218, 168, 83, 0.5)'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0 // restore

        p.alpha -= 0.008
      }

      // Garbage collection of dead ink particles
      if (p.alpha <= 0.01 || p.size <= 0.1) {
        particles.splice(i, 1)
      }
    }

    rafId = requestAnimationFrame(loop)
  }
  loop()

  return () => {
    window.removeEventListener('resize', resize)
  }
}

// Add Ink Wash & Gold splash particles dynamically
function spawnParticles(x, y, speed) {
  // 1. Spawning dark ink wash particles
  const count = Math.min(Math.floor(speed * 1.5) + 1, 8)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const force = Math.random() * speed * 0.25
    particles.push({
      x, y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: Math.random() * 25 + 10,
      growth: Math.random() * 0.4 + 0.1, // ink expands
      alpha: Math.random() * 0.4 + 0.3,
      drag: 0.95,
      color: Math.random() > 0.82 ? '64, 60, 56' : '15, 15, 20', // multi-tone ink!
      type: 'ink'
    })
  }

  // 2. Spawning elegant gold-glitter particles (泥金工艺)
  if (Math.random() > 0.4) {
    const goldCount = Math.floor(Math.random() * 4) + 1
    for (let i = 0; i < goldCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const force = Math.random() * speed * 0.8 + 2
      particles.push({
        x, y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        size: Math.random() * 2.5 + 0.8,
        growth: -0.01,
        alpha: Math.random() * 0.8 + 0.2,
        drag: 0.94,
        type: 'gold'
      })
    }
  }
}

// --- Interactive Trigger ---
function triggerDivination() {
  if (spinning.value) return

  play('diceRoll')
  spinning.value = true
  showingHex.value = false

  // Burst extreme gold splashes upon trigger
  const cv = canvasRef.value
  if (cv) {
    const cx = cv.width / 2
    const cy = cv.height / 2
    for (let i = 0; i < 40; i++) {
      spawnParticles(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 80, Math.random() * 12 + 6)
    }
  }

  setTimeout(() => {
    spinning.value = false
    play('cardReveal')

    // Choose random trigram
    const idx = Math.floor(Math.random() * ORACLES.length)
    currentOracle.value = ORACLES[idx]
    showingHex.value = true
  }, 1800)
}

// --- Event Handlers ---
function onMouseDown(e) {
  isDrawing = true
  const rect = canvasRef.value.getBoundingClientRect()
  lastX = e.clientX - rect.left
  lastY = e.clientY - rect.top
  spawnParticles(lastX, lastY, 8)
}

function onMouseMove(e) {
  if (!isDrawing) return
  const rect = canvasRef.value.getBoundingClientRect()
  const currentX = e.clientX - rect.left
  const currentY = e.clientY - rect.top

  const dx = currentX - lastX
  const dy = currentY - lastY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 3) {
    play('pageTurn') // soft wind sound as ink spreads
    spawnParticles(currentX, currentY, dist)
    lastX = currentX
    lastY = currentY
  }
}

function onMouseUp() {
  isDrawing = false
}

// Mobile
function onTouchStart(e) {
  const t = e.touches[0]
  isDrawing = true
  const rect = canvasRef.value.getBoundingClientRect()
  lastX = t.clientX - rect.left
  lastY = t.clientY - rect.top
  spawnParticles(lastX, lastY, 8)
}

function onTouchMove(e) {
  const t = e.touches[0]
  if (!isDrawing) return
  const rect = canvasRef.value.getBoundingClientRect()
  const currentX = t.clientX - rect.left
  const currentY = t.clientY - rect.top

  const dx = currentX - lastX
  const dy = currentY - lastY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 3) {
    spawnParticles(currentX, currentY, dist)
    lastX = currentX
    lastY = currentY
  }
}

function onTouchEnd() {
  isDrawing = false
}

// Lifecycle
let cleanupInk = null
onMounted(() => {
  if (canvasRef.value) {
    cleanupInk = initInkPhysics(canvasRef.value)
  }
})

onUnmounted(() => {
  if (cleanupInk) cleanupInk()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.zen-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: #faf6ed; /* 💡 宣纸古典底色，温暖古雅 */
  overflow: hidden;
  font-family: 'STSong', 'SimSun', serif;
}

/* 宣纸不规则纤维纹理叠加层 */
.xuan-paper-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.12;
  background-image:
    radial-gradient(circle at 10% 20%, rgba(0,0,0,0.08) 1px, transparent 2px),
    radial-gradient(circle at 80% 60%, rgba(0,0,0,0.06) 1.5px, transparent 3px);
  background-size: 150px 150px;
  filter: contrast(1.1);
}

/* 山峦水墨剪影背景组 */
.landscape-bg {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 38vh;
  z-index: 2;
  pointer-events: none;
  opacity: 0.85;
}
.mountain {
  position: absolute;
  bottom: 0;
  background: linear-gradient(180deg, rgba(30,30,40,0.65) 0%, rgba(250,246,237,1.0) 100%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  filter: blur(1px);
}
.mt-1 { width: 120%; height: 180px; left: -10%; opacity: 0.35; animation: floatMtnA 25s ease-in-out infinite alternate; }
.mt-2 { width: 90%; height: 130px; right: -5%; opacity: 0.45; animation: floatMtnB 32s ease-in-out infinite alternate; }
.mt-3 { width: 70%; height: 95px; left: 15%; opacity: 0.65; }

@keyframes floatMtnA {
  0% { transform: translateY(0) scale(1.0); }
  100% { transform: translateY(8px) scale(1.03); }
}
@keyframes floatMtnB {
  0% { transform: translateY(0) scale(1.0); }
  100% { transform: translateY(6px) scale(0.97); }
}

.ink-canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  cursor: crosshair;
}

.header {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
  pointer-events: auto;
}

.back-btn {
  display: inline-block;
  color: #c49a3c;
  text-decoration: none;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
  padding: 6px 14px;
  border: 1px solid rgba(196, 154, 60, 0.4);
  border-radius: 20px;
  background: rgba(196, 154, 60, 0.05);
  transition: all 0.25s ease;
}
.back-btn:hover {
  background: rgba(196, 154, 60, 0.15);
  transform: translateX(-4px);
  box-shadow: 0 0 10px rgba(196, 154, 60, 0.15);
}

.title {
  color: #2c2c35;
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 3px;
  margin: 0;
  text-shadow: 0 1px 2px rgba(250, 246, 237, 0.8);
}

.subtitle {
  color: #8c8c9a;
  font-size: 11.5px;
  letter-spacing: 1.5px;
  margin: 6px 0 0;
}

/* Center Interactive Dial */
.dial-wrap {
  position: absolute;
  top: 46%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  pointer-events: auto;
}

.zen-dial-container {
  position: relative;
  width: min(78vw, 240px);
  height: min(78vw, 240px);
  border-radius: 50%;
  background: rgba(250, 246, 237, 0.95);
  border: 1.5px solid #dba842;
  box-shadow:
    0 10px 35px rgba(30, 30, 45, 0.08),
    0 2px 6px rgba(219, 168, 66, 0.2),
    inset 0 0 15px rgba(219, 168, 66, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s;
}
.zen-dial-container:hover {
  transform: scale(1.03);
  box-shadow:
    0 15px 40px rgba(30, 30, 45, 0.12),
    0 4px 12px rgba(219, 168, 66, 0.35);
}
.zen-dial-container:active {
  transform: scale(0.97);
}

/* Concentric sacred geom rings */
.outer-starmap, .middle-bagua {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  border: 1px dashed rgba(219, 168, 66, 0.4);
}
.outer-starmap {
  inset: 4px;
  border: 1px double rgba(219, 168, 66, 0.3);
  animation: dialSpinCW 80s linear infinite;
}
.middle-bagua {
  inset: 22px;
  border: 1px dashed rgba(219, 168, 66, 0.55);
  animation: dialSpinCCW 60s linear infinite;
}

@keyframes dialSpinCW { 100% { transform: rotate(360deg); } }
@keyframes dialSpinCCW { 100% { transform: rotate(-360deg); } }

/* Rotating spin class on trigger */
.is-spinning .zen-dial-container {
  animation: triggerSpin 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}
@keyframes triggerSpin {
  0% { transform: rotate(0deg) scale(1.0); }
  60% { transform: rotate(1080deg) scale(1.1); filter: drop-shadow(0 0 15px rgba(219, 168, 66, 0.8)); }
  100% { transform: rotate(1080deg) scale(1.0); }
}

.center-taiji {
  font-size: 84px;
  color: #2c2c35;
  line-height: 1;
  user-select: none;
  animation: taijiPulse 6s ease-in-out infinite;
}
@keyframes taijiPulse {
  0%, 100% { transform: scale(1.0); text-shadow: 0 0 0px transparent; }
  50% { transform: scale(1.04); text-shadow: 0 0 15px rgba(219, 168, 66, 0.4); }
}

.dial-hint {
  color: #c49a3c;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-align: center;
  text-shadow: 0 1px 2px rgba(250,246,237,0.8);
}

/* Divination Scroll Overlay */
.oracle-scroll {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  width: min(88vw, 420px);
  background: rgba(250, 246, 237, 0.98);
  border: 1px solid #dba842;
  border-radius: 8px;
  box-shadow: 0 12px 35px rgba(0,0,0,0.1), 0 0 15px rgba(219,168,66,0.15);
  padding: 16px 20px;
  box-sizing: border-box;
  text-align: center;
  z-index: 10;
  pointer-events: auto;
}
.scroll-border {
  height: 4px;
  border-top: 1px double #dba842;
  border-bottom: 1px double #dba842;
  margin-bottom: 8px;
}
.oracle-name {
  font-size: 18px;
  font-weight: bold;
  color: #2c2c35;
  margin-bottom: 6px;
  letter-spacing: 2px;
}
.oracle-poem {
  font-size: 13.5px;
  font-style: italic;
  color: #c49a3c;
  margin-bottom: 10px;
  letter-spacing: 1.2px;
  font-weight: bold;
}
.oracle-meaning {
  font-size: 11.5px;
  color: #555566;
  line-height: 1.7;
}

/* Footer Specs */
.zen-specs {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.spec-item {
  color: #8c8c9a;
  font-size: 11px;
  letter-spacing: 1.2px;
}
.spec-label {
  color: #c49a3c;
  font-weight: bold;
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s, transform 0.5s; }
.oracle-scroll.fade-enter-from { opacity: 0; transform: translate(-50%, 15px); }
.oracle-scroll.fade-leave-to { opacity: 0; transform: translate(-50%, -15px); }

/* Widescreen Scaling */
@media (min-width: 768px) {
  .title { font-size: 34px; }
  .zen-dial-container {
    width: 300px;
    height: 300px;
  }
  .center-taiji { font-size: 108px; }
  .zen-specs {
    left: auto;
    right: 24px;
    text-align: right;
  }
}
</style>