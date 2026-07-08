<template>
  <div class="container" :style="themeStyle">
    <div class="top-slogan">把纠结交给随机，把勇气留给自己</div>
    <div class="main-card">
      <button class="gesture-btn" :class="{ 'active': store.isGesture }" @click="store.setGesture(!store.isGesture)">手势</button>
      <button class="help-btn" @click="showHelpPopup = true">?</button>
      <Transition :css="false" @before-enter="helpCurtainBeforeEnter" @enter="helpCurtainEnter" @leave="helpCurtainLeave">
        <div v-if="showHelpPopup" class="help-mask" @click.self="showHelpPopup = false">
          <div class="help-popup">
            <div class="help-popup-close" @click="showHelpPopup = false">×</div>
            <div class="help-popup-title">使用说明</div>
            <span class="help-popup-content">n选一场景，更实用，快速帮你做决定！

转盘是帮助用户在多个选项中做出选择的工具，适合解决"吃什么"、"谁来做"等选择困难问题。

如何使用：
在输入栏输入选项，点击添加按钮添加选项。
点击选项标签，可以修改选项名称。
【手势】：开启手势后，在镜头前【上下挥动手掌】，即可转动转盘。【握拳】可重新开始。
</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">命运转盘</div>
      <div class="page-subtitle">转盘随心止，所指即是缘</div>
      <div class="add-row">
        <input class="input-field add-input" placeholder="输入新选项" v-model="inputVal" @keyup.enter="addOption" />
        <button class="btn-add" @click="addOption">添加</button>
      </div>
      <div class="option-list">
        <div v-for="(opt, idx) in options" :key="idx" class="option-tag" :style="'background:'+opt.color">
          <template v-if="editingIndex === idx">
            <input class="opt-edit-input" v-model="editingVal" @keyup.enter="confirmEdit" @blur="confirmEdit" :style="opt.textWhite?'color:#fff':'color:#333'" />
            <span class="opt-ok" @click.stop="confirmEdit" :style="opt.textWhite?'color:rgba(255,255,255,0.9)':'color:#333'">✓</span>
          </template>
          <template v-else>
            <span class="opt-label" :style="opt.textWhite?'color:#fff':'color:#333'" @click="tapOption(idx)">{{ opt.label }}</span>
          </template>
          <span class="opt-del" @click.stop="removeOption(idx)" :style="opt.textWhite?'color:rgba(255,255,255,0.7)':'color:rgba(0,0,0,0.35)'">×</span>
        </div>
      </div>
      <div class="wheel-wrap"
        @touchstart.passive="onWheelTouchStart" @touchmove.passive="onWheelTouchMove" @touchend="onWheelTouchEnd"
        @mousedown.prevent="onWheelMouseDown" @mousemove="onWheelMouseMove" @mouseup="onWheelMouseUp" @mouseleave="onWheelMouseUp">
        <canvas ref="canvasRef" class="wheel-canvas"></canvas>
      </div>
      <button class="btn-gold" @click="spin" :disabled="spinning || options.length < 2">
        {{ spinning ? '转动中...' : '转动' }}
      </button>
      <div class="hint-text">
        <span class="hint-icon">💡</span><span>向上或向下滑动转盘 / 点击按钮开始转动</span>
      </div>
      <Transition name="slide-fade">
        <div v-if="showResult" class="result-box">
          <div class="result-title">🎯 {{ result }}</div>
        </div>
      </Transition>
    </div>
    <div style="height:0px"></div>
  </div>
</template>

<script setup>
import { helpCurtainBeforeEnter, helpCurtainEnter, helpCurtainLeave } from '../composables/useCurtainMotion.js'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store } from '../store.js'
import { playLoop, stop, play } from '../sound.js'
import { THEMES } from '../theme.js'

const themeStyle = computed(() => store.getThemeStyle())
const canvasRef = ref(null)
const showHelpPopup = ref(false)
const spinning = ref(false)
const showResult = ref(false)
const result = ref('')
const inputVal = ref('')
const editingIndex = ref(-1)
const editingVal = ref('')

const COLOR_KEYS = ['primary', 'primaryLight', 'primaryDark']
function buildOptions(labels) {
  const t = THEMES[store.themeKey || 'jin']
  return labels.map((label, i) => {
    const colorKey = COLOR_KEYS[i % COLOR_KEYS.length]
    return { label, color: t[colorKey], colorKey, textWhite: colorKey === 'primaryDark' }
  })
}
const options = ref(buildOptions(['选项一', '选项二', '选项三', '选项四']))

watch(() => store.themeKey, newKey => {
  const t = THEMES[newKey || 'jin']
  options.value = options.value.map(o => ({ ...o, color: t[o.colorKey] }))
  drawWheel(currentAngle)
  themeShadow = t.primaryShadow
  themePrimary = t.primary
})

let ctx = null, W = 280, currentAngle = 0, animFrame = null, touching = false
let angularVelocity = 0, lastTouchAngle = 0, canvasRect = null
let themeShadow = 'rgba(218,171,90,0.30)', themePrimary = '#D4A853'

function reset() {
  showResult.value = false
}

function handleGesture(e) {
  if (e.detail.type === 'vertical-swipe') {
    if (showResult.value) return
    spin()
  }
}

function handleGestureClick(e) {
  if (showResult.value && e.detail.state === 'fist' && !spinning.value) {
    reset()
  }
}

onMounted(() => {
  document.addEventListener('gesture-trigger', handleGesture)
  document.addEventListener('gesture-click', handleGestureClick)
  const cv = canvasRef.value
  const rect = cv.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 2
  const w = rect.width
  cv.width = w * dpr; cv.height = w * dpr
  ctx = cv.getContext('2d'); ctx.scale(dpr, dpr)
  W = w; canvasRect = rect
  const t = THEMES[store.themeKey || 'jin']
  themeShadow = t.primaryShadow; themePrimary = t.primary
  drawWheel(0)
})
onUnmounted(() => {
  document.removeEventListener('gesture-trigger', handleGesture)
  document.removeEventListener('gesture-click', handleGestureClick)
  if (animFrame) cancelAnimationFrame(animFrame)
})

function getTouchAngle(clientX, clientY) {
  if (!canvasRect) return 0
  const rect = canvasRef.value.getBoundingClientRect()
  canvasRect = rect
  const cx = W / 2, cy = W / 2
  return Math.atan2(clientY - rect.top - cy, clientX - rect.left - cx) * 180 / Math.PI
}
function onWheelTouchStart(e) {
  if (spinning.value) return
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null }
  touching = true; angularVelocity = 0
  lastTouchAngle = getTouchAngle(e.touches[0].clientX, e.touches[0].clientY)
}
function onWheelTouchMove(e) {
  if (!touching || spinning.value) return
  const angle = getTouchAngle(e.touches[0].clientX, e.touches[0].clientY)
  const delta = angle - lastTouchAngle
  const clamped = Math.abs(delta) > 180 ? 0 : delta
  currentAngle += clamped; angularVelocity = clamped; lastTouchAngle = angle
  drawWheel(currentAngle)
}
function onWheelTouchEnd() {
  if (!touching) return
  touching = false
  if (Math.abs(angularVelocity) > 2) startInertia()
}
let isMouseDragging = false
function onWheelMouseDown(e) { isMouseDragging = true; onWheelTouchStart({ touches: [{ clientX: e.clientX, clientY: e.clientY }] }) }
function onWheelMouseMove(e) { if (!isMouseDragging) return; onWheelTouchMove({ touches: [{ clientX: e.clientX, clientY: e.clientY }] }) }
function onWheelMouseUp() { if (!isMouseDragging) return; isMouseDragging = false; onWheelTouchEnd() }
function startInertia() {
  let velocity = angularVelocity * 8
  playLoop('wheelSpin'); spinning.value = true; showResult.value = false
  function decelerate() {
    velocity *= 0.97; currentAngle += velocity; drawWheel(currentAngle)
    if (Math.abs(velocity) > 0.3) { animFrame = requestAnimationFrame(decelerate) }
    else { animFrame = null; finishHandSpin() }
  }
  decelerate()
}
function finishHandSpin() {
  stop('wheelSpin'); play('cardReveal')
  const n = options.value.length; if (n === 0) { spinning.value = false; return }
  const sliceAngle = 360 / n
  const normalized = ((270 - currentAngle) % 360 + 360) % 360
  const idx = Math.floor(normalized / sliceAngle) % n
  result.value = options.value[idx].label
  spinning.value = false; showResult.value = true
  store.saveHistory('🛞 命运转盘', result.value, options.value.map(o => o.label).join('、'))
}
function spin() {
  if (spinning.value || options.value.length < 2) return
  if (animFrame) cancelAnimationFrame(animFrame)
  playLoop('wheelSpin'); spinning.value = true; showResult.value = false
  const MIN_SPINS = 5, n = options.value.length
  const targetIdx = Math.floor(Math.random() * n), sliceAngle = 360 / n
  const jitter = (Math.random() - 0.5) * sliceAngle * 0.6
  const startAngle = currentAngle
  const pointerTarget = 270 - targetIdx * sliceAngle - sliceAngle / 2 + jitter
  const startMod = ((startAngle % 360) + 360) % 360
  const targetMod = ((pointerTarget % 360) + 360) % 360
  const smallDelta = ((targetMod - startMod) + 360) % 360
  const totalDelta = MIN_SPINS * 360 + smallDelta
  const duration = 3500 + Math.random() * 800
  const startTime = performance.now()
  function animLoop(now) {
    const elapsed = now - startTime, progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 4)
    currentAngle = startAngle + eased * totalDelta; drawWheel(currentAngle)
    if (progress < 1) { animFrame = requestAnimationFrame(animLoop) }
    else { finishSpin(targetIdx) }
  }
  animFrame = requestAnimationFrame(animLoop)
}
function finishSpin(idx) {
  stop('wheelSpin'); play('cardReveal')
  result.value = options.value[idx].label; spinning.value = false; showResult.value = true
  store.saveHistory('🎡 命运转盘', result.value, options.value.map(o => o.label).join('、'))
}

function drawWheel(angleDeg) {
  if (!ctx) return
  const cx = W / 2, cy = W / 2, R = W / 2 - 12, smallR = W * 0.08
  const opts = options.value, n = opts.length
  if (n === 0) return
  ctx.clearRect(0, 0, W, W)
  ctx.save(); ctx.shadowColor = themeShadow; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5
  ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.restore()
  ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3; ctx.stroke()
  const sliceAngle = (Math.PI * 2) / n, startRad = angleDeg * Math.PI / 180
  for (let i = 0; i < n; i++) {
    const start = startRad + i * sliceAngle, end = start + sliceAngle, mid = start + sliceAngle / 2
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, end); ctx.closePath()
    ctx.fillStyle = opts[i].color; ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(start) * R, cy + Math.sin(start) * R)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 5; ctx.stroke()
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(mid); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = opts[i].textWhite ? '#FFF' : '#333'
    ctx.font = `bold ${Math.max(W * 0.042, 11)}px sans-serif`
    const label = opts[i].label; ctx.fillText(label.length > 4 ? label.slice(0, 4) + '…' : label, R * 0.62, 0)
    ctx.restore(); ctx.restore()
  }
  const pTipY = cy - smallR - 10, pBaseY = cy - smallR + 7
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1
  ctx.beginPath(); ctx.moveTo(cx, pTipY); ctx.lineTo(cx - 9, pBaseY); ctx.lineTo(cx + 9, pBaseY); ctx.closePath()
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = themePrimary; ctx.lineWidth = 1; ctx.stroke(); ctx.restore()
  ctx.save(); ctx.shadowColor = themeShadow; ctx.shadowBlur = 20; ctx.shadowOffsetY = 5
  ctx.beginPath(); ctx.arc(cx, cy, smallR, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.restore()
}

function addOption() {
  const label = inputVal.value.trim(); if (!label) return
  if (options.value.length >= 8) { alert('最多8个选项'); return }
  const colorKey = COLOR_KEYS[options.value.length % COLOR_KEYS.length]
  const t = THEMES[store.themeKey || 'jin']
  options.value = [...options.value, { label, color: t[colorKey], colorKey, textWhite: colorKey === 'primaryDark' }]
  inputVal.value = ''; drawWheel(currentAngle)
}
function removeOption(idx) {
  if (options.value.length <= 1) return
  const o = [...options.value]; o.splice(idx, 1); options.value = o; editingIndex.value = -1; drawWheel(currentAngle)
}
function tapOption(idx) {
  editingIndex.value = idx; editingVal.value = options.value[idx].label
}
function confirmEdit() {
  if (editingIndex.value < 0 || !editingVal.value.trim()) { editingIndex.value = -1; return }
  const o = [...options.value]; o[editingIndex.value] = { ...o[editingIndex.value], label: editingVal.value.trim() }
  options.value = o; editingIndex.value = -1; editingVal.value = ''; drawWheel(currentAngle)
}
function cancelEdit() { editingIndex.value = -1; editingVal.value = '' }
</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }
.wheel-wrap { display: flex; justify-content: center; align-items: center; background: var(--primary-light); border-radius: 10px; overflow: hidden; padding: 20px 0; margin-bottom: 8px; cursor: grab; }
.wheel-wrap:active { cursor: grabbing; }
.wheel-canvas { width: 260px; height: 260px; border-radius: 50%; }
.option-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.option-tag { display: flex; align-items: center; padding: 4px 8px; border-radius: 12px; font-size: 12px; cursor: pointer; gap: 4px; }
.opt-del { color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1; }
.add-row { display: flex; gap: 6px; margin-bottom: 6px; }
.add-input { flex: 1; }
.btn-add { padding: 0 14px; background: var(--primary); color: #fff; border: none; border-radius: 10px; font-size: 14px; cursor: pointer; min-height: 36px; white-space: nowrap; }
.opt-edit-input { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.8); outline: none; font-size: 12px; color: inherit; width: 60px; padding: 0 2px; }
.opt-ok { font-size: 12px; line-height: 1; cursor: pointer; margin-left: 2px; }

/* ── [VUE AI 占卜大美化包] ── */

/* 1. 结果框美化 (适用于 qian-result, result-box, result-detail 等各种结果形态) */
.qian-result, .result-box, .result-detail, .hex-display {
  background: var(--bg-color-2, #FCFCF9) !important;
  background-image: radial-gradient(rgba(var(--primary-rgb), 0.03) 1px, transparent 0) !important;
  background-size: 8px 8px !important;
  border: 1px dashed var(--primary) !important;
  outline: 4px solid rgba(var(--primary-rgb), 0.06) !important;
  border-radius: 8px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(var(--primary-rgb), 0.05) !important;
  position: relative !important;
  overflow: hidden !important;
  padding: 16px !important;
}

/* 2. 输入框美化 (获取焦点边框变粗高亮) */
.input-field {
  transition: border-width 0.2s, border-color 0.25s, box-shadow 0.25s !important;
}
.input-field:focus {
  border-width: 2px !important;
  border-color: var(--primary) !important;
  box-shadow: 0 4px 12px var(--primary-shadow) !important;
  outline: none !important;
}
.input-field::placeholder {
  color: #9E9EAA !important;
  font-style: italic !important;
  font-size: 13px !important;
  letter-spacing: 0.5px !important;
}

/* 3. 黄金按钮洗炼：金流光 + 弹性物理触觉微动 */
.btn-gold {
  position: relative !important;
  overflow: hidden !important;
  width: 100% !important;
  height: 44px !important;
  border-radius: 22px !important;
  font-size: 14.5px !important;
  font-weight: 600 !important;
  letter-spacing: 1.5px !important;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
  box-shadow: 0 4px 12px var(--primary-shadow) !important;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  outline: none !important;
  user-select: none !important;
}








.btn-gold:hover:not(:disabled) {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px var(--primary-shadow) !important;
  filter: brightness(1.04) !important;
}

.btn-gold:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.965) !important;
  box-shadow: 0 2px 6px var(--primary-shadow) !important;
  transition: transform 0.08s ease-out !important;
}

.btn-gold:disabled {
  opacity: 0.65 !important;
  cursor: not-allowed !important;
  background: #D5D5DA !important;
  box-shadow: none !important;
}

/* 4. 统一的 Vue 3 slide-fade 结果卡片滑落效果 */
.slide-fade-enter-active {
  transition: all 0.65s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.7, 0, 0.84, 0) !important;
}
.slide-fade-enter-from {
  opacity: 0 !important;
  transform: translateY(-20px) scale(0.97) !important;
}
.slide-fade-leave-to {
  opacity: 0 !important;
  transform: translateY(10px) scale(0.97) !important;
}

</style>
