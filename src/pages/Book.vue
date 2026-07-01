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
            <span class="help-popup-content">如何使用：
1. 心中默念你想问的问题
2. 点击书本图案、左右翻页或「寻求答案」按钮
3. 以开放的心态接受书中的指引

答案之书收录数百条神谕，以随机翻页的方式给予你来自宇宙的提示。左页为英文，右页为中文。答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">答案之书</div>
      <div class="page-subtitle">闭目思纷乱，书翻顿开明</div>

      <input class="input-field" placeholder="输入你想问的问题（可选）" v-model="question" />

      <div class="stage-area"
        @click="ask"
        @touchstart.passive="onSwipeStart" @touchend.passive="onSwipeEnd"
        @mousedown="onMouseDown" @mouseup="onMouseUp" @mouseleave="onMouseUp">
        <!-- 合上的书 -->
        <div class="book-closed-wrap" :class="{ 'book-gone': phase !== 'closed' }">
          <div class="book-closed">
            <div class="book-spine-side"></div>
            <div class="book-cover-area">
              <div class="book-cover-frame">
                <span class="book-cover-title">答案之书</span>
                <span class="book-cover-gem">✦</span>
                <span class="book-cover-sub">The Book of Answers</span>
              </div>
            </div>
            <div class="book-pages-side"></div>
          </div>
        </div>

        <!-- 翻页动画 -->
        <div v-if="phase === 'opening'" class="book-flip-wrap">
          <div class="book-flip">
            <div class="flip-left-bg"></div>
            <div class="flip-spine-bg"></div>
            <div class="flip-right-bg"></div>
            <div class="flip-leaf fl-1"></div>
            <div class="flip-leaf fl-2"></div>
            <div class="flip-leaf fl-3"></div>
            <div class="flip-leaf fl-4"></div>
            <div class="flip-leaf fl-5"></div>
            <div class="flip-leaf fl-6"></div>
          </div>
        </div>

        <!-- 翻开的书 -->
        <div class="book-open-wrap" :class="{ 'book-gone': phase !== 'open' }">
          <div class="book-open">
            <div class="page-left">
              <div class="page-deco-line"></div>
              <span class="page-answer-en">{{ answerEn }}</span>
              <div class="page-deco-line"></div>
            </div>
            <div class="book-center-spine"></div>
            <div class="page-right">
              <div class="page-deco-line"></div>
              <span class="page-answer-zh">{{ answerZh }}</span>
              <div class="page-deco-line"></div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn-gold" @click="ask" :disabled="phase === 'opening'">
        {{ phase === 'opening' ? '翻页中...' : '寻求答案' }}
      </button>
      <div class="hint-text">
        <span class="hint-icon">💡</span>
        <span>左右滑动书本 / 点击按钮翻阅</span>
      </div>
    </div>
    <div style="height:0px"></div>
  </div>
</template>

<script setup>
import { helpCurtainBeforeEnter, helpCurtainEnter, helpCurtainLeave } from '../composables/useCurtainMotion.js'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { play } from '../sound.js'
import ANSWERS from './answers_data.js'

const themeStyle = computed(() => store.getThemeStyle())
const showHelpPopup = ref(false)
const question = ref('')
const answerZh = ref('')
const answerEn = ref('')
const phase = ref('closed')

// --- swipe left/right on book stage ---
let _swStartX = null
let _swStartT = 0
let _mouseDown = false
let _mouseStartX = 0
let _mouseStartT = 0

function trySwipe(endX, startX, startT) {
  const dx = endX - startX
  const adx = Math.abs(dx)
  const elapsed = Math.max((Date.now() - startT) / 1000, 0.03)
  const speed = adx / elapsed
  if (adx > 40 && speed > 200) ask()
}

function onSwipeStart(e) {
  const t = e.touches?.[0]
  if (!t) return
  _swStartX = t.clientX
  _swStartT = Date.now()
}

function onSwipeEnd(e) {
  const t = e.changedTouches?.[0]
  if (!t || _swStartX === null) { _swStartX = null; return }
  trySwipe(t.clientX, _swStartX, _swStartT)
  _swStartX = null
}

function onMouseDown(e) {
  _mouseDown = true
  _mouseStartX = e.clientX
  _mouseStartT = Date.now()
}

function onMouseUp(e) {
  if (!_mouseDown) return
  _mouseDown = false
  trySwipe(e.clientX, _mouseStartX, _mouseStartT)
}

function reset() {
  phase.value = 'closed'
}

function handleGesture(e) {
  if (e.detail.type === 'horizontal-swipe') {
    if (phase.value === 'open') return
    ask()
  }
}

function handleGestureClick(e) {
  if (phase.value === 'open' && e.detail.state === 'fist') {
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

function _doAsk() {
  play('pageTurn')
  const idx = Math.floor(Math.random() * ANSWERS.length)
  const { zh, en } = ANSWERS[idx]
  answerZh.value = zh
  answerEn.value = en
  phase.value = 'opening'
  setTimeout(() => {
    play('cardReveal');phase.value = 'open'
    store.saveHistory('📖 答案之书', zh, question.value || '（未输入问题）')
  }, 850)
}

function ask() {
  if (phase.value === 'opening') return
  if (phase.value === 'open') {
    phase.value = 'closed'
    setTimeout(_doAsk, 50)
  } else {
    _doAsk()
  }
}
</script>

<style scoped>
.stage-area {
  position: relative;
  width: 100%;
  background: var(--primary-light);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  cursor: pointer;
}
.book-closed-wrap, .book-open-wrap, .book-flip-wrap {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.book-closed-wrap, .book-open-wrap {
  transition: opacity 0.2s ease;
}
.book-gone { opacity: 0; pointer-events: none; }
.book-closed {
  display: flex;
  width: 137px; height: 180px;
  border-radius: 4px 6px 6px 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.30);
  background-color: var(--primary-light);
  border: 1.5px solid rgba(var(--primary-rgb), 0.35);
  overflow: hidden;
}
.book-spine-side {
  width: 14px; flex-shrink: 0;
  background: var(--primary);
  border-radius: 4px 0 0 4px;
  border-right: 1.5px solid rgba(var(--primary-rgb), 0.4);
}
.book-cover-area {
  flex: 1;
  background: #FFFFFF;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.book-cover-frame {
  width: 82%; height: 86%;
  border: 2px double rgba(var(--primary-rgb), 0.5); /* 💡 双线宫廷烫金线框 */
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  box-sizing: border-box;
}
.book-cover-title {
  font-family: "Georgia", "STSong", serif;
  font-size: 14px; font-weight: bold;
  color: var(--primary);
  letter-spacing: 3px; text-align: center;
}
.book-cover-gem { font-size: 10px; color: var(--primary); text-shadow: 0 0 6px rgba(var(--primary-rgb), 0.4); }
.book-cover-sub {
  font-family: "Georgia", serif;
  font-size: 7.5px; color: rgba(var(--primary-rgb), 0.7); text-align: center;
  letter-spacing: 0.5px;
}
.book-pages-side {
  width: 8px; flex-shrink: 0;
  border-radius: 0 2px 2px 0;
  background: var(--primary-light);
  border-right: 1px solid var(--primary);
  border-top: 1px solid var(--primary);
  border-bottom: 1px solid var(--primary);
}
/* 翻开的书 */
.book-open {
  display: flex; width: 296px; height: 180px;
}
.page-left, .page-right {
  flex: 1;
  background-color: #FFFFFF; /* 💡 纯白底面 */
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0,0,0,0.12); /* 内阴影增加纸张凹陷感 */
  border: 1px solid rgba(var(--primary-rgb), 0.22);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 10px 9px; box-sizing: border-box;
}
.page-left { border-radius: 4px 0 0 4px; border-right: none; }
.page-right { border-radius: 0 4px 4px 0; border-left: none; }
.book-center-spine {
  width: 6px; flex-shrink: 0;
  background: var(--primary);
}
.page-deco-line {
  width: 55%; height: 1px;
  background: var(--primary-shadow);
  margin: 4px 0; flex-shrink: 0;
}
.page-answer-en {
  font-family: "Georgia", serif; /* 💡 典雅的衬线体 */
  font-size: 11px; color: var(--primary); /* 💡 采用高贵的 Theme Primary 主色墨水 */
  font-style: italic; text-align: center;
  line-height: 1.65; flex: 1;
  display: flex; align-items: center;
}
.page-answer-zh {
  font-family: "Georgia", "PingFang SC", "STSong", serif; /* 💡 中文宋体/衬线，极富法典感 */
  font-size: 14.5px; color: var(--primary); /* 💡 采用高贵的 Theme Primary 主色墨水 */
  text-align: center; line-height: 1.65;
  letter-spacing: 1px; font-weight: bold;
  flex: 1; display: flex; align-items: center;
}
/* 翻页动画 */
.book-flip {
  position: relative; width: 296px; height: 180px;
}
.flip-left-bg {
  position: absolute; left: 0; top: 0;
  width: 144px; height: 100%;
  background: #FFFFFF; border-radius: 5px 0 0 5px;
  box-sizing: border-box;
}
.flip-spine-bg {
  position: absolute; left: 144px; top: 0;
  width: 8px; height: 100%;
  background: var(--primary);
}
.flip-right-bg {
  position: absolute; left: 152px; top: 0;
  width: 144px; height: 100%;
  background: #FFFFFF; border-radius: 0 5px 5px 0;
  box-sizing: border-box;
}
.flip-leaf {
  position: absolute; top: 0;
  left: 148px; width: 148px; height: 100%;
  transform-origin: 0% 50%;
  border-left: 1px solid rgba(160,130,60,0.2);
}
@keyframes leafFlip {
  0%   { transform: perspective(190px) rotateY(0deg); }
  100% { transform: perspective(190px) rotateY(-180deg); }
}
.fl-1 { animation: leafFlip 0.24s 0s    ease-in both; background: linear-gradient(90deg,#EBEBEB 0%,#FFFFFF 100%); }
.fl-2 { animation: leafFlip 0.30s 0.1s  ease-in both; background: linear-gradient(90deg,#F0F0F0 0%,#FFFFFF 100%); }
.fl-3 { animation: leafFlip 0.28s 0.2s  ease-in both; background: linear-gradient(90deg,#EBEBEB 0%,#FFFFFF 100%); }
.fl-4 { animation: leafFlip 0.26s 0.3s  ease-in both; background: linear-gradient(90deg,#F0F0F0 0%,#FFFFFF 100%); }
.fl-5 { animation: leafFlip 0.24s 0.4s  ease-in both; background: linear-gradient(90deg,#EBEBEB 0%,#FFFFFF 100%); }
.fl-6 { animation: leafFlip 0.24s 0.5s  ease-in both; background: linear-gradient(90deg,#F5F5F5 0%,#FFFFFF 100%); }

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
