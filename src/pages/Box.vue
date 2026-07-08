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
            <span class="help-popup-content">每日一抽，查看今日运势（仅供娱乐）

如何使用：
点击按钮或拉动摇杆，抽出今日运势~
【手势】：开启手势后，在镜头前【上下挥动手掌】，即可抽取运势。【握拳】可重新抽取。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">今日运势</div>
      <div class="page-subtitle">旦暮一签，吉凶自见</div>

      <div class="slot-machine"
        @touchstart.passive="onSlotTouchStart" @touchend.passive="onSlotTouchEnd"
        @mousedown="onSlotMouseDown" @mouseup="onSlotMouseUp" @mouseleave="onSlotMouseUp"
        style="cursor:grab">
        <div class="slot-window">
          <div v-for="(emoji, i) in slotEmojis" :key="i" class="slot-col">
            <div class="slot-item"><span class="slot-emoji">{{ emoji }}</span></div>
          </div>
        </div>
      </div>

      <button class="btn-gold" @click="spin" :disabled="spinning">
        {{ spinning ? '运势揭晓中...' : '测今日运势' }}
      </button>

      <div class="hint-text">
        <span class="hint-icon">💡</span><span>向上滑动启动老虎机</span>
      </div>

      <Transition name="slide-fade">
        <div v-if="showResult" class="result-box">
          <div class="fortune-header">
            <span class="fortune-emoji">{{ resultFortune.emoji }}</span>
            <span class="fortune-label">{{ resultFortune.label }}</span>
          </div>
          <div class="fortune-desc">{{ resultFortune.desc }}</div>
          <div class="lucky-grid">
            <div v-for="d in luckyDetails" :key="d.item" class="lucky-item">
              <div class="lucky-name" :style="`color:${d.color}`">{{ d.item }}</div>
              <div class="lucky-stars">{{ d.level }}</div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <div style="height:0px"></div>
  </div>
</template>

<script setup>
import { helpCurtainBeforeEnter, helpCurtainEnter, helpCurtainLeave } from '../composables/useCurtainMotion.js'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { play, playLoop, stop } from '../sound.js'

const themeStyle = computed(() => store.getThemeStyle())
const showHelpPopup = ref(false)

// --- swipe-up on slot machine (mouse/touch) ---
let _smStartY = null
let _smStartT = 0
let _smMouseDown = false

function tryStartSpin(endY) {
  if (_smStartY === null) return
  const totalDy = _smStartY - endY
  const elapsed = Math.max((Date.now() - _smStartT) / 1000, 0.03)
  const speedY = totalDy / elapsed
  // Similar to dice: small threshold + enough speed
  if (totalDy > 20 && speedY > 150) spin()
  _smStartY = null
}

function onSlotTouchStart(e) {
  if (spinning.value) return
  const t = e.touches?.[0]
  if (!t) return
  _smStartY = t.clientY
  _smStartT = Date.now()
}
function onSlotTouchEnd(e) {
  if (_smStartY === null) return
  const t = e.changedTouches?.[0]
  if (!t) { _smStartY = null; return }
  tryStartSpin(t.clientY)
}
function onSlotMouseDown(e) {
  if (spinning.value) return
  _smMouseDown = true
  _smStartY = e.clientY
  _smStartT = Date.now()
}
function onSlotMouseUp(e) {
  if (!_smMouseDown) return
  _smMouseDown = false
  tryStartSpin(e.clientY)
}

function reset() {
  showResult.value = false
  slotEmojis.value = ['🔮', '🔮', '🔮']
}

function handleGesture(e) {
  if (e.detail.type === 'swipe-up' || e.detail.type === 'vertical-swipe') {
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
})

onUnmounted(() => {
  document.removeEventListener('gesture-trigger', handleGesture)
  document.removeEventListener('gesture-click', handleGestureClick)
})
const spinning = ref(false)
const showResult = ref(false)
const slotEmojis = ref(['🔮', '🔮', '🔮'])
const resultFortune = ref(null)
const luckyDetails = ref([])

const FORTUNE_ITEMS = [
  { emoji: '🌟', label: '大吉', desc: '万事亨通，心想事成', star: { career: '★★★★★', love: '★★★★★', money: '★★★★★', study: '★★★★★', health: '★★★★★', social: '★★★★★' } },
  { emoji: '✨', label: '上吉', desc: '贵人相助，诸事顺遂', star: { career: '★★★★☆', love: '★★★★☆', money: '★★★★☆', study: '★★★★☆', health: '★★★★☆', social: '★★★★★' } },
  { emoji: '🍀', label: '中吉', desc: '稳步前行，渐入佳境', star: { career: '★★★☆☆', love: '★★★☆☆', money: '★★★☆☆', study: '★★★★☆', health: '★★★★☆', social: '★★★☆☆' } },
  { emoji: '🌸', label: '小吉', desc: '小有所获，知足常乐', star: { career: '★★★☆☆', love: '★★★★☆', money: '★★★☆☆', study: '★★★☆☆', health: '★★★★☆', social: '★★★☆☆' } },
  { emoji: '☁️', label: '平',   desc: '平淡是福，顺其自然', star: { career: '★★★☆☆', love: '★★★☆☆', money: '★★★☆☆', study: '★★★☆☆', health: '★★★☆☆', social: '★★★☆☆' } },
  { emoji: '🌧', label: '末吉', desc: '先苦后甜，守得云开', star: { career: '★★☆☆☆', love: '★★★☆☆', money: '★★☆☆☆', study: '★★★☆☆', health: '★★★☆☆', social: '★★☆☆☆' } },
  { emoji: '💫', label: '小凶', desc: '谨慎行事，避免冲动', star: { career: '★★☆☆☆', love: '★★★☆☆', money: '★★☆☆☆', study: '★★★☆☆', health: '★★★☆☆', social: '★★☆☆☆' } },
  { emoji: '🌙', label: '凶',   desc: '韬光养晦，静待时机', star: { career: '★☆☆☆☆', love: '★★☆☆☆', money: '★☆☆☆☆', study: '★★☆☆☆', health: '★★★☆☆', social: '★☆☆☆☆' } },
]
const FORTUNE_WEIGHTS = [5, 12, 20, 24, 22, 13, 2.5, 0.5]
const FORTUNE_TOTAL = FORTUNE_WEIGHTS.reduce((a, b) => a + b, 0)
const LUCKY_COLORS = ['#D4A853', '#E88D6D', '#6DBFB8', '#7BA7D4', '#A48BCA', '#E8965A']
const LUCKY_ITEMS = ['事业', '感情', '财运', '学业', '健康', '人际']
const LUCKY_LEVELS = ['★★★★★', '★★★★☆', '★★★☆☆', '★★☆☆☆', '★☆☆☆☆']

function weightedIdx() {
  let r = Math.random() * FORTUNE_TOTAL
  for (let i = 0; i < FORTUNE_WEIGHTS.length; i++) {
    r -= FORTUNE_WEIGHTS[i]
    if (r < 0) return i
  }
  return FORTUNE_WEIGHTS.length - 1
}

function spin() {
  if (spinning.value) return
  playLoop('wheelSpin')
  spinning.value = true
  showResult.value = false
  const resultIdx = weightedIdx()
  let col0 = 0, col1 = 0, col2 = 0, frame = 0
  const totalFrames = 40

  function animate() {
    frame++
    if (frame <= totalFrames) {
      col0 = (col0 + 1) % FORTUNE_ITEMS.length
      if (frame % 2 === 0) col1 = (col1 + 1) % FORTUNE_ITEMS.length
      if (frame % 3 === 0) col2 = (col2 + 1) % FORTUNE_ITEMS.length
    }
    if (frame > totalFrames - 10) col0 = resultIdx
    if (frame > totalFrames - 5) col1 = resultIdx
    if (frame >= totalFrames) col2 = resultIdx
    slotEmojis.value = [FORTUNE_ITEMS[col0].emoji, FORTUNE_ITEMS[col1].emoji, FORTUNE_ITEMS[col2].emoji]
    if (frame < totalFrames) {
      setTimeout(animate, 60 + frame * 2)
    } else {
      showResult.value = false
      stop('wheelSpin')
      play('cardReveal')
      const fortune = FORTUNE_ITEMS[resultIdx]
      const starKeys = ['career', 'love', 'money', 'study', 'health', 'social']
      luckyDetails.value = LUCKY_ITEMS.map((item, i) => ({
        item, color: LUCKY_COLORS[i],
        level: fortune.star[starKeys[i]],
      }))
      resultFortune.value = fortune
      spinning.value = false
      showResult.value = true
      store.saveHistory('🔮 今日运势', fortune.label, fortune.desc)
    }
  }
  animate()
}
</script>

<style scoped>
.slot-machine {
  height: 190px;
  background: var(--primary-light) !important;
  border-radius: 10px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.slot-window { display: flex; justify-content: center; gap: 14px; }
.slot-col {
  width: 90px; height: 90px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.13);
  display: flex; align-items: center; justify-content: center;
}
.slot-emoji { font-size: 42px; }
.fortune-header {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; margin-bottom: 6px;
}
.fortune-emoji { font-size: 24px; }
.fortune-label { font-size: 20px; font-weight: bold; color: var(--primary); }
.fortune-desc { text-align: center; font-size: 14px; color: #666; margin-bottom: 12px; }
.lucky-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.lucky-item {
  background: #F9F9FB; border-radius: 6px;
  padding: 8px 6px; text-align: center;
  border: 1px solid #F0F0F2;
}
.lucky-name { font-size: 12px; font-weight: bold; margin-bottom: 3px; }
.lucky-stars { font-size: 10px; color: var(--primary); }
@media (min-width: 768px) {
  .slot-machine { height: 300px; }
  .slot-col { width: 115px; height: 115px; border-radius: 18px; }
  .slot-emoji { font-size: 56px; }
}
@media (min-width: 1200px) {
  .slot-machine { height: 380px; }
  .slot-col { width: 140px; height: 140px; }
  .slot-emoji { font-size: 68px; }
}

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
