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
            <span class="help-popup-content">梅花易数是中国古代占卜法之一。现在的梅花心易就是梅花易数的别称。相传为宋代易学家邵雍所著，梅花易数起源于汉易，是一部以易学中的数学为基础，结合易学中的"象学"进行占卜的书，相传邵雍运用时每卦必中，屡试不爽。

如何使用：
1.时间起卦法：用农历的年、月、日数相加除以8，余数定为上卦；再加时辰数除以8，余数定为下卦；总和除以6，余数定为动爻。
2.数字起卦法：根据直觉报三个数，代表"天"、"地"、"人"，前两个数分别除以8取余数定上卦和下卦，第三个数除以6取余数定动爻。
3.【手势】：开启手势后，在镜头前【握拳】，即可开始卜卦。【握拳】可重新开始。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <button class="gesture-btn" :class="{ 'active': store.isGesture }" @click="store.setGesture(!store.isGesture)">手势</button>
      <div class="page-title">梅花易数</div>
      <div class="page-subtitle">起卦观物象，演数知吉凶</div>

      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />

      <div class="mode-tabs">
        <div class="mode-tab" :class="{ 'mode-on': mode === 'time' }" @click="setMode('time')">当前时间起卦</div>
        <div class="mode-tab" :class="{ 'mode-on': mode === 'number' }" @click="setMode('number')">数字起卦</div>
      </div>

      <div v-if="mode === 'number'" class="num-row">
        <input class="num-input" type="number" v-model="num1" placeholder="数字" />
        <input class="num-input" type="number" v-model="num2" placeholder="数字" />
        <input class="num-input" type="number" v-model="num3" placeholder="数字" />
      </div>
      <div v-if="mode === 'number'" class="num-hint">按照直觉输入3个数字</div>

      <!-- 先天八卦圆盘 -->
      <div class="bagua-wrap">
        <div class="bagua-stage" :class="{ 'is-rolling': rolling, 'is-glowing': glowing }" @click="onBaguaClick">
          <div class="bagua-slot bs0"><span class="bs-sym">☰</span></div>
          <div class="bagua-slot bs1"><span class="bs-sym">☴</span></div>
          <div class="bagua-slot bs2"><span class="bs-sym">☵</span></div>
          <div class="bagua-slot bs3"><span class="bs-sym">☶</span></div>
          <div class="bagua-slot bs4"><span class="bs-sym">☷</span></div>
          <div class="bagua-slot bs5"><span class="bs-sym">☳</span></div>
          <div class="bagua-slot bs6"><span class="bs-sym">☲</span></div>
          <div class="bagua-slot bs7"><span class="bs-sym">☱</span></div>
          <div class="bagua-center">
            <div class="taiji-rotator">
              <span class="taiji-char">☯</span>
            </div>
          </div>
        </div>
      </div>

      <button class="btn-gold" @click="onMainBtn" :disabled="rolling">
        {{ rolling ? '天机推演中...' : phase === 'result' ? '再次起卦' : '观象起卦' }}
      </button>
      <div class="hint-text">
        <span class="hint-icon">💡</span>
        <span>{{ phase === 'result' ? '已成卦，点击按钮再次起卦' : '点击八卦阵 / 点击按钮起卦，可按时间模式 / 数字模式起卦 ' }}</span>
      </div>

      <!-- 卦象结果 -->
      <template v-if="phase === 'result'">
        <div class="hex-display fade-in">
          <div class="hex-lines">
            <div v-for="line in hexLines" :key="line.lineNum"
              class="hex-line-row" :class="{ 'row-changing': line.changing }">
              <span class="line-no">{{ line.lineNum }}</span>
              <div class="hex-line">
                <div v-if="line.yang" class="yang-bar"></div>
                <template v-else>
                  <div class="yin-bar-l"></div>
                  <div class="yin-gap"></div>
                  <div class="yin-bar-r"></div>
                </template>
              </div>
              <span class="change-o">{{ line.changing ? '○' : '' }}</span>
            </div>
          </div>
        </div>

        <GuaCard :title="guaDisplayTitle" :poem="guaPoem" :jiyi="guaJiyi"
          :tabs="tabContents" :activeTab="activeTab" @tabChange="activeTab = $event" />

        <GuaCard v-if="hasChanging" :title="changedGuaDisplayTitle" :poem="changedGuaPoem"
          :jiyi="changedGuaJiyi" :tabs="changedTabContents" :activeTab="changedActiveTab"
          @tabChange="changedActiveTab = $event" style="margin-top:8px">
          <template #header>
            <div class="gua-changed-label">↓ 变卦</div>
          </template>
        </GuaCard>
      </template>
      <AiDialogue pageType="plum" :question="question" :resultData="getPlumResultData()" :hasResult="phase === 'result'" />
    </div>
    <div style="height:0px"></div>
  </div>
</template>

<script setup>
import { helpCurtainBeforeEnter, helpCurtainEnter, helpCurtainLeave } from '../composables/useCurtainMotion.js'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AiDialogue from '../components/AiDialogue.vue'
import GuaCard from '../components/GuaCard.vue'
import { store } from '../store.js'
import { play } from '../sound.js'
import { getLunarDate, getTimeBranch } from './lunar.js'
import GUA_DATA from './64gua_module.js'

const themeStyle = computed(() => store.getThemeStyle())
const showHelpPopup = ref(false)
const phase = ref('input')
const mode = ref('time')
const num1 = ref(''), num2 = ref(''), num3 = ref('')
const question = ref('')
const rolling = ref(false)
const glowing = ref(false)
const hexLines = ref([])
const hasChanging = ref(false)
const guaDisplayTitle = ref(''), guaPoem = ref(''), guaJiyi = ref('')
const activeTab = ref(0)
const tabContents = ref([])
const changedGuaDisplayTitle = ref(''), changedGuaPoem = ref(''), changedGuaJiyi = ref('')
const changedActiveTab = ref(0)
const changedTabContents = ref([])

const GUA_MAP = {}
GUA_DATA.forEach(g => { GUA_MAP[g['卦象']] = g })

const TRIGRAMS = [
  { n:'乾', s:'☰', el:'天', lines:[1,1,1] },
  { n:'兑', s:'☱', el:'泽', lines:[1,1,0] },
  { n:'离', s:'☲', el:'火', lines:[1,0,1] },
  { n:'震', s:'☳', el:'雷', lines:[1,0,0] },
  { n:'巽', s:'☴', el:'风', lines:[0,0,0] },
  { n:'坎', s:'☵', el:'水', lines:[0,1,0] },
  { n:'艮', s:'☶', el:'山', lines:[0,0,1] },
  { n:'坤', s:'☷', el:'地', lines:[0,1,1] },
]
function trigramIdx(n) { const r = n % 8; return r === 0 ? 7 : r - 1 }
function findTrigramIdx(lines) {
  return TRIGRAMS.findIndex(t => t.lines[0]===lines[0] && t.lines[1]===lines[1] && t.lines[2]===lines[2])
}
function tabsOf(entry) {
  if (!entry) return Array(6).fill('暂无相关内容。')
  return ['事业','经商','求名','外出','婚恋','决策'].map(k => entry[k] || '暂无相关内容。')
}

function setMode(m) {
  if (m === mode.value) return
  mode.value = m
  phase.value = 'input'
  hexLines.value = []; hasChanging.value = false
}

function onMainBtn() {
  if (phase.value === 'result') { reset() } else { generate() }
}

function onBaguaClick() {
  if (rolling.value) return
  if (phase.value === 'result') { reset() } else { generate() }
}

function generate() {
  if (rolling.value) return
  if (mode.value === 'number' && (!num1.value || !num2.value || !num3.value)) {
    alert('请输入三个数字'); return
  }

  rolling.value = true
  glowing.value = false

  // 2.0 秒（2000ms）后，即旋转即将结束时（剩下 1 秒），Vue 会响应式地把 is-glowing 加到模板上，平滑过渡亮起神光
  let glowTimer = setTimeout(() => {
    if (rolling.value) {
      glowing.value = true
    }
  }, 2000)

  // 3 秒后出结果并停止动画
  setTimeout(() => {
    const now = new Date()
    let upperNum, lowerNum, changingNum
    if (mode.value === 'time') {
      const ld = getLunarDate(now)
      const ti = getTimeBranch(now.getHours())
      const base = ld.yearBranch + ld.lunarMonth + ld.lunarDay
      upperNum = base; lowerNum = base + ti; changingNum = base + ti
    } else {
      const ti = getTimeBranch(now.getHours())
      const n1 = parseInt(num1.value) || 0
      const n2 = parseInt(num2.value) || 0
      const n3 = parseInt(num3.value) || 0
      upperNum = n1; lowerNum = n2; changingNum = n1 + n2 + n3 + ti
    }
    const ui = trigramIdx(upperNum)
    const li = trigramIdx(lowerNum)
    const changingLine = (changingNum % 6) || 6
    const ut = TRIGRAMS[ui]; const lt = TRIGRAMS[li]
    hexLines.value = [
      { yang: ut.lines[2]===1, lineNum: 6 },
      { yang: ut.lines[1]===1, lineNum: 5 },
      { yang: ut.lines[0]===1, lineNum: 4 },
      { yang: lt.lines[2]===1, lineNum: 3 },
      { yang: lt.lines[1]===1, lineNum: 2 },
      { yang: lt.lines[0]===1, lineNum: 1 },
    ].map(l => ({ ...l, changing: l.lineNum === changingLine }))

    const guaKey = '上' + ut.n + '下' + lt.n
    const entry = GUA_MAP[guaKey]
    const hexName = entry ? entry['卦全称'] : (ut.n + lt.n)
    tabContents.value = tabsOf(entry)
    guaDisplayTitle.value = entry ? (entry['卦全称'] + ' · ' + entry['卦吉凶等级']) : hexName
    guaPoem.value = entry ? (entry['象曰歌谣'] || '') : ''
    guaJiyi.value = entry ? (entry['卦释义'] || '') : ''

    const newUL = [...ut.lines]; const newLL = [...lt.lines]
    if (changingLine <= 3) newLL[changingLine-1] ^= 1
    else newUL[changingLine-4] ^= 1
    const newUi = findTrigramIdx(newUL); const newLi = findTrigramIdx(newLL)
    const cKey = '上' + TRIGRAMS[newUi].n + '下' + TRIGRAMS[newLi].n
    const cEntry = GUA_MAP[cKey]
    const cName = cEntry ? cEntry['卦全称'] : (TRIGRAMS[newUi].n + TRIGRAMS[newLi].n)
    changedTabContents.value = tabsOf(cEntry)
    changedGuaDisplayTitle.value = cEntry ? (cEntry['卦全称'] + ' · ' + cEntry['卦吉凶等级']) : cName
    changedGuaPoem.value = cEntry ? (cEntry['象曰歌谣'] || '') : ''
    changedGuaJiyi.value = cEntry ? (cEntry['卦释义'] || '') : ''

    play('cardReveal')
    rolling.value = false
    glowing.value = false
    phase.value = 'result'
    hasChanging.value = true
    activeTab.value = 0; changedActiveTab.value = 0

    clearTimeout(glowTimer)

    store.saveHistory('🌸 梅花易数', `本卦：${hexName}→变卦：${cName}`,
      question.value || (mode.value === 'time' ? '时间起卦' : '数字起卦'))
  }, 3000)
}

function reset() {
  phase.value = 'input'; question.value = ''
  hexLines.value = []; hasChanging.value = false
  num1.value = ''; num2.value = ''; num3.value = ''
  guaDisplayTitle.value = ''; guaPoem.value = ''; guaJiyi.value = ''
  changedGuaDisplayTitle.value = ''; changedGuaPoem.value = ''; changedGuaJiyi.value = ''

  rolling.value = false
  glowing.value = false
}

function getPlumResultData() {
  return {
    title: guaDisplayTitle.value,
    poem: guaPoem.value,
    jiyi: guaJiyi.value,
    hasChanging: hasChanging.value,
    changedTitle: changedGuaDisplayTitle.value,
    changedPoem: changedGuaPoem.value,
    changedJiyi: changedGuaJiyi.value
  }
}

// ─── 💡 【手势握拳起卦监听】 ───
function handleGestureClick(e) {
  if (e.detail.state === 'fist' && !rolling.value) {
    onMainBtn()
  }
}

onMounted(() => {
  document.addEventListener('gesture-click', handleGestureClick)
})

onUnmounted(() => {
  document.removeEventListener('gesture-click', handleGestureClick)
})
</script>

<style scoped>
.mode-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 12px; }
.mode-tab {
  padding: 8px 20px; border-radius: 15px;
  font-size: 14px; color: #999;
  background: #F5F5F7; border: 1px solid #EBEBEB; cursor: pointer;
}
.mode-on { color: var(--primary); background: var(--primary-light); border-color: var(--primary); }
.num-row { display: flex; gap: 6px; margin-bottom: 5px; }
.num-input {
  flex: 1 1 0; min-width: 0; width: 0; background: #F5F5F7;
  border: 1px solid var(--primary); border-radius: 10px;
  padding: 7px 0; font-size: 14px; color: #1A1A2E;
  text-align: center; outline: none; min-height: 36px;
}
.num-hint { font-size: 10px; color: #BBBBBB; text-align: center; margin-bottom: 5px; }
/* 💡 赛博周易机械星盘起卦器样式组 */
.bagua-wrap {
  height: 190px;
  background: var(--primary-light) !important;
  border-radius: 10px;
  margin-bottom: 8px;
  display: flex; justify-content: center; align-items: center;
}
@keyframes baguaRotation {
  0% { transform: scale(0.82) rotate(0deg); }
  100% { transform: scale(0.82) rotate(360deg); }
}
@keyframes stageRollEaseOut {
  0% { transform: scale(0.82) rotate(0deg); }
  100% { transform: scale(0.82) rotate(1440deg); } /* 👈 顺时针自转 4 圈并优雅滑行减速 */
}
.bagua-stage {
  position: relative; width: 200px; height: 200px; margin: auto;
  border-radius: 50%;
  animation: baguaRotation 45s linear infinite;
  cursor: pointer;
  user-select: none;
  transition: filter 0.5s ease-in-out; /* 👈 添加过渡动画，确保发光平滑过渡淡入 */
}
/* 起卦时：超强物理阻尼阻抗先快后慢自转 */
.bagua-stage.is-rolling {
  animation: stageRollEaseOut 3s cubic-bezier(0.1, 0.8, 0.25, 1) forwards !important;
}
/* 旋转即将结束时（倒数 1.0 秒）开启神光，照亮整个星盘与太极 */
.bagua-stage.is-glowing {
  filter: drop-shadow(0 0 30px #ffffff) !important;
}
.bagua-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
@keyframes taijiTurn {
  0% { transform: rotate(-90deg); }
  50% { transform: rotate(90deg); }
  100% { transform: rotate(270deg); }
}
@keyframes taijiRollEaseOut {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-2160deg); } /* 👈 逆时针左旋自转 6 圈并优雅滑行减速 */
}
.taiji-rotator {
  width: 78px;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: taijiTurn 12s linear infinite;
}
/* 起卦时太极图同步加速阻尼旋转，大小不变 */
.bagua-stage.is-rolling .taiji-rotator {
  animation: taijiRollEaseOut 3s cubic-bezier(0.1, 0.8, 0.25, 1) forwards !important;
}
.taiji-char {
  font-size: 78px; color: var(--primary); opacity: 0.92;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  margin-top: -3.5px; /* 👈 修正 Unicode 字符基线偏下的固有缺陷，实现绝对完美的几何圆心自转 */
}
.bagua-slot {
  position: absolute; left: 50%; top: 50%;
  width: 36px; height: 36px;
  margin-left: -18px; margin-top: -18px;
  display: flex; align-items: center; justify-content: center;
}
@keyframes baguaGlow {
  0%, 100% { filter: brightness(1.0) drop-shadow(0 0 4px rgba(var(--primary-rgb), 0.4)); }
  50% { filter: brightness(1.5) drop-shadow(0 0 12px var(--primary)); }
}
.bs-sym {
  font-size: 32px; color: var(--primary); line-height: 1;
  animation: baguaGlow 2s ease-in-out infinite;
}
/* 起卦转动时，绝对屏蔽卦象本身的 primary 呼吸发光，保证转动中不带一丁点杂光，只有最末尾的纯白光 */
.bagua-stage.is-rolling .bs-sym {
  animation: none !important;
  text-shadow: none !important;
  filter: none !important;
}

.bs0 { transform: translateY(-72px) rotate(0deg); }
.bs1 { transform: translate(51px, -51px) rotate(45deg); }
.bs2 { transform: translateX(72px) rotate(90deg); }
.bs3 { transform: translate(51px, 51px) rotate(135deg); }
.bs4 { transform: translateY(72px) rotate(180deg); }
.bs5 { transform: translate(-51px, 51px) rotate(225deg); }
.bs6 { transform: translateX(-72px) rotate(270deg); }
.bs7 { transform: translate(-51px, -51px) rotate(315deg); }
/* 卦线 */
.hex-display {
  background: #F5F5F7; border-radius: 8px;
  padding: 10px; margin-top: 10px; margin-bottom: 10px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.hex-lines { width: 130px; display: flex; flex-direction: column; gap: 5px; }
.hex-line-row { display: flex; align-items: center; gap: 5px; height: 11px; }
.line-no { width: 11px; font-size: 9px; color: #CCC; text-align: center; flex-shrink: 0; }
.hex-line { flex: 1; display: flex; align-items: center; height: 100%; }
.yang-bar { width: 100%; height: 6px; background: #1A1A2E; border-radius: 2px; }
.yin-bar-l, .yin-bar-r { height: 6px; background: #1A1A2E; border-radius: 2px; width: 44%; }
.yin-gap { flex: 1; }
.change-o { width: 12px; font-size: 11px; color: var(--primary); text-align: center; flex-shrink: 0; }
.row-changing .yang-bar, .row-changing .yin-bar-l, .row-changing .yin-bar-r { background: var(--primary); }
.gua-changed-label { text-align: center; font-size: 12px; color: var(--primary); margin-bottom: 8px; letter-spacing: 2px; }
@keyframes baguaRotation768 {
  0% { transform: scale(1.15) rotate(0deg); }
  100% { transform: scale(1.15) rotate(360deg); }
}
@keyframes stageRollEaseOut768 {
  0% { transform: scale(1.15) rotate(0deg); }
  100% { transform: scale(1.15) rotate(1440deg); } /* 👈 桌面端顺时针阻尼自转 4 圈 */
}
@keyframes stageRollEaseOut1200 {
  0% { transform: scale(1.55) rotate(0deg); }
  100% { transform: scale(1.55) rotate(1440deg); } /* 👈 超宽屏顺时针阻尼自转 4 圈 */
}
@keyframes baguaRotation1200 {
  0% { transform: scale(1.55) rotate(0deg); }
  100% { transform: scale(1.55) rotate(360deg); }
}
@media (min-width: 768px) {
  .bagua-wrap { height: 300px; }
  .bagua-stage {
    animation: baguaRotation768 45s linear infinite !important;
    transition: filter 0.5s ease-in-out !important; /* 👈 桌面端确保支持发光淡入 */
  }
  .bagua-stage.is-rolling { animation: stageRollEaseOut768 3s cubic-bezier(0.1, 0.8, 0.25, 1) forwards !important; }
}
@media (min-width: 1200px) {
  .bagua-wrap { height: 380px; }
  .bagua-stage {
    animation: baguaRotation1200 45s linear infinite !important;
    transition: filter 0.5s ease-in-out !important; /* 👈 超宽屏端确保支持发光淡入 */
  }
  .bagua-stage.is-rolling { animation: stageRollEaseOut1200 3s cubic-bezier(0.1, 0.8, 0.25, 1) forwards !important; }
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
