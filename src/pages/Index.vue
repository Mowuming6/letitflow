<template>
  <div class="ds-root" ref="rootEl" :class="{ 'ds-cursor-star': onFirstTwoPages, 'is-day': isDay }" @scroll.passive="onScroll">
    <div class="ds-page1">
      <div class="ds-wrap" ref="mountEl"></div>
    </div>
    <!-- 第一页骰子下方文案：仅首页第一页显示 -->
    <div class="ds-dice-caption" :class="{ 'ds-dice-caption--day': isDay, 'is-visible': captionVisible }" aria-hidden="true">
      <!-- 中英文每 10 秒渐隐渐显轮换（1.8s 温和过渡） -->
      <div class="ds-dice-caption-text" :class="{ 'is-fading': captionFading }">
        <template v-if="!captionEn">
          <div class="ds-dice-caption-line1">不必纠结 随天意</div>
          <div v-if="peopleCount !== null" class="ds-dice-caption-line2">已帮{{ peopleCount }}人做了{{ decisionCount }}次决定</div>
        </template>
        <template v-else>
          <div class="ds-dice-caption-line1">Let It Flow</div>
          <div v-if="peopleCount !== null" class="ds-dice-caption-line2">Helped {{ peopleCount }} people make {{ decisionCount }} decisions</div>
        </template>
      </div>
    </div>
    <div class="ds-page2">
    </div>
    <!-- 呼吸灯提示：第一、二页底部，可点击向下滚动；手势模式下移手掌到此处并握拳即翻页 -->
    <button
      v-show="!onPage3"
      ref="scrollDownEl"
      type="button"
      class="ds-breathe"
      :class="{ 'ds-breathe--day': isDay }"
      @click="scrollDownNext"
    >向下滚动页面</button>
    <!-- 第三页手势缩放提示：仅手势模式显示，告诉用户用捏合手势缩放地球 -->
    <div v-show="onPage3 && store.isGesture" class="ds-gesture-hint">{{ zoomHintText }}</div>
    <!-- 第一页背景图层：DOM 实现（替代原画布内 nightPlane），置于最底层 -->
    <div class="ds-pagebg1" :style="pageBg1Style" aria-hidden="true"></div>
    <!-- 第二、三页背景图层：DOM 实现，昼夜切换白.png / 夜.png；过渡时从中心缩放展开 + 淡入 -->
    <div v-show="scrollPercent > 0" class="ds-pagebg" :style="[pageBgStyle, page2Reveal]" aria-hidden="true"></div>
    <!-- 漂浮汉字图层：仅第一页显示，用遮罩实现鼠标探照灯效果 -->
    <div v-show="onPage1" class="ds-float-layer" ref="floatLayer" :class="{ 'is-day': isDay }" aria-hidden="true">
      <span
        v-for="(c, i) in floatChars"
        :key="i"
        class="ds-float-char"
        :style="{
          top: c.top,
          left: c.left,
          fontSize: c.size + 'px',
          '--dur': c.dur,
          '--delay': c.delay,
          '--tx': c.tx,
          '--ty': c.ty,
          '--rot': c.rot
        }"
      >{{ c.ch }}</span>
    </div>
    <div class="ds-page3">
      <div class="ds-info" ref="infoEl">
        <slot />
      </div>
      <!-- 占卜介绍卡片：点击地球上的占卜柱/名称气泡弹出，右侧滑出 -->
      <div
        v-if="markCardOpen && selectedMark"
        class="mark-card-backdrop"
        @click="closeMarkCard"
      ></div>
      <div
        v-if="markCardOpen && selectedMark"
        class="mark-card"
        :class="{ 'dn-mode-day': isDay }"
        @click.stop
      >
        <button class="mark-card-close" type="button" @click.stop="closeMarkCard" aria-label="关闭">×</button>
        <div class="mark-card-body">
        <img
          v-if="selectedMark.image"
          :src="selectedMark.image"
          class="mark-card-img"
          alt=""
          referrerpolicy="no-referrer"
          @error="(e) => (e.target.style.display = 'none')"
        />
        <div class="mark-card-name">{{ selectedMark.name }}</div>
        <div v-if="selectedMark.alias" class="mark-card-alias">{{ selectedMark.alias }}</div>
        <div class="mark-card-meta">
          <span>国家：{{ selectedMark.country }}</span>
          <span v-if="selectedMark.countryEn">英文名：{{ selectedMark.countryEn }}</span>
          <span>信仰：<i class="mark-stars">{{ '★'.repeat(selectedMark.faith) }}{{ '☆'.repeat(5 - selectedMark.faith) }}</i></span>
          <span>影响：<i class="mark-stars">{{ '★'.repeat(selectedMark.influence) }}{{ '☆'.repeat(5 - selectedMark.influence) }}</i></span>
        </div>
        <div
          v-for="s in markSections"
          :key="s.label"
          class="mark-card-sec"
          :class="{ 'mark-card-intro': s.label === '详细介绍' }"
        ><b>{{ s.label }}</b>{{ s.value }}</div>
        <a v-if="selectedMark.link" :href="selectedMark.link" target="_blank" rel="noopener" class="mark-card-link">查看百科资料 →</a>
        </div>
      </div>
      <!-- 占卜柱悬停星级提示：地球停转 + 高亮对应柱时跟随光标弹出 -->
      <div
        v-if="markHover"
        class="mark-tip"
        :class="{ 'dn-mode-day': isDay }"
        :style="{ left: hoverTip.x + 'px', top: hoverTip.y + 'px' }"
      >
        <div class="mark-tip-name">
          <span>{{ markHover.record.name }}</span>
          <img
            v-if="markHover.record.image"
            :src="markHover.record.image"
            class="mark-tip-img"
            alt=""
            referrerpolicy="no-referrer"
            @error="(e) => (e.target.style.display = 'none')"
          />
        </div>
        <div v-if="markHover.kind !== 'infl'" class="mark-tip-row">信仰 <i class="mark-stars">{{ '★'.repeat(markHover.record.faith) }}{{ '☆'.repeat(5 - markHover.record.faith) }}</i></div>
        <div v-if="markHover.kind !== 'faith'" class="mark-tip-row">影响 <i class="mark-stars">{{ '★'.repeat(markHover.record.influence) }}{{ '☆'.repeat(5 - markHover.record.influence) }}</i></div>
      </div>
    </div>
    <!-- 自定义滚动指示条 -->
    <div class="ds-scrollbar" aria-hidden="true">
      <div class="ds-scrollthumb" :style="{ top: scrollPercent * 0.5 + '%' }"></div>
    </div>
    <!-- 昼夜切换按钮（右上角）：徽章绝对定位 + left 滑动过渡动效 -->
    <button class="ds-daynight-btn" type="button" :class="{ 'dn-mode-day': isDay }" @click.stop="toggleDayNight">
      <span class="ds-dn-badge"><span class="ds-dn-icon">{{ isDay ? '☼' : '☾' }}</span></span>
      <span class="ds-dn-text">{{ isDay ? ' 昼' : ' 夜' }}</span>
    </button>

    <!-- 主题色切换按钮：位于昼夜按钮正下方（右上角） -->
    <button class="ds-theme-btn" type="button" :class="{ 'dn-mode-day': isDay }" @click.stop="toggleThemePicker">
      <span class="ds-theme-dot" :style="{ background: currentTheme.primary }"></span>
      <span class="ds-theme-label">{{ currentTheme.name }}</span>
    </button>

    <!-- 手势切换按钮：左上角，与昼夜按钮水平对齐 -->
    <button class="ds-gesture-btn" type="button" :class="{ 'active': store.isGesture, 'dn-mode-day': isDay }" @click.stop="toggleGesture"><span class="ds-gesture-text">手势</span></button>

    <!-- 第三页返回第二页按钮：仅在第三页可见 -->
    <button
      v-show="onPage3"
      class="ds-back-page2"
      type="button"
      :class="{ 'dn-mode-day': isDay }"
      @click.stop="goBackToPage2"
      aria-label="返回第二页"
    >返回第二页</button>

    <!-- 主题选择弹层（复用全局 .help-* 样式，幕布动效与说明框一致） -->
    <Teleport to="body">
    <Transition :css="false" @before-enter="helpCurtainBeforeEnter" @enter="helpCurtainEnter" @leave="helpCurtainLeave">
      <div v-if="showThemePicker" class="help-mask" @click.self="showThemePicker = false">
        <div class="help-popup" style="width: min(84vw, 260px);">
          <div class="help-popup-close" @click="showThemePicker = false">×</div>
          <div class="help-popup-title">主题色</div>
          <div class="help-popup-content">
            <div class="ds-theme-list">
              <button
                v-for="(t, key) in THEME_LIST"
                :key="key"
                class="ds-theme-opt"
                :class="{ active: key === store.themeKey }"
                @click="pickTheme(key)"
              >
                <span class="ds-theme-opt-dot" :style="{ background: t.primary }"></span>
                <span class="ds-theme-opt-name">{{ t.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    </Teleport>

    <!-- 手势教学说明弹层（复用全局 .help-* 样式，与首页原实现一致） -->
    <Teleport to="body">
    <Transition :css="false" @before-enter="helpCurtainBeforeEnter" @enter="helpCurtainEnter" @leave="helpCurtainLeave">
      <div v-if="showGestureHelp" class="help-mask" @click.self="showGestureHelp = false">
        <div class="help-popup" style="width: min(88vw, 420px); max-height: 80vh;">
          <div class="help-popup-close" @click="showGestureHelp = false">×</div>
          <div class="help-popup-title">手势互动教学说明</div>
          <div class="help-popup-content" style="font-size: 13.5px; line-height: 1.6; color: #444;">
            <p style="margin-bottom: 12px; color: #666; font-size: 13px; text-align: center;">开启手势后，可通过前置摄像头进行非接触式悬空互动。<br/>请确保环境光线充足，并将手部完整伸向摄像头。</p>
            <div style="margin-bottom: 12px;">
              <strong :style="`color: ${currentTheme.primary} !important`">✨ 全局通用手势：</strong>
              <div style="padding-left: 10px; margin-top: 5px; display: flex; flex-direction: column; gap: 6px;">
                <div><b>移动光标：</b>伸出【食指☝️】或【张开手掌✋】在镜头前移动，可控制屏幕上的手势光标。当识别手势时，右下角摄像头界面会绑定手势骨骼。</div>
                <div><b>点击确认：</b>将光标悬停在卡片或按钮上，【握拳✊】即可触发点击动作。</div>
                <div><b>返回 / 翻页：</b>在首页【比✌️】可向上滚动（上一页）；在其它页面【比✌️】等同于左上角【返回】按钮（回到首页，从第二页进入的子页则回到第二页）。</div>
                <div><br/><b>上方或下方栏：</b><span style="display: block; padding-left: 4px; margin-top: 2px;">手势光标在图标上停留3秒可跳转到功能页面。</span></div>
                <div><br/><b>首页：</b><span style="display: block; padding-left: 4px; margin-top: 2px;">骰子眼球可跟随手势光标移动。首页第一页和第二页光标在骰子上【保持握拳状态✊】并移动可旋转骰子；第二页在功能卡片上【保持握拳状态✊】并移动【保持握拳状态✊】并移动可旋转功能卡片，光标在某一功能上停留3秒可跳转到功能页面。光标在“向下滚动页面”文字处【握拳✊】可滚动页面。</span></div>
                <div><br/><b>占卜世界地图（第三页）：</b><span style="display: block; padding-left: 4px; margin-top: 2px;">在地球上【握拳✊并左右拖拽】可旋转地球；<br/>比出【食指☝️】并保持 3 秒解锁缩放，之后用【拇指+食指捏合/张开】缩放地球，静止 2 秒自动锁定大小；<br/>将光标停在任一柱状图或国家名称上 3 秒，自动弹出该占卜的介绍卡片，【保持握拳状态✊】2秒以上并上下移动可上下翻阅页面（在卡片上或卡片外【握拳✊】可关闭）。</span></div>
              </div>
            </div>
            <div>
              <strong class="gh-section" :style="`color: ${currentTheme.primary} !important`">👋 各页面互动手势：</strong>
              <div style="padding-left: 10px; margin-top: 5px; display: flex; flex-direction: column; gap: 8px;">
                <div><br/><b>所有占卜页面：</b><span style="display: block; padding-left: 4px; margin-top: 2px;"><br/>伸出【食指☝️】3秒=触发重新占卜；【短暂握拳✊】=点击（点按钮、展开 AI 解读等）；【保持握拳状态✊】2秒以上并上下移动可上下翻阅页面</span></div>
                <div><br/><b>每日运势 / 骰子之神 / 命运硬币 / 命运转盘 / 掷圣杯 / 六爻金钱卦：</b><span style="display: block; padding-left: 4px; margin-top: 2px;">【上下挥手掌✋】，即可投掷/起卦。<br/></span></div>
                <div><br/><b>观音灵签 / 答案之书：</b><span style="display: block; padding-left: 4px; margin-top: 2px;">【左右挥手掌✋】，即可抽签/翻书。</span></div>
                <div><br/><b>塔罗占卜 / 雷诺曼占卜：</b><span style="display: block; padding-left: 4px; margin-top: 2px;">【握拳✊】，开始洗牌；<br/>【左右挥手掌✋】即可洗牌；<br/>选牌界面，【左右挥手掌✋】可左右滑动牌区，伸出【食指☝️】可在当前牌区选牌，食指在某牌上停留超过3秒即可选中该牌。<br/>【握拳✊】触发重新占卜。</span></div>
              </div>
            </div>
          </div>
          <button class="btn-gold" style="margin-top: 14px; flex-shrink: 0;" @click="enableGestureAndClose">开启手势</button>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

import { feature as topoFeature } from 'topojson-client'
import worldTopo from 'world-atlas/countries-110m.json'
import divinationData from '../data/divination.json'
import { store } from '../store'
import { NAV_LIST } from '../navList'
import { THEMES } from '../theme'
import { helpCurtainBeforeEnter, helpCurtainEnter, helpCurtainLeave } from '../composables/useCurtainMotion.js'
import { useCounters } from '../composables/useCounters.js'
import { playBounce, resumeAudio, playOrbit, vib } from '../sound.js'
import whiteBg from '../../public/images/background/白.png'
import nightBg from '../../public/images/background/夜.png'
import page1Night from '../../public/images/background/夜晚2.png'   // 第一页夜景（替代画布内 nightPlane，改 DOM 图层）
import page1Day from '../../public/images/background/白天.png'       // 第一页昼景

// 运行时错误安全捕获，便于回显排错
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    alert("运行时错误: " + e.message + " \n在文件: " + e.filename + " \n行号: " + e.lineno)
  })
}

const mountEl      = ref(null)
const rootEl       = ref(null)
const scrollDownEl = ref(null)   // “向下滚动页面”按钮，用于手势握拳命中检测
const infoEl       = ref(null)
const floatLayer   = ref(null)   // 漂浮汉字图层（鼠标探照灯遮罩）
const eyeActive    = ref(false)
const scrollPercent = ref(0)    // 0-100，驱动自定义滚动指示条
// 昼夜切换状态：false=夜(默认)，true=昼。绑定到 store（localStorage 持久化），跨页面/刷新保留。
// 用 computed 的 set 拦截，点切换时自动写 store + localStorage；get 读持久化值。
const isDay = computed({
  get: () => store.isDay,
  set: (v) => store.setDayNight(v)
})
const onPage1 = computed(() => scrollPercent.value < 50)   // 仅第一页显示漂浮汉字探照灯
const onPage3 = computed(() => scrollPercent.value >= 66)  // 仅第三页显示「返回第二页」按钮
// 第一、二页：鼠标指针显示星星 ✦；第三页恢复正常光标
const onFirstTwoPages = computed(() => scrollPercent.value < 66)
// 首页第一页骰子下方文案：全局共享计数（已帮XX人做了XX次决定）
const { peopleCount, decisionCount } = useCounters()
// 文案中英轮换：每 10 秒渐隐→切换语言→渐显（渐变时长与 CSS 的 1.8s 对应）
const captionEn = ref(false)       // false=中文，true=英文
const captionFading = ref(false)   // true 时文字透明（渐隐中）
let captionTimer = null            // 中英轮换定时器
// 骰子下方文案：仅停留在第一页时显示，一离开第一页就渐隐（阈值 15，可调）
const captionVisible = computed(() => scrollPercent.value < 15)
// 第一页背景图（DOM 图层，替代画布内 nightPlane）：昼→白天.png，夜→夜晚2.png
const pageBg1Url = computed(() => isDay.value ? page1Day : page1Night)
// 背景底色（background-color）：白昼取第二页 白.png 的实际背景区颜色 #A7A2A0（中性偏暖灰，
// 由四角/边缘/众数采样得到，非整图平均），与第二页观感一致；夜用黑色配夜景图。
// 图片白天.png 用 auto 100% 高度铺满、宽度可能露边，露出的就是这层底色，必须跟第二页同色。
const pageBg1Style = computed(() => ({
  backgroundImage: `url("${pageBg1Url.value}")`,
  backgroundColor: isDay.value ? '#A7A2A0' : '#000000'
}))
// 第二、三页背景图相同：昼→白.png，夜→夜.png
const pageBgUrl = computed(() => isDay.value ? whiteBg : nightBg)
const pageBgStyle = computed(() => ({ backgroundImage: `url("${pageBgUrl.value}")` }))

// 第一页↔第二页过渡进度：0=第1页停泊，1=已到第二页（由平滑 sp 驱动）
const irisT = ref(0)
// 第二页背景「淡入展开」：随进度仅做透明度渐显(0→1)，无缩放（第一页背景自然被覆盖，形成正常交叉渐隐）
const page2Reveal = computed(() => {
  const t = irisT.value
  return { opacity: t }
})

let scrollTarget = 0
let scrollLerp   = 0
let sp           = 0   // 0=page1, 0.5=page2, 1=page3，animate() 内更新，全局可读

// ── 第二页漂浮卡牌 ────────────────────────────────────────────
const router = useRouter()
const route = useRoute()
const FLOAT_CARDS = NAV_LIST.filter(n => n.path !== '/' && n.path !== '/index' && n.path !== '/about')

// 相机固定位置（不再有 OrbitControls 移动相机）
// 响应式相机距离：桌面端保持原值；移动端（窄屏）自动拉远相机，使骰子整体缩小不溢出
function responsiveCamZ(w = window.innerWidth) {
  if (w < 480)  return 3.6    // 手机竖屏：拉远最多，内容缩到约 68%
  if (w < 768)  return 3.1    // 小平板
  if (w < 1100) return 2.7    // 窄窗口 / 大平板
  return 2.4444               // 桌面：原值（正好）
}
// 地球水平偏移：横屏/桌面卡片在右，地球偏左给卡片让位；竖屏手机卡片居中，地球居中显示
function globeOffsetX() {
  const portraitPhone = window.innerWidth <= 768 &&
    (window.matchMedia ? window.matchMedia('(orientation: portrait)').matches : true)
  return portraitPhone ? 0 : -0.6
}
// 让地球（含占卜柱/名称卡片凸起）完整可见所需的相机距离：以屏幕较窄维度为约束
function globeFitCamZ() {
  const aspect = (window.innerWidth || 1) / (window.innerHeight || 1)
  const vHalf = Math.tan(THREE.MathUtils.degToRad(50) / 2)   // 0.4663
  const hHalf = vHalf * aspect
  const fitR = 1.1                  // 需容纳的地球半径（含凸起占卜柱/标签）
  const need = fitR / Math.min(vHalf, hHalf)
  return Math.max(responsiveCamZ(), need)
}
const CAMERA_DEFAULT = new THREE.Vector3(0, 0, responsiveCamZ())   // 整体缩小为 90%（2.2 ÷ 0.9）

// ── 地球相关变量 ──────────────────────────────────────────────
const GLOBE_R            = 0.82
// 地球背景底色 = 主题 primary（不透明度见下 GLOBE_CORE_OPACITY）
const GLOBE_CORE_OPACITY = 1       // ← 在这里改地球背景透明度（0~1）
const GLOBE_PARTICLE_OPACITY = 1 // ← 地球表面粒子整体不透明度（0~1）
let globeGroup   = null
let globeSurface = null   // 球面粒子云
let globeLines   = null   // 大陆轮廓线
let globeCore         = null   // 球体背景底色
let globeLandOverlay  = null   // 大陆覆盖层（半透明 primary 覆盖陆地）
let globeLandCanvas   = null   // 大陆覆盖层画布
let globeLandTex      = null   // 大陆覆盖层纹理
let worldCountries    = null   // 国家 GeoJSON 数据（供覆盖层纹理重绘）
let surfaceLand = null    // 每粒子陆地/海洋标志（0=海洋，1=陆地），供 recolorGlobe 运行时重新着色
const _hoverRay    = new THREE.Raycaster()
const _hoverWP     = new THREE.Vector3()   // 地球 world position 缓存
const _hoverTarget = new THREE.Vector3()   // 射线与球面交点
const _rollQ       = new THREE.Quaternion()  // 骰子滚动四元数（避免每帧 new）
const _rollAxis    = new THREE.Vector3(0, 0, 1)  // 绕 Z 轴滚动
const GLOBE_PARTICLE_N = 80000             // ← 地球粒子总数（改这里增减密度）

// ── 占卜数据地球标记（第三页） ───────────────────────────────
let globeMarks = null
const markMeshes = []            // 可点击对象（柱体 + 标签精灵），userData.record
const markCardOpen = ref(false)  // 右侧介绍卡片是否打开
const selectedMark = ref(null)   // 当前选中的占卜记录

// 地球缩放门控：需先「伸出食指 ☝️」保持 3 秒解锁；缩放静止 2 秒后自动锁定，其他时间不触发缩放
const zoomArmed = ref(false)
const zoomLocked = ref(false)
const lastZoomChangeTime = ref(0)
const zoomDir = ref('')          // 当前缩放方向：'in' 放大中 / 'out' 缩小中 / '' 静止
let pointProgress = 0            // 食指解锁进度 0~1（手势层实时回传）
let emaDist = null               // 捏合距离 EMA 平滑值，滤除逐帧手部抖动

// 第三页手势提示文案：随缩放解锁/锁定状态变化，并实时显示缩放方向与当前大小
const zoomHintText = computed(() => {
  if (!zoomArmed.value) {
    if (pointProgress > 0) return `伸出「食指」保持3秒解锁 · 进度 ${Math.round(pointProgress * 100)}%`
    return '伸出「食指」手势并保持 3 秒，解锁地球缩放'
  }
  if (zoomLocked.value) return '大小已锁定 · 再伸出「食指」3 秒可重新调整'
  const pct = Math.round(((cameraZoom - 1.1) / (5.0 - 1.1)) * 100)
  const recent = Date.now() - lastZoomChangeTime.value
  let dir = ''
  if (recent < 500) dir = zoomDir.value === 'in' ? '放大中 ▲' : zoomDir.value === 'out' ? '缩小中 ▼' : ''
  if (dir) return `调整大小状态中 · 当前 ${pct}%`
  return `可缩放 · 当前 ${pct}% · 静止 2 秒自动锁定`
})
const markHover = ref(null)      // 悬停的占卜柱信息 { record, kind }
const hoverTip = ref({ x: 0, y: 0 })  // 悬停提示框定位（屏幕坐标）
let hoveredMarkMesh = null       // 当前高亮的柱体 mesh（非响应式）
let prevHoverMesh = null         // 上一次高亮的柱体（用于切换 depthTest/renderOrder）
let hoveredLabel = null          // 当前悬停/点击高亮的占卜名称气泡
let clickedLabel = null          // 当前因点击打开卡片而保持高亮的占卜名称气泡
let lastGlobeInteract = -1e12    // 最近一次拖拽/悬停地球的时间戳（用于停转后延时恢复自转）
let markDragMoved = 0            // 本次地球拖拽位移累计（区分点击/拖拽）
let markDragActive = false       // 本次按下是否落在地球区域
let markDownX = 0, markDownY = 0 // 本次按下时的屏幕坐标（用于点击拾取）

let cameraZoom   = globeFitCamZ()   // 第二页滚轮/移动端捏合控制相机 z；默认按屏幕适配保证地球完整显示

// 地球自定义拖拽旋转（不使用 OrbitControls，避免相机偏移）
let globeDragging  = false
let globeDragLastX = 0, globeDragLastY = 0
let globeVibAccum  = 0   // 转动地球时震动反馈的位移累计器（达阈值触发一次轻震）

// ── 粒子过渡系统 ─────────────────────────────────────────────
const PARTICLE_N  = 20000
let particleSystem   = null
let particlePhase    = 'dice'   // 'dice' | 'animating' | 'globe' | 'reversing'
let particleStartTime = 0
let reverseStartTime  = 0
const reverseStartPos  = new THREE.Vector3()  // 倒放起点（地球正常位置），用于精确插值到骰子
let orbitRevealStart  = -1
let orbitExpandScale  = 1.0      // ← 轨道半径倍数：1=正常 >1=扩散出屏幕
// 轨道悬停（指针/手指经过）检测状态
let orbitHovering   = false      // 当前是否悬停在轨道上
let lastOrbitHoverT = 0          // 上次触发音效时间戳（节流，避免快速连发）
const ORBIT_EXPAND_MS = 800      // ← 正向扩散时长（毫秒）
const ORBIT_FADE_MS   = 3000     // ← 轨道物件淡入时长（毫秒）
const PARTICLE_MS    = 3000   // 过渡动画时长（毫秒）
const DICE_FADE_MS   = 600   // 骰子淡出时长
const GLOBE_FADE_MS  = 900   // 地球淡入时长（含柱状图和标签的渐入）
let   diceFadeStart  = 0
let   globeFadeStart = 0

function onScroll() {
  const el = rootEl.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  scrollTarget = max > 0 ? Math.min(1, el.scrollTop / max) : 0
  scrollPercent.value = scrollTarget * 100
}

// ── 自定义吸附（可调速度和粘滞感） ──────────────────────────────
const SNAP_DURATION = 3000    // 毫秒，越大越慢
const SNAP_STICKY   = 0.1    // 0~1：越小越"粘"（接近终点时减速越明显）

// ── 主题色 / 手势 切换（与首页 Index 完全一致的逻辑，按钮样式复用昼夜按钮） ──
const THEME_LIST = THEMES
const showThemePicker = ref(false)
const currentTheme = computed(() => THEMES[store.themeKey] || THEMES.jin)
function toggleThemePicker() { showThemePicker.value = !showThemePicker.value }
function pickTheme(key) { store.setTheme(key); showThemePicker.value = false }

// ── 主题色联动：瞳孔虹膜/眼眶、两条轨道粒子、三张卡牌图案 ──────────
function hexToRgbArr(hex) {
  const raw = String(hex || '').replace('#', '')
  const norm = raw.length >= 8 ? raw.slice(0, 6) : (raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw)
  const num = parseInt(norm, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}
// 将 hex 转为 0~1 的 RGB 数组，供 Three.js 顶点颜色（颜色属性）直接使用
function hexToRgb01(hex) {
  const [r, g, b] = hexToRgbArr(hex)
  return [r / 255, g / 255, b / 255]
}
// 将图标 PNG 重新着色为指定主题色（保留透明度/形状），用于夜晚模式切换
function tintImageToColor(srcImg, hex) {
  const tc = document.createElement('canvas')
  tc.width = srcImg.width || srcImg.naturalWidth || 1
  tc.height = srcImg.height || srcImg.naturalHeight || 1
  const tctx = tc.getContext('2d')
  tctx.drawImage(srcImg, 0, 0)
  tctx.globalCompositeOperation = 'source-in'
  tctx.fillStyle = hex
  tctx.fillRect(0, 0, tc.width, tc.height)
  return tc
}
// 将 hex 向黑色压暗 f（0~1），生成虹膜渐变的深色层级
function darkenHex(hex, f) {
  const [r, g, b] = hexToRgbArr(hex)
  const k = 1 - f
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`
}
// 瞳孔主题色缓存（drawRightEye 每帧读取；仅在主题切换时重算，避免每帧字符串拼接）
const eyeColors = { iris0: '#D10F0F', iris1: '#A00808', iris2: '#6E0202', iris3: '#360000', edge: 'rgba(100,0,0,0.9)', fiber: '210,20,10' }
function applyEyeTheme() {
  const t = currentTheme.value
  const p = t.eyeIris || t.primary   // 各主题可独立指定瞳孔色
  const d = t.eyeEdge || t.primaryDark
  eyeColors.iris0 = p
  if (t.eyeBright) {
    // ── 亮调（仅金主题）：亮色外推到可见环，整体压暗更轻 ──
    eyeColors.iris1 = darkenHex(p, 0.22)
    eyeColors.iris2 = darkenHex(p, 0.45)
    eyeColors.iris3 = darkenHex(p, 0.65)
    eyeColors.gS1 = 0.5;  eyeColors.gC1 = eyeColors.iris0   // 可见环起点=亮金
    eyeColors.gS2 = 0.8;  eyeColors.gC2 = eyeColors.iris1
    eyeColors.gC3 = eyeColors.iris2
    eyeColors.limbal = 0.32
  } else {
    // ── 原暗调（火/木/水/土/风，保持原来样子不变）──
    eyeColors.iris1 = darkenHex(p, 0.30)
    eyeColors.iris2 = darkenHex(p, 0.55)
    eyeColors.iris3 = darkenHex(p, 0.80)
    eyeColors.gS1 = 0.28; eyeColors.gC1 = eyeColors.iris1
    eyeColors.gS2 = 0.65; eyeColors.gC2 = eyeColors.iris2
    eyeColors.gC3 = eyeColors.iris3
    eyeColors.limbal = 0.52
  }
  const [er, eg, eb] = hexToRgbArr(d)
  eyeColors.edge = `rgba(${er},${eg},${eb},0.9)`        // 杏仁眼眼眶描边 = 主题深色
  eyeColors.fiber = hexToRgbArr(p).join(',')            // 虹膜放射纤维 = 主题主色
}
applyEyeTheme()   // 立即初始化（纯数据，不依赖 Three 场景）

function applyThemeToScene() {
  applyEyeTheme()
  const p = currentTheme.value.primary
  // 两条轨道粒子环 → 主题主色
  if (orbitParticles)  orbitParticles.material.color.set(p)
  if (orbitParticles2) orbitParticles2.material.color.set(p)
  // 三张卡牌贴图 → 对应主题目录的 card.jpg
  if (orbitCardFaceMat) {
    const tex = new THREE.TextureLoader().load(`./images/themes/${store.themeKey}/card.jpg`)
    orbitCardFaceMat.map?.dispose?.()
    orbitCardFaceMat.map = tex
    orbitCardFaceMat.needsUpdate = true
  }
  // 第二页导航卡牌 LOGO → 随主题换对应主题色图标（目录随主题变）
  if (navCards3D && navCards3D.length) {
    navCards3D.forEach(c => c.userData.navTex && c.userData.navTex.redrawLogo && c.userData.navTex.redrawLogo())
  }
  recolorGlobe()   // 切主题时地球粒子/轮廓线同步换主题色
}
watch(() => store.themeKey, applyThemeToScene)   // 切主题时即时生效（此时场景已建）

const showGestureHelp = ref(false)
function toggleGesture() {
  if (!store.isGesture) {
    showGestureHelp.value = true
  } else {
    store.setGesture(false)
  }
}
function enableGestureAndClose() {
  store.setGesture(true)
  showGestureHelp.value = false
}

// ── 背景漂浮汉字（鼠标探照灯效果）────────────────────────────
// 占卜/玄学主题汉字，铺满全屏缓慢漂浮；整体被径向渐变遮罩隐藏，
// 鼠标移动时把遮罩圆心钉在光标处，只"照亮"光标周围一圈。
const FLOAT_CHARS = ['运','命','卦','签','卜','道','阴','阳','乾','坤','福','禄','极','寿','喜','财','吉','祥','灵','玄','日','心','诚','占','星','辰','牌','月','禅']
// 用网格分布保证每字间距 ≥ 10px（屏幕最小边方向）
const floatChars = (() => {
  const n = FLOAT_CHARS.length
  // 选一个包含 n 个格子的网格（比 n 稍大一点，有富余）
  const cols = Math.ceil(Math.sqrt(n * 1.4))
  const rows = Math.ceil(n / cols)
  const cellW = 90 / cols   // left 范围 2~92% → 共 90%
  const cellH = 90 / rows   // top  范围 2~92% → 共 90%
  // 为每个字分配一个格子，格内随机偏移但限制在格子中间 70% 区域（两边各留 15% 作为间距）
  const margin = 0.15       // 格子边 15% 作间距缓冲
  const indexArr = Array.from({ length: cols * rows }, (_, i) => i)
  // 打乱后取前 n 个
  for (let i = indexArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexArr[i], indexArr[j]] = [indexArr[j], indexArr[i]]
  }
  return FLOAT_CHARS.map((ch, idx) => {
    const gi = indexArr[idx]
    const cx = gi % cols, cy = Math.floor(gi / cols)
    const dur = 14 + Math.random() * 16
    // 格子内随机偏移：margin..(1-margin) 范围
    const jx = margin + Math.random() * (1 - margin * 2)
    const jy = margin + Math.random() * (1 - margin * 2)
    return {
      ch,
      top:   (2 + cy * cellH + jy * cellH).toFixed(2) + '%',
      left:  (2 + cx * cellW + jx * cellW).toFixed(2) + '%',
      size:  Math.round(18 + Math.random() * 34),
      dur:   dur.toFixed(2) + 's',
      delay: (-Math.random() * dur).toFixed(2) + 's',
      tx:    (Math.random() * 40 - 20).toFixed(1) + 'px',
      ty:    (Math.random() * 40 - 20).toFixed(1) + 'px',
      rot:   (Math.random() * 30 - 15).toFixed(1) + 'deg',
    }
  })
})()

// 探照灯半径：移动端小一点
const LAMP_R = (typeof window !== 'undefined' && window.innerWidth < 480) ? 120 : 168

function onLampMove(e) {
  // 手势模式下探照灯由 onGestureHover 驱动，忽略真实指针，避免两套光标抢位置
  if (store.isGesture) return
  const el = floatLayer.value
  if (!el) return
  el.style.setProperty('--lamp-x', e.clientX + 'px')
  el.style.setProperty('--lamp-y', e.clientY + 'px')
  el.style.setProperty('--lamp-r', LAMP_R + 'px')
}
function onLampLeave() {
  floatLayer.value?.style.setProperty('--lamp-r', '0px')
}

let snapPage    = 0           // 当前目标页（0、1 或 2）
let snapAnimId  = null
let snapLocked  = false       // 动画中锁定，忽略多余 wheel 事件
let stopPageQueryWatch = null

function snapTo(page) {
  const el = rootEl.value
  if (!el) return
  snapPage = page
  const targetY = page * el.clientHeight
  const startY  = el.scrollTop
  const startMs = performance.now()

  if (snapAnimId) cancelAnimationFrame(snapAnimId)

  function step(now) {
    const p = Math.min(1, (now - startMs) / SNAP_DURATION)
    // easeInOutQuart + 尾部用 SNAP_STICKY 额外减速产生粘滞感
    const ease = p < 0.5
      ? 8 * p * p * p * p
      : 1 - Math.pow(-2 * p + 2, 4) / 2
    const sticky = 1 - Math.pow(1 - ease, 1 / SNAP_STICKY)
    el.scrollTop = startY + (targetY - startY) * sticky
    if (p < 1) {
      snapAnimId = requestAnimationFrame(step)
    } else {
      el.scrollTop = targetY
      snapLocked = false
    }
  }
  snapAnimId = requestAnimationFrame(step)
}

// 第三页 → 返回第二页
function goBackToPage2() {
  if (snapLocked) return
  snapLocked = true
  snapTo(1)
}

// 点击“向下滚动页面” → 滚到下一页（第一页→第二页，第二页→第三页）
function scrollDownNext() {
  goNextPage()
}

// 前进到下一页（手势/点击共用）
function goNextPage() {
  if (document.body.classList.contains('dialog-open')) return
  if (snapLocked) return
  const next = Math.min(2, snapPage + 1)
  if (next === snapPage) return
  snapLocked = true
  snapTo(next)
}

// 首页✌手势：向上滚动（回到上一页，第三页→第二页→第一页）
function goPrevPage() {
  if (document.body.classList.contains('dialog-open')) return
  if (snapLocked) return
  const prev = Math.max(0, snapPage - 1)
  if (prev === snapPage) return
  snapLocked = true
  snapTo(prev)
}

// 手势「滑动类」触发：首页✌派发的向上滚动即触发上一页
function onGestureTrigger(e) {
  // 信息卡片打开时：屏蔽所有页面切换（滚动改由握拳拖拽 gesture-fist-drag 处理）
  if (markCardOpen.value) return
  if (e.detail.type === 'swipe-up') goPrevPage()
}

// 握拳拖拽滚动介绍卡片：手向下移 → 内容向下滚（跟手）；手向上移 → 内容向上滚
let cardDragActive = false
let cardDragLastY = 0
function onGestureFistDrag(e) {
  if (!markCardOpen.value) { cardDragActive = false; return }
  const body = document.querySelector('.mark-card-body')
  if (!body) return
  const y = e.detail.y
  if (!cardDragActive) { cardDragActive = true; cardDragLastY = y; return }  // 首帧只基准，不滚
  const dy = y - cardDragLastY          // 本帧相对上一帧的指针位移
  cardDragLastY = y
  // 增益 2.5：手部移动范围有限，放大位移才能滚完整张卡片
  body.scrollTop += dy * 2.5
}

// 手势「握拳 = 点击」：落在可点击 UI 上交给全局手势层的原生点击；否则第一/二页拖拽骰子/轨道，第三页握拳在地球上=旋转
let fistDragMode = false  // 首页第二页：握拳长按≥2s 进入的拖拽模式，松手时不视为点击导航

function onGestureClick(e) {
  const { x, y } = e.detail                      // 手掌光标屏幕坐标（与 aura-orb 一致）
  // 主题色 / 手势说明等弹层：在「关闭按钮」或「弹层外」握拳 = 关闭；弹层内其它元素（如主题选项）交回原生点击
  if (showThemePicker.value || showGestureHelp.value) {
    const closeBtn = document.elementFromPoint(x, y)?.closest?.('.help-popup-close')
    const popup = document.querySelector('.help-popup')
    const r = popup && popup.getBoundingClientRect()
    const onPopup = !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    if (closeBtn || !onPopup) {
      showThemePicker.value = false
      showGestureHelp.value = false
    }
    return
  }
  // 信息卡片打开时：只在关闭按钮或卡片外握拳才关闭；卡片内不响应
  if (markCardOpen.value) {
    const markCard = document.querySelector('.mark-card')
    const cardRect = markCard?.getBoundingClientRect()
    const onCloseBtn = document.elementFromPoint(x, y)?.closest?.('.mark-card-close')
    const outsideCard = !cardRect || x < cardRect.left || x > cardRect.right || y < cardRect.top || y > cardRect.bottom
    if (onCloseBtn || outsideCard) { closeMarkCard() }
    return
  }
  // 落在可点击 UI 元素（顶部按钮、滚动按钮、关闭按钮等）上：原生点击由全局手势层处理，这里不进入 3D 拖拽
  if (isOverClickable(x, y)) return
  if (document.body.classList.contains('dialog-open')) return
  if (snapLocked) return
  // 第三页：悬停在柱状图/名称气泡上时，停留 3 秒已由悬停自动开卡，这里不再把握拳当作地球拖拽/点击
  if (sp > 0.85 && markHover.value && markHover.value.record) return
  onPtrDown(x, y)   // 第一/二页：握拳=按下，开始拖拽骰子/轨道；第三页：握拳在地球上=旋转
}

// 判断坐标是否落在可点击 UI 元素上（与全局手势层的原生点击判定保持一致）
function isOverClickable(x, y) {
  const el = document.elementFromPoint(x, y)
  if (!el) return false
  return !!el.closest('button, a, input, label, [role="button"], .clickable')
}

// 手势「悬停」：每帧把光球位置喂给 mouseX/mouseY，使眼球、灯光、骰子跟随、轨道拖拽都跟随手势光标
let hoverOpenKey = null        // 当前停留的占卜柱记录（同一记录连续停留才计时）
let hoverOpenStart = 0         // 开始停留的时间戳
function onGestureHover(e) {
  if (!store.isGesture) return
  const { x, y } = e.detail
  mouseX = x; mouseY = y
  onPtrMove(x, y)
  // 探照灯跟随手势光标
  const el = floatLayer.value
  if (el) {
    el.style.setProperty('--lamp-x', x + 'px')
    el.style.setProperty('--lamp-y', y + 'px')
    el.style.setProperty('--lamp-r', LAMP_R + 'px')
  }
  // 第三页：在某一柱状图/名称气泡上停留 3 秒，自动弹出介绍卡片
  if (sp > 0.85 && markHover.value && markHover.value.record) {
    const rec = markHover.value.record
    if (hoverOpenKey !== rec) { hoverOpenKey = rec; hoverOpenStart = Date.now() }
    if (!markCardOpen.value && Date.now() - hoverOpenStart >= 3000) {
      openMarkCard(rec)
      hoverOpenKey = null
    }
  } else {
    hoverOpenKey = null
    hoverOpenStart = 0
  }

  // 第二页（卡牌环）：手势光标在某一卡片上停留 3 秒 → 自动跳转（不依赖握拳点击）
  if (sp > 0.45 && sp < 0.87 && navHoverCard && navHoverCard.userData.navPath) {
    const path = navHoverCard.userData.navPath
    if (navHoverCardKey !== path) { navHoverCardKey = path; navHoverCardStart = Date.now() }
    else if (Date.now() - navHoverCardStart >= 3000 && !document.body.classList.contains('dialog-open')) {
      navHoverCardKey = null
      navHoverCardStart = 0
      vib('medium')        // 悬停触发跳转：中震动反馈
      router.push({ path, query: { from: 'index', page: '2' } })
    }
  } else {
    navHoverCardKey = null
    navHoverCardStart = 0
  }
}

// 手势「握拳松开」：抬起拖拽（与鼠标抬起等价）
function onGestureRelease(e) {
  if (!store.isGesture) return
  onPtrUp()
}

// 手势「食指解锁」：保持食指(☝️)3 秒后解锁/解除地球缩放
function onGestureZoomArmed(e) {
  zoomArmed.value = e.detail.armed
  zoomLocked.value = false
  if (e.detail.armed) {
    emaDist = null                 // 重新解锁时重置平滑基准
    lastZoomChangeTime.value = Date.now()
  }
}

// 手势「捏合缩放」：第三页用拇指+食指距离控制地球缩放（捏合=放大，张开=缩小）
// 仅在「食指解锁」且未锁定时生效；其他时间不触发缩放
function onGesturePinch(e) {
  if (sp < 0.85) return                          // 仅第三页生效
  if (!zoomArmed.value || zoomLocked.value) return
  // EMA 平滑原始距离，滤除逐帧手部抖动（α 越小越平滑）
  const raw = e.detail.dist
  if (emaDist === null) emaDist = raw
  else emaDist += (raw - emaDist) * 0.15
  const d = emaDist                              // 用平滑值换算缩放
  const z = Math.max(0, Math.min(1, (d - 0.07) / (0.25 - 0.07)))
  const prev = cameraZoom
  cameraZoom = 1.1 + (1 - z) * (5.0 - 1.1)
  const diff = cameraZoom - prev
  if (Math.abs(diff) > 1e-3) zoomDir.value = diff > 0 ? 'in' : 'out'
  // 平滑后静止态相邻帧 diff 极小（约 0.003），主动缩放时明显更大。
  // 用平滑值的相邻差 > 0.03 判定「在缩放」，重置 2 秒倒计时。
  if (Math.abs(diff) > 0.03) {
    lastZoomChangeTime.value = Date.now()
  }
}

// 手势「食指进度」：实时回传食指伸出保持进度，用于提示文案
function onGesturePointHold(e) {
  pointProgress = e.detail.active ? (e.detail.progress || 0) : 0
}

// 手掌光标是否落在“向下滚动页面”按钮附近（放宽命中区，便于握拳翻页）
function hitScrollBtn(x, y, pad = 90) {
  const el = scrollDownEl.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
}

function onWheel(e) {
  // 弹窗打开时：不拦截滚轮，交由弹窗内容原生滚动，避免翻动底层页面
  if (document.body.classList.contains('dialog-open')) return
  e.preventDefault()
  if (sp > 0.85) {
    // 第三页：滚轮缩放地球，完全不触发翻页
    const prev = cameraZoom
    cameraZoom = Math.max(1.1, Math.min(5.0, cameraZoom + (e.deltaY > 0 ? 0.18 : -0.18)))
    // 滚轮是主动操作，每次滚轮都重置计时器
    lastZoomChangeTime.value = Date.now()
    return
  }
  if (snapLocked) return
  const dir = e.deltaY > 0 ? 1 : -1
  const next = Math.max(0, Math.min(2, snapPage + dir))
  if (next === snapPage) return
  snapLocked = true
  snapTo(next)
}

// ── 移动端触摸滑动翻页：模拟滚轮，竖向滑动切换页面（与桌面滚轮一致）──
// 悬浮 3D 画布(fixed, z-index:10)会拦截所有触摸，故需自行监听竖向滑动来翻页。
let tsX = 0, tsY = 0, tsActive = false
function onTouchStart(e) {
  if (document.body.classList.contains('dialog-open')) return
  const t = e.touches && e.touches[0]
  if (!t) return
  tsX = t.clientX; tsY = t.clientY; tsActive = true
}
function onTouchEnd(e) {
  if (!tsActive) return
  tsActive = false
  if (document.body.classList.contains('dialog-open')) return
  if (sp > 0.85) return            // 第三页（地球）：手势用于旋转地球，不翻页
  const t = e.changedTouches && e.changedTouches[0]
  if (!t) return
  const dx = t.clientX - tsX
  const dy = tsY - t.clientY       // 上滑为正
  if (Math.abs(dy) < 45) return    // 滑动距离过小，视为点按/拖动，不翻页
  if (Math.abs(dy) < Math.abs(dx)) return  // 横向滑动（拖动骰子）不翻页
  if (snapLocked) return
  const next = Math.max(0, Math.min(2, snapPage + (dy > 0 ? 1 : -1)))
  if (next === snapPage) return
  snapLocked = true
  snapTo(next)
}

// ── 移动端双指捏合缩放地球（仅第三页生效）──
let pinchPrevDist = 0
let pinching = false
function pinchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.hypot(dx, dy)
}
function onGlobeTouchStart(e) {
  if (store.isGesture) return
  if (sp <= 0.85) return
  if (e.touches && e.touches.length >= 2) {
    pinchPrevDist = pinchDist(e)
    pinching = true
    globeDragging = false   // 双指时禁用单指旋转
  }
}
function onGlobeTouchMove(e) {
  if (store.isGesture) return
  if (sp <= 0.85 || !pinching || !e.touches || e.touches.length < 2) return
  if (e.cancelable) e.preventDefault()   // 阻止页面随双指滚动/缩放
  const dist = pinchDist(e)
  if (pinchPrevDist > 0) {
    // 双指外扩 → 拉近相机(放大)；内收 → 拉远(缩小)
    const ratio = dist / pinchPrevDist
    cameraZoom = Math.max(1.1, Math.min(5.0, cameraZoom / ratio))
  }
  pinchPrevDist = dist
}
function onGlobeTouchEnd(e) {
  if (store.isGesture) return
  if (!e.touches || e.touches.length < 2) {
    pinchPrevDist = 0
    pinching = false
  }
}

// ── 昼夜灯光/骰子色调：白天暖调（贴合白昼场景），夜晚冷蓝调（贴合夜景）──
function applyDayNightLighting() {
  if (!ambientLight || !spotLight || !rimLight) return
  if (isDay.value) {
    // 白昼：暖白光，骰子本色（白骨色）
    ambientLight.color.set(0xfff8f2); ambientLight.intensity = 1.2
    spotLight.color.set(0xfff6ee);    spotLight.intensity = 3.2
    rimLight.color.set(0xfff0dc);     rimLight.intensity = 0.25
    if (diceMats) diceMats.forEach(m => { m.color.set(0xffffff); m.needsUpdate = true })
  } else {
    // 夜晚：仅一丁点冷蓝、整体仍偏白，不抢白昼观感
    ambientLight.color.set(0xeff3fc); ambientLight.intensity = 1.15
    spotLight.color.set(0xeff3fc);    spotLight.intensity = 3.1
    rimLight.color.set(0xeff3fc);     rimLight.intensity = 0.3
    if (diceMats) diceMats.forEach(m => { m.color.set(0xffffff); m.needsUpdate = true })
  }
}

// ── 昼夜切换：替换第一页背景图、前景手图、第二三页背景图 ──
function toggleDayNight() {
  isDay.value = !isDay.value
  applyDayNightLighting()   // 昼夜切换时同步灯光与骰子冷/暖调
  recolorGlobe()            // 昼夜切换时地球粒子/轮廓线同步换色
  // 昼夜切换：第二页导航卡牌配色同步（重新绘制纹理以应用昼夜双套配色）
  if (navCards3D && navCards3D.length) {
    navCards3D.forEach(c => c.userData.navTex && c.userData.navTex.redrawLogo && c.userData.navTex.redrawLogo())
  }
  const bgTex = isDay.value ? dayNightTex : nightTex
  const fgTex = isDay.value ? dayHandTex : handTex
  if (nightPlane && bgTex) {
    nightPlane.material.map = bgTex
    nightPlane.material.needsUpdate = true
    if (bgTex.image) nightPlane.userData.imgAR = bgTex.image.width / bgTex.image.height
    fitNightPlane()
  }
  if (handPlane && fgTex) {
    handPlane.material.map = fgTex
    handPlane.material.needsUpdate = true
    if (fgTex.image) handPlane.userData.imgAR = fgTex.image.width / fgTex.image.height
    fitHandPlane()
  }
}

function applyShowcaseQueryPage(pageRaw, fromRaw) {
  // 仅当从导航卡片（from=index）返回时才定位第二页；
  // 普通浏览器直接进入 /index（无 from）始终停在第一页，不会跳第二页。
  if (fromRaw !== 'index') return
  const page = Number(pageRaw)
  if (page !== 2) return
  const root = rootEl.value
  if (!root) return

  const targetY = root.clientHeight
  root.scrollTop = targetY
  scrollTarget = 0.5
  scrollLerp = 0.5
  scrollPercent.value = 50
  sp = 0.5
  snapPage = 1
  snapLocked = false
}

function cubicBez(t, p0, p1, p2, p3) {
  const u = 1 - t
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3
}

/* ── 骰子尺寸 ── */
const D  = 0.42
const DH = D / 2
const FLOOR_Y = -DH
const BG  = 0x000000   // ← 第一页背景（纯黑，配合夜景图）
const BG2 = 0xC8A882   // ← 第二页背景（暗一档，可在这里改颜色）
const BG3 = 0x8B5E38   // ← 第三页背景（地球深棕，可在这里改颜色）
const _bgA = new THREE.Color(BG)
const _bgB = new THREE.Color(BG2)
const _bgC = new THREE.Color(BG3)
const _bgColor = new THREE.Color()   // 复用，避免每帧 new（第一页背景色随过渡渐变透明）
// 翻页时骰子路径（cubic bezier 控制点）：先随页面向上，再弧线向左下落位
const DICE_PATH_X = [0, 0,    -0.22, -0.6]
const DICE_PATH_Y = [0, 0.30,  0.12,  0   ]
const DICE_PAGE1_Y_OFFSET = -0.1  // 首页第一页骰子整体下移量（负值=向下，正值=向上）；仅第一页生效，其他页不变

const E_CANVAS = 512               // 贴图尺寸（2^n，减少掠射角走样）
const EW = E_CANVAS, EH = E_CANVAS // 贴图坐标系

/* ── 【完全独立手写】右侧九幽太极重瞳金瞳（零状态机、平整不凹陷） ── */
let eyeCv2, eyeCtx2, eyeTex2
let pupX2 = EW / 2, pupY2 = EH / 2
let bT2 = 1.0
let bPhase2 = 'sealed'
let bPhaseStart2 = 0
let nextBlink2 = 0

function buildRightEye() {
  eyeCv2 = document.createElement('canvas')
  eyeCv2.width = E_CANVAS; eyeCv2.height = E_CANVAS
  eyeCtx2 = eyeCv2.getContext('2d')
  eyeTex2 = new THREE.CanvasTexture(eyeCv2)

  eyeTex2.generateMipmaps = true
  eyeTex2.minFilter = THREE.LinearMipmapLinearFilter
  eyeTex2.magFilter = THREE.LinearFilter

  eyeCtx2.fillStyle = '#F7F4ED'
  eyeCtx2.fillRect(0, 0, EW, EH)
  return eyeTex2
}

function triggerRightEyeAwaken() {
  bPhase2 = 'opening'
  bPhaseStart2 = performance.now() / 1000
  bT2 = 1.0
}

function drawRightEye(mx, my, W, H) {
  const ctx = eyeCtx2
  const CX = EW / 2, CY = EH / 2
  const RW = EW * 0.40   // 杏仁眼半宽（调此值改宽度）
  const RH = EH * 0.18   // 杏仁眼半高（上下对称）
  const eHmax = RH * 2.0 // 全开时 bezier 控制点偏移

  // 鼠标追踪（与左眼相同逻辑，以画布中心为参考）
  if (!isFinite(pupX2)) pupX2 = CX
  if (!isFinite(pupY2)) pupY2 = CY
  const MAX_MOVE2 = RW * 0.5
  const dx = mx - W / 2, dy = my - H / 2
  const ang = Math.atan2(dy, dx)
  const tr = Math.min(Math.hypot(dx, dy) / (Math.max(W, H) * 0.45), 1)
  pupX2 += (CX + Math.cos(ang) * tr * MAX_MOVE2 - pupX2) * 0.06
  pupY2 += (CY + Math.sin(ang) * tr * MAX_MOVE2 - pupY2) * 0.06

  // ── 眨眼状态机（与左眼时序相同） ──
  const now = performance.now() / 1000
  const el = now - bPhaseStart2
  if (bPhase2 === 'opening') {
    bT2 = Math.max(0, 1.0 - el / 0.9)
    if (el >= 0.9) { bT2 = 0; bPhase2 = 'blink1c'; bPhaseStart2 = now }
  } else if (bPhase2 === 'blink1c') {
    bT2 = Math.min(el / 0.09, 1.0)
    if (el >= 0.09) { bT2 = 1; bPhase2 = 'blink1o'; bPhaseStart2 = now }
  } else if (bPhase2 === 'blink1o') {
    bT2 = Math.max(0, 1.0 - el / 0.09)
    if (el >= 0.09) { bT2 = 0; bPhase2 = 'blink2c'; bPhaseStart2 = now }
  } else if (bPhase2 === 'blink2c') {
    bT2 = Math.min(el / 0.09, 1.0)
    if (el >= 0.09) { bT2 = 1; bPhase2 = 'blink2o'; bPhaseStart2 = now }
  } else if (bPhase2 === 'blink2o') {
    bT2 = Math.max(0, 1.0 - el / 0.13)
    if (el >= 0.13) { bT2 = 0; bPhase2 = 'idle'; nextBlink2 = now + 2.5 + Math.random() * 3.5 }
  } else if (bPhase2 === 'idle') {
    bT2 = 0
    if (now >= nextBlink2) { bPhase2 = 'blink-c'; bPhaseStart2 = now }
  } else if (bPhase2 === 'blink-c') {
    bT2 = Math.min(el / 0.08, 1.0)
    if (el >= 0.08) { bT2 = 1; bPhase2 = 'blink-o'; bPhaseStart2 = now }
  } else if (bPhase2 === 'blink-o') {
    bT2 = Math.max(0, 1.0 - el / 0.10)
    if (el >= 0.10) { bT2 = 0; bPhase2 = 'idle'; nextBlink2 = now + 2.5 + Math.random() * 4 }
  }
  const drawBT2 = bPhase2 === 'sealed' ? 1.0 : bT2
  const openT2  = 1.0 - drawBT2

  // ── 杏仁眼形路径（上下对称，随 openT2 开合） ──
  function almondAt2(ot) {
    const eH = eHmax * ot
    ctx.beginPath()
    ctx.moveTo(CX - RW, CY)
    ctx.bezierCurveTo(CX - RW * 0.65, CY - eH, CX + RW * 0.65, CY - eH, CX + RW, CY)
    ctx.bezierCurveTo(CX + RW * 0.65, CY + eH, CX - RW * 0.65, CY + eH, CX - RW, CY)
    ctx.closePath()
  }

  // 1. 巩膜底色（全画布，与左眼一致）
  ctx.fillStyle = '#E4DDD0'; ctx.fillRect(0, 0, EW, EH)
  const bgSclera = ctx.createRadialGradient(CX, CY - RH * 0.3, 0, CX, CY, EW * 0.7)
  bgSclera.addColorStop(0, '#FBF9F5'); bgSclera.addColorStop(0.5, '#F5F1EA'); bgSclera.addColorStop(1, '#E4DDD0')
  ctx.fillStyle = bgSclera; ctx.fillRect(0, 0, EW, EH)

  // 2. 眼球内容（随 openT2 开合）
  if (openT2 > 0.015) {
    ctx.save()
    almondAt2(openT2); ctx.clip()

    const sclera = ctx.createRadialGradient(CX, CY - RH * 0.3, 0, CX, CY, RW * 1.2)
    sclera.addColorStop(0, '#FBF9F5'); sclera.addColorStop(0.4, '#F5F1EA'); sclera.addColorStop(1, '#E4DDD0')
    ctx.fillStyle = sclera; ctx.fillRect(0, 0, EW, EH)

    const irisR = RH * 1.5
    const irisG = ctx.createRadialGradient(pupX2 - irisR * 0.15, pupY2 - irisR * 0.2, 0, pupX2, pupY2, irisR)
    // 渐变停靠点从 eyeColors 读取：金(亮调)亮色外推，其余(暗调)保持原样
    irisG.addColorStop(0, eyeColors.iris0)
    irisG.addColorStop(eyeColors.gS1, eyeColors.gC1)
    irisG.addColorStop(eyeColors.gS2, eyeColors.gC2)
    irisG.addColorStop(1, eyeColors.gC3)
    ctx.beginPath(); ctx.arc(pupX2, pupY2, irisR, 0, Math.PI * 2)
    ctx.fillStyle = irisG; ctx.fill()

    ctx.save()
    ctx.beginPath(); ctx.arc(pupX2, pupY2, irisR, 0, Math.PI * 2); ctx.clip()
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(pupX2 + Math.cos(a) * irisR * 0.22, pupY2 + Math.sin(a) * irisR * 0.22)
      ctx.lineTo(pupX2 + Math.cos(a) * irisR * 0.92, pupY2 + Math.sin(a) * irisR * 0.92)
      ctx.strokeStyle = `rgba(${eyeColors.fiber},0.14)`; ctx.lineWidth = 0.9; ctx.stroke()   // 放射纤维 = 主题主色
    }
    ctx.restore()

    const limbal = ctx.createRadialGradient(pupX2, pupY2, irisR * 0.68, pupX2, pupY2, irisR)
    limbal.addColorStop(0, 'rgba(0,0,0,0)'); limbal.addColorStop(1, `rgba(0,0,0,${eyeColors.limbal})`)   // 外缘暗环透明度随主题（金轻/其余重）
    ctx.beginPath(); ctx.arc(pupX2, pupY2, irisR, 0, Math.PI * 2)
    ctx.fillStyle = limbal; ctx.fill()

    const pupilR = irisR * 0.6
    const pupilG = ctx.createRadialGradient(pupX2 - pupilR * 0.2, pupY2 - pupilR * 0.2, 0, pupX2, pupY2, pupilR)
    pupilG.addColorStop(0, '#1A1008'); pupilG.addColorStop(1, '#040200')
    ctx.beginPath(); ctx.arc(pupX2, pupY2, pupilR, 0, Math.PI * 2)
    ctx.fillStyle = pupilG; ctx.fill()

    const eyeTopY = CY - eHmax * openT2
    const lidShadow = ctx.createLinearGradient(CX, eyeTopY, CX, CY - RH * 0.4 * openT2)
    lidShadow.addColorStop(0, 'rgba(30,15,4,0.24)'); lidShadow.addColorStop(1, 'rgba(30,15,4,0)')
    ctx.fillStyle = lidShadow; ctx.fillRect(0, 0, EW, EH)

    ctx.restore()
  }

  // 3. 眼眶描边（闭眼退化为水平细缝线）
  ctx.save()
  almondAt2(Math.max(openT2, 0.001))
  ctx.strokeStyle = eyeColors.edge; ctx.lineWidth = 2; ctx.stroke()   // 杏仁眼眼眶描边 = 主题深色
  ctx.restore()

  eyeTex2.needsUpdate = true
}

/* ── 骨制纹理（象牙白底 + 黑色点数） ── */
const PIPS = {
  0:[],
  1:[[.5,.5]],
  2:[[.28,.72],[.72,.28]],
  3:[[.28,.72],[.5,.5],[.72,.28]],
  4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
  5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],
  6:[[.28,.22],[.28,.5],[.28,.78],[.72,.22],[.72,.5],[.72,.78]],
}
function boneTex(n) {
  const cv=document.createElement('canvas'); cv.width=cv.height=256
  const ctx=cv.getContext('2d')
  const g=ctx.createLinearGradient(0,0,160,256)
  g.addColorStop(0,'#FFFFFF'); g.addColorStop(.35,'#FEFEFE')
  g.addColorStop(.65,'#FDFDFD'); g.addColorStop(1,'#F9F9F9')
  ctx.fillStyle=g; ctx.fillRect(0,0,256,256)
  ctx.strokeStyle='rgba(160,160,160,.04)'; ctx.lineWidth=.5
  for(let i=0;i<256;i+=8){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+10,256); ctx.stroke() }
  const v=ctx.createRadialGradient(128,128,0,128,128,155)
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(15,15,15,.08)')
  ctx.fillStyle=v; ctx.fillRect(0,0,256,256)
  for(const [u,uv] of PIPS[n]){
    const x=u*256, y=uv*256
    const r = n === 1 ? 28 : 19  // 1点一般更大更圆，凸显朱砂红质感
    // 坑沿 AO 阴影
    const ao=ctx.createRadialGradient(x,y,r*0.7,x,y,r*1.5)
    ao.addColorStop(0,'rgba(0,0,0,0.14)'); ao.addColorStop(1,'rgba(0,0,0,0)')
    ctx.beginPath(); ctx.arc(x,y,r*1.5,0,Math.PI*2); ctx.fillStyle=ao; ctx.fill()
    // 坑体：右下深、左上稍亮（模拟光从左上打进凹坑）
    const p = ctx.createRadialGradient(x-5,y-6,1,x+4,y+5,r)
    if (n === 1) {
      // 1点：精美华贵的中国风朱砂红（一点红）
      p.addColorStop(0,'#E61E1E'); p.addColorStop(0.42,'#A80A0A'); p.addColorStop(1,'#470000')
    } else {
      p.addColorStop(0,'#2C1C10'); p.addColorStop(0.45,'#150C07'); p.addColorStop(1,'#040201')
    }
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=p; ctx.fill()
    // 坑内左上高光（凹面反光）
    const hl=ctx.createRadialGradient(x-7,y-8,0,x,y,r)
    if (n === 1) {
      hl.addColorStop(0,'rgba(255,230,225,0.28)'); hl.addColorStop(0.4,'rgba(255,200,195,0.06)'); hl.addColorStop(1,'rgba(0,0,0,0)')
    } else {
      hl.addColorStop(0,'rgba(255,248,235,0.22)'); hl.addColorStop(0.4,'rgba(255,248,235,0.04)'); hl.addColorStop(1,'rgba(0,0,0,0)')
    }
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=hl; ctx.fill()
    ctx.strokeStyle='rgba(0,0,0,0.14)'; ctx.lineWidth=0.8
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke()
  }
  return new THREE.CanvasTexture(cv)
}

// 点数凹陷法线贴图：把每个点数编码为凹球法线，让灯光真实地在坑里折射
function pipsNormalMap(n) {
  const cv=document.createElement('canvas'); cv.width=cv.height=256
  const ctx=cv.getContext('2d')
  ctx.fillStyle='#8080ff'; ctx.fillRect(0,0,256,256)  // 平面默认法线 (0,0,1)
  const id=ctx.getImageData(0,0,256,256); const d=id.data
  const pipR = n === 1 ? 29 : 20
  for(const [u,uv] of PIPS[n]){
    const cx=u*256, cy=uv*256
    for(let py=Math.floor(cy-pipR);py<=Math.ceil(cy+pipR);py++){
      for(let px=Math.floor(cx-pipR);px<=Math.ceil(cx+pipR);px++){
        if(px<0||px>=256||py<0||py>=256) continue
        const dx=px-cx, dy=py-cy
        const dist=Math.sqrt(dx*dx+dy*dy)
        if(dist>=pipR) continue
        const t=Math.sin((dist/pipR)*Math.PI*0.5)  // 正弦缓动，坑壁更圆滑
        const inv=dist<0.01?0:1/dist
        // 凹球：法线朝向坑中心（与凸球相反）
        const nx=-(dx*inv)*t
        const ny= (dy*inv)*t  // 翻转 Y 适配 OpenGL/Three.js 惯例
        const nz=Math.sqrt(Math.max(0,1-t*t))
        const i=(py*256+px)*4
        d[i]  =Math.round((nx*0.5+0.5)*255)
        d[i+1]=Math.round((ny*0.5+0.5)*255)
        d[i+2]=Math.round((nz*0.5+0.5)*255)
        d[i+3]=255
      }
    }
  }
  ctx.putImageData(id,0,0)
  return new THREE.CanvasTexture(cv)
}

// 点数位移贴图：黑底(0)=面不动，白点(1)=向内凹
// 公式：displacement = texture * displacementScale + displacementBias
// 黑(0) * (-0.022) + 0 = 0，白(1) * (-0.022) + 0 = -0.022（沿法线向内）
function pipsDispMap(n) {
  const S=512
  const cv=document.createElement('canvas'); cv.width=cv.height=S
  const ctx=cv.getContext('2d')
  ctx.fillStyle='#000000'; ctx.fillRect(0,0,S,S)  // 黑底 = 0 = 顶点不偏移
  const r = Math.round((n === 1 ? 31 : 22)/256*S)
  for(const [u,uv] of PIPS[n]){
    const x=u*S, y=uv*S
    const g=ctx.createRadialGradient(x,y,0,x,y,r)
    g.addColorStop(0,   '#ffffff')  // 坑底中心：最大偏移
    g.addColorStop(0.55,'#aaaaaa')  // 坑壁中段
    g.addColorStop(1.0, '#000000')  // 平滑过渡回面
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2)
    ctx.fillStyle=g; ctx.fill()
  }
  return new THREE.CanvasTexture(cv)
}

/* ── Three.js ── */
let renderer, scene, camera, dice2, eyeDome, glowSprite, spotLight, mouseLight, floorMesh
let ambientLight = null   // 环境光（昼夜冷/暖切换）
let rimLight = null       // 轮廓光（昼夜冷/暖切换）
let diceMats = null       // 骰子六面材质（昼夜色调切换）
let orbitSphere, orbitSphere2, orbitParticles
let orbitCardFaceMat = null   // 轨道2 卡牌正/背面材质（主题切换时换贴图）
let orbitAngle = 0
let orbitCoinSpin = 0
const ORBIT_N = 220
let orbBase, orbCur, orbVel, orbPhase, orbRand, orbInited = false

// 轨道2 状态
let orbitParticles2
let orbitCards2 = []
let orbitAngle2 = 0
let orb2CardSpin = 0
let orb2Base, orb2Cur, orb2Vel, orb2Phase, orb2Rand, orb2Inited = false
let navCards3D = []
let navCardAngle = 0
let navVibStep = 0             // 上次触发震动的量化步进：每跨一步轻震一次，类似塔罗扇形牌区
// ── 卡牌环拖拽交互 ──
let navDragActive = false      // 用户正在拖拽卡片环
let navDragPrevX = 0           // 上次鼠标 X（用于计算速度）
let navAngularVel = 0          // 惯性速度
let navDownX = 0, navDownY = 0 // 按下位置（用于区分点击 vs 拖拽）
let navPendingCard = null      // 按下时击中的卡片路径（点击时跳转）
const NAV_DRAG_DAMP = 0.96     // 惯性衰减
const NAV_DRAG_SENS = 0.0025   // 像素→弧度灵敏度
const NAV_VEL_THRESH = 0.00005  // 惯性停止阈值
// 预分配帧内复用对象，避免 GC 压力
const _oRc   = new THREE.Raycaster()
const _oPlane = new THREE.Plane()
const _oMPos  = new THREE.Vector3()
const _oNorm  = new THREE.Vector3()
const _oCoPt  = new THREE.Vector3()
const _oNDC   = new THREE.Vector2()
const ORBIT_R      = 0.8           // 水平半径
const ORBIT_RV     = 0.5          // 垂直幅度（=ORBIT_R 正圆，< 扁椭圆）
const ORBIT_TILT   = Math.PI / 7  // 绕 X 轴倾角（给轨道深度感）
const ORBIT_TILT_Z = Math.PI / -15   // 绕 Z 轴倾角（产生对角倾斜，改此值）
const ORBIT_Y      = 0.1          // 轨道中心抬高量（正值↑，避免嵌入地面）
const ORBIT_HOVER_R = 0.16        // 指针射线到轨道环的判定阈值（世界单位，越小越难触发，可调）

// ══════════════════════════════════════════════════════════════
//  轨道2 参数 —— 所有形状/卡牌调整都在这里
// ══════════════════════════════════════════════════════════════
const ORBIT2_R      = 0.6        // 水平半径（越大轨道越宽）
const ORBIT2_RV     = 0.4        // 垂直幅度（= ORBIT2_R 为正圆，< 为扁椭圆，> 为纵椭圆）
const ORBIT2_TILT   = Math.PI / 10  // 绕 X 轴倾角（0=水平躺平，Math.PI/2=竖直立起）
const ORBIT2_TILT_Z = Math.PI / 20   // 绕 Z 轴倾角（控制倾斜方向，负值反向）
const ORBIT2_Y      = 0.05       // 轨道中心高度偏移（正值↑，负值↓）
const ORBIT2_N      = 180        // 粒子数量
const ORBIT2_COLOR  = 0xD4B868   // 粒子颜色
const ORBIT2_SIZE   = 0.011      // 粒子大小
const ORBIT2_OPACITY = 0.75      // 粒子不透明度
const ORBIT2_CARD_W   = 0.07     // 卡牌宽度（Three.js 单位）—— 在这里改大小
const ORBIT2_CARD_H   = 0.1    // 卡牌高度（塔罗比例约 2:3）—— 在这里改大小
const ORBIT2_CARD_R   = 0.08     // 圆角半径（占宽度的比例，0=直角，0.15=很圆）
const ORBIT2_CARD_D   = 0.005    // 卡牌厚度 —— 在这里改
const ORBIT2_CARD_GAP = 0.1     // 三牌间角度间距（弧度，越小越挨近）—— 在这里改间距
const ORBIT2_CARD_SPIN = 0.5     // 卡牌绕自身法线轴的自转速度
const ORBIT2_SPEED  = -0.40      // 公转速度（负值=反向，绝对值越大越快）

// 第二页功能卡牌 3D 圆环（真实 Three.js 物体，会被骰子深度遮挡）
const NAV_CARD_R       = 1.3      // 圆环半径，越大越远离骰子
const NAV_CARD_Z_SCALE = 0.5      // 轨道前后深度比例，越大 3D 深度越强
const NAV_CARD_Y       = 0.13      // 圆环中心高度偏移；调高可避免下方卡牌碰到桌面
const NAV_CARD_W       = 0.5      // 卡牌宽度
const NAV_CARD_H       = 0.6      // 卡牌高度
const NAV_CARD_D       = 0.012     // 卡牌厚度（预留参数，当前平面卡牌不使用）
const NAV_CARD_SPEED   = 0.05      // 公转速度（弧度/秒）
const NAV_CARD_OPACITY = 0.96      // 白色卡牌最高不透明度
const NAV_CARD_TILT_X  = Math.PI / -2.8  // 轨道绕 X 轴倾斜角
const NAV_CARD_TILT_Z  = -Math.PI / 1 // 轨道绕 Z 轴倾斜角
const NAV_HOVER_SCALE  = 0.14      // 悬停放大比例
const NAV_HOVER_GLOW   = 0.5      // 悬停辉光强度
const NAV_MAGNET_X     = 0.070     // 磁吸横向幅度（非对称：X 更强）
const NAV_MAGNET_Y     = 0.038     // 磁吸纵向幅度
// ══════════════════════════════════════════════════════════════
const _navCardMat = new THREE.Matrix4()
const _navCardRight = new THREE.Vector3()
const _navCardUp = new THREE.Vector3()
const _navCardForward = new THREE.Vector3()
const _navCardQuat = new THREE.Quaternion()
const _navHoverEuler = new THREE.Euler()
const _navHoverQuat = new THREE.Quaternion()
const _navHitLocal = new THREE.Vector3()
const _navMagRight = new THREE.Vector3()
const _navMagUp = new THREE.Vector3()
const _navMagOffset = new THREE.Vector3()
let navGlowTex = null
let navHoverCard = null
let navHoverCardKey = null    // 当前停留的卡片路径（同一卡片连续停留才计时）
let navHoverCardStart = 0    // 开始停留的时间戳（第二页停留 3 秒自动跳转）
let animId = null, prevTime = 0
let globeWrap = null
let ro = null
let nightTex = null    // 第一页夜晚背景纹理
let nightReady = false
let nightPlane = null  // 第一页夜晚背景平面（跟随相机，按原比例 contain，不拉伸）
let handTex = null     // 手前景纹理
let handReady = false
let handPlane = null   // 手前景平面
let handScene = null   // 手前景独立 overlay 场景（单独 render 一次，保证绝对画在骰子最前，不依赖渲染队列排序）
let dayNightTex = null, dayHandTex = null   // 昼间背景图 / 昼间手图纹理（昼夜切换时使用）
let dayNightReady = false, dayHandReady = false
const HAND_OFFSET_X_FRAC = 0      // 手相对背景图的水平偏移（视野宽的比例；正值=右，负值=左；0=与背景图水平居中重叠）
const HAND_OFFSET_Y_FRAC = 0      // 手相对背景图的垂直偏移（视野高的比例；正值=上，负值=下；0=与背景图垂直居中重叠）

let mouseX=0, mouseY=0
let isDragging=false, dragLastX=0, dragLastY=0
let dragQuat=new THREE.Quaternion()
let baseQuat2=new THREE.Quaternion()
let followRX=0, followRY=0, tFollowRX=0, tFollowRY=0

// 骰子 2 (传统朱砂红一点) 的物理变量
let fallY2=1.9, fallVY2=0, fallBounces2=0  // 高度微调使掉落错落有致
let fallAVX2=(Math.random()-.5)*.22
let fallAVY2=(Math.random()-.5)*.22
let fallAVZ2=(Math.random()-.5)*.14

let alignStarted=false

let curPhase='fall'
let retFrom2=null, retT=0

const FACE1=new THREE.Quaternion() // 眼睛面正对摄像机，不旋转、不颠倒

// 指针射线到轨道环（倾斜椭圆）的最小距离：用于"鼠标/手指经过轨道"悬停检测
// 采样椭圆上若干点，取每个点到射线的最近距离的最小值
function orbitRingDist(ray, cx, cy, cz, R, RV, TX, TZ, expand) {
  const ox = ray.origin.x, oy = ray.origin.y, oz = ray.origin.z
  const dx = ray.direction.x, dy = ray.direction.y, dz = ray.direction.z
  let minD = Infinity
  const SAMP = 48
  for (let s = 0; s < SAMP; s++) {
    const a = (s / SAMP) * Math.PI * 2
    const px0 = R  * expand * Math.cos(a)
    const py0 = -RV * expand * Math.sin(a) * Math.sin(TX)
    const pz0 =  RV * expand * Math.sin(a) * Math.cos(TX)
    const wx = cx + px0 * Math.cos(TZ) - py0 * Math.sin(TZ)
    const wy = cy + px0 * Math.sin(TZ) + py0 * Math.cos(TZ)
    const wz = cz + pz0
    const vx = wx - ox, vy = wy - oy, vz = wz - oz
    const t = vx * dx + vy * dy + vz * dz   // 投影到射线方向的参数
    let d
    if (t <= 0) {
      d = Math.sqrt(vx * vx + vy * vy + vz * vz)
    } else {
      const rx = ox + dx * t, ry = oy + dy * t, rz = oz + dz * t
      d = Math.sqrt((wx - rx) ** 2 + (wy - ry) ** 2 + (wz - rz) ** 2)
    }
    if (d < minD) minD = d
  }
  return minD
}

// 动态粒子轨道（物理弹簧 + 鼠标扰动）
function buildOrbitRing() {
  orbBase  = new Float32Array(ORBIT_N * 3)
  orbCur   = new Float32Array(ORBIT_N * 3)  // 直接作为 BufferGeometry 数据
  orbVel   = new Float32Array(ORBIT_N * 3)
  orbPhase = new Float32Array(ORBIT_N)
  orbRand  = new Float32Array(ORBIT_N * 3)  // 每粒子固定的随机偏移（[-1,1]³），营造木星环般弥散厚度
  orbInited = false
  for (let i = 0; i < ORBIT_N; i++) {
    orbPhase[i] = Math.random() * Math.PI * 2
    orbRand[i*3]   = Math.random() * 2 - 1
    orbRand[i*3+1] = Math.random() * 2 - 1
    orbRand[i*3+2] = Math.random() * 2 - 1
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(orbCur, 3))
  const mat = new THREE.PointsMaterial({
    color: currentTheme.value.primary, size: 0.014, transparent: true,   // 轨道1粒子色 = 主题主色
    opacity: 0.85, sizeAttenuation: true, depthWrite: false,
  })
  return new THREE.Points(geo, mat)
}

function buildOrbitRing2() {
  orb2Base  = new Float32Array(ORBIT2_N * 3)
  orb2Cur   = new Float32Array(ORBIT2_N * 3)
  orb2Vel   = new Float32Array(ORBIT2_N * 3)
  orb2Phase = new Float32Array(ORBIT2_N)
  orb2Rand  = new Float32Array(ORBIT2_N * 3)  // 每粒子固定的随机偏移（[-1,1]³）
  orb2Inited = false
  for (let i = 0; i < ORBIT2_N; i++) {
    orb2Phase[i] = Math.random() * Math.PI * 2
    orb2Rand[i*3]   = Math.random() * 2 - 1
    orb2Rand[i*3+1] = Math.random() * 2 - 1
    orb2Rand[i*3+2] = Math.random() * 2 - 1
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(orb2Cur, 3))
  const mat = new THREE.PointsMaterial({
    color: currentTheme.value.primary, size: ORBIT2_SIZE, transparent: true,   // 轨道2粒子色 = 主题主色
    opacity: ORBIT2_OPACITY, sizeAttenuation: true, depthWrite: false,
  })
  return new THREE.Points(geo, mat)
}

// 生成圆角遮罩（alphaMap），让卡牌四角透明
function makeRoundAlphaMap() {
  const W = 128, H = 192
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const r = ORBIT2_CARD_R * W
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(W - r, 0)
  ctx.quadraticCurveTo(W, 0, W, r)
  ctx.lineTo(W, H - r)
  ctx.quadraticCurveTo(W, H, W - r, H)
  ctx.lineTo(r, H)
  ctx.quadraticCurveTo(0, H, 0, H - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()
  return new THREE.CanvasTexture(cv)
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function makeNavCardTexture(card) {
  const W = 320, H = 420
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter

  const draw = (img) => {
    const x = 36, y = 34, w = 248, h = 344, r = 34
    // 昼夜双套配色：白昼温暖米白卡，夜晚深色卡（适合暗背景）
    const palette = isDay.value ? {
      shadow: 'rgba(64, 34, 10, 0.28)',
      shadowBlur: 22,
      fill: 'rgba(255,255,255,0.96)',
      bgTop: '#ffffff', bgMid: '#fbf7ef', bgBot: '#f1e4d2',
      gloss0: 'rgba(255,255,255,0.82)', gloss1: 'rgba(255,255,255,0.18)', gloss2: 'rgba(255,255,255,0)',
      stroke: '#b9852d', strokeAlpha: 0.16,
      iconCircle: `rgba(${hexToRgbArr(currentTheme.value.primaryLight).join(',')},0.5)`,
      title: currentTheme.value.primaryDark,
      subAlpha: 0.5,
    } : {
      shadow: 'rgba(0, 0, 0, 0.55)',
      shadowBlur: 26,
      fill: 'rgba(28, 33, 48, 0.96)',
      bgTop: '#2a3147', bgMid: '#222a3d', bgBot: '#191f2e',
      gloss0: 'rgba(255,255,255,0.14)', gloss1: 'rgba(255,255,255,0.05)', gloss2: 'rgba(255,255,255,0)',
      stroke: '#caa14e', strokeAlpha: 0.30,
      iconCircle: `rgba(${hexToRgbArr(currentTheme.value.primaryDark).join(',')},0.5)`,
      title: currentTheme.value.primaryLight,
      subAlpha: 0.85,
    }

    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.shadowColor = palette.shadow
    ctx.shadowBlur = palette.shadowBlur
    ctx.shadowOffsetY = 12
    drawRoundRect(ctx, x, y, w, h, r)
    ctx.fillStyle = palette.fill
    ctx.fill()
    ctx.restore()

    drawRoundRect(ctx, x, y, w, h, r)
    const bg = ctx.createLinearGradient(x, y, x + w, y + h)
    bg.addColorStop(0, palette.bgTop)
    bg.addColorStop(0.58, palette.bgMid)
    bg.addColorStop(1, palette.bgBot)
    ctx.fillStyle = bg
    ctx.fill()

    const gloss = ctx.createLinearGradient(x, y, x + w, y + h * 0.55)
    gloss.addColorStop(0, palette.gloss0)
    gloss.addColorStop(0.34, palette.gloss1)
    gloss.addColorStop(1, palette.gloss2)
    drawRoundRect(ctx, x + 10, y + 10, w - 20, h - 20, r - 12)
    ctx.fillStyle = gloss
    ctx.fill()

    ctx.save()
    ctx.globalAlpha = palette.strokeAlpha
    ctx.strokeStyle = palette.stroke
    ctx.lineWidth = 2
    drawRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, r)
    ctx.stroke()
    ctx.restore()

    const ix = W / 2, iy = 154
    ctx.save()
    ctx.beginPath()
    ctx.arc(ix, iy, 55, 0, Math.PI * 2)
    ctx.fillStyle = palette.iconCircle
    ctx.fill()
    ctx.restore()

    if (img) {
      const s = 78
      const drawImg = (!isDay.value && img) ? tintImageToColor(img, currentTheme.value.primaryLight) : img
      ctx.drawImage(drawImg, ix - s / 2, iy - s / 2, s, s)
    }

    // 主标题：白昼用主题深色，夜晚用 primaryLight，随主题实时变化
    ctx.fillStyle = palette.title
    ctx.font = '700 30px system-ui, -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(card.text, W / 2, 264)

    // 副标题：白昼用主色（primary）半透明；夜晚用 primaryLight
    const subCol = isDay.value ? currentTheme.value.primary : currentTheme.value.primaryLight
    const [sr, sg, sb] = hexToRgbArr(subCol)
    ctx.fillStyle = `rgba(${sr},${sg},${sb},${palette.subAlpha})`
    ctx.font = '500 18px system-ui, -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif'
    ctx.fillText('不必纠结 随天意', W / 2, 305)
    tex.needsUpdate = true
  }

  const loadLogo = () => {
    const im = new Image()
    im.onload = () => draw(im)
    im.src = store.getThemeIconDir() + card.activeIconFile   // 目录随主题变 → 图标换主题色
  }
  draw(null)
  loadLogo()
  tex.redrawLogo = loadLogo   // 换主题时重画 LOGO（目录随主题变化），供 applyThemeToScene 调用
  return tex
}

function makeNavGlowTexture() {
  const W = 320, H = 420
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')

  // 与主卡牌纹理的圆角矩形保持一致，确保光框严格贴边
  const x = 36, y = 34, w = 248, h = 344, r = 34

  ctx.clearRect(0, 0, W, H)

  // 仅做贴边微光：柔光外沿 + 细描边
  ctx.save()
  ctx.shadowColor = 'rgba(219, 168, 66, 0.46)'
  ctx.shadowBlur = 10
  ctx.lineWidth = 2.2
  ctx.strokeStyle = 'rgba(255, 232, 176, 0.78)'
  drawRoundRect(ctx, x, y, w, h, r)
  ctx.stroke()
  ctx.restore()

  ctx.lineWidth = 1.0
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.52)'
  drawRoundRect(ctx, x, y, w, h, r)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildNavCardRing() {
  navCards3D = []
  if (!navGlowTex) navGlowTex = makeNavGlowTexture()
  const geo = new THREE.PlaneGeometry(NAV_CARD_W, NAV_CARD_H)
  FLOAT_CARDS.forEach((card) => {
    const tex = makeNavCardTexture(card)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      alphaTest: 0.02,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    mesh.userData.navPath = card.path
    mesh.userData.navTex = tex   // 存纹理引用，换主题时重画 LOGO
    mesh.userData.hoverT = 0
    mesh.userData.targetMagX = 0
    mesh.userData.targetMagY = 0
    mesh.userData.magX = 0
    mesh.userData.magY = 0

    const glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: navGlowTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    }))
    glow.visible = false
    glow.renderOrder = 40
    glow.position.z = 0.002
    glow.scale.set(1.0, 1.0, 1)
    mesh.add(glow)
    mesh.userData.glow = glow

    scene.add(mesh)
    navCards3D.push(mesh)
  })
}

function getNavCardOpacity() {
  if (particlePhase !== 'dice') return 0
  const s = sp * 100
  if (s <= 22) return 0
  if (s <= 40) return (s - 22) / 18
  if (s <= 62) return 1
  if (s <= 80) return 1 - (s - 62) / 18
  return 0
}

function updateNavCardRing(t, dt) {
  if (!dice2 || navCards3D.length === 0) return
  const opacity = getNavCardOpacity()
  const visible = opacity > 0.01
  const hoverActive = !!navHoverCard && visible
  // ── 拖拽惯性衰减 ──
  if (!navDragActive && !isDragging && Math.abs(navAngularVel) > NAV_VEL_THRESH) {
    navCardAngle += navAngularVel
    navAngularVel *= NAV_DRAG_DAMP
  } else if (Math.abs(navAngularVel) <= NAV_VEL_THRESH) {
    navAngularVel = 0
  }

  // ── 无拖拽/惯性时自动旋转（悬停时暂停） ──
  const noDragActivity = Math.abs(navAngularVel) < NAV_VEL_THRESH && !navDragActive
  if (noDragActivity) {
    navCardAngle += dt * NAV_CARD_SPEED * (hoverActive ? 0 : 1)
  }

  const cX = Math.cos(NAV_CARD_TILT_X), sX = Math.sin(NAV_CARD_TILT_X)
  const cZ = Math.cos(NAV_CARD_TILT_Z), sZ = Math.sin(NAV_CARD_TILT_Z)
  const cx = dice2.position.x
  const cy = dice2.position.y + NAV_CARD_Y
  const cz = dice2.position.z

  navCards3D.forEach((card, i) => {
    const u = card.userData
    card.visible = visible
    const isHover = visible && navHoverCard === card

    u.hoverT += ((isHover ? 1 : 0) - u.hoverT) * 0.18
    u.magX += (u.targetMagX - u.magX) * 0.18
    u.magY += (u.targetMagY - u.magY) * 0.18

    card.material.opacity = opacity * NAV_CARD_OPACITY
    if (!visible) {
      const glowHide = u.glow
      if (glowHide) {
        glowHide.visible = false
        glowHide.material.opacity = 0
      }
      return
    }

    const a = navCardAngle + i / navCards3D.length * Math.PI * 2
    const lx = NAV_CARD_R * Math.cos(a)
    const ly = Math.sin(t * 0.55 + i * 1.37) * 0.018
    const lz = NAV_CARD_R * NAV_CARD_Z_SCALE * Math.sin(a)

    const x1 = lx
    const y1 = ly * cX - lz * sX
    const z1 = ly * sX + lz * cX
    const x2 = x1 * cZ - y1 * sZ
    const y2 = x1 * sZ + y1 * cZ

    card.position.set(cx + x2, cy + y2, cz + z1)
    _navCardForward.subVectors(camera.position, card.position).normalize()
    _navCardRight.crossVectors(camera.up, _navCardForward).normalize()
    _navCardUp.crossVectors(_navCardForward, _navCardRight).normalize()

    _navMagOffset.copy(_navCardRight).multiplyScalar(u.magX)
    _navMagOffset.addScaledVector(_navCardUp, u.magY)
    card.position.add(_navMagOffset)

    _navCardMat.makeBasis(_navCardRight, _navCardUp, _navCardForward)
    _navCardQuat.setFromRotationMatrix(_navCardMat)

    _navHoverEuler.set(-u.magY * 1.45, u.magX * 1.35, -u.magX * 0.75)
    _navHoverQuat.setFromEuler(_navHoverEuler)
    card.quaternion.copy(_navCardQuat).multiply(_navHoverQuat)

    const depthScale = 0.92 + Math.max(0, z1) * 0.20
    const pulse = 1 + Math.sin(t * 1.2 + i) * 0.015
    const hoverScale = 1 + u.hoverT * NAV_HOVER_SCALE
    card.scale.setScalar(depthScale * pulse * hoverScale)

    const glow = u.glow
    if (glow) {
      glow.visible = u.hoverT > 0.03
      glow.material.opacity = u.hoverT * NAV_HOVER_GLOW * opacity
      const gs = 1 + u.hoverT * 0.015
      glow.scale.set(gs, gs, 1)
    }
  })
}


// 卡牌自转四元数（预分配，避免每帧 GC）
const _cardSpinQ    = new THREE.Quaternion()
const _cardSpinAxis = new THREE.Vector3(0, 0, 1)

// 生成杏仁形穹顶几何体（仅杏仁眼轮廓内凸起，轮廓外 z=0）
// ax/ay 与 drawRightEye 中 RW=EW*0.40、bezier 弧高≈RH*1.5 保持比例一致
function buildDomeGeo(W, H, segs, height) {
  const geo = new THREE.PlaneGeometry(W, H, segs, segs)
  const pos = geo.attributes.position
  const R = 0.80  // 正圆半径，左右与杏仁眼齐，上下自然超出杏仁更圆润
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / (W * 0.5)
    const ny = pos.getY(i) / (H * 0.5)
    const nr2 = (nx * nx + ny * ny) / (R * R)
    pos.setZ(i, nr2 < 1 ? height * (1 - nr2) * (1 - nr2) : 0)
  }
  geo.computeVertexNormals()
  return geo
}

function easeBack(t){
  return 1+2.70158*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2)
}

function initThree(el) {
  const rect = el.getBoundingClientRect()
  const W = Math.round(rect.width)  || el.offsetWidth  || window.innerWidth
  const H = Math.round(rect.height) || el.offsetHeight || window.innerHeight

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })   // alpha:true 让画布透明，DOM 背景图层可透出
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
  renderer.setSize(W,H)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000000, 0)   // 画布保持透明，背景交给下方 DOM 图层
  renderer.domElement.style.display = 'block'
  // 第一页夜晚鼠标光标：源图超过浏览器 128px 上限会被忽略，运行时缩放到 ≤128 再设置；
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(BG)
  // 第一页夜晚背景纹理
  const nightUrl = new URL('../../public/images/background/夜晚2.png', import.meta.url).href
  nightTex = new THREE.TextureLoader().load(nightUrl, (tex) => {
    nightReady = true
    nightTex.image && (nightPlane.userData.imgAR = tex.image.width / tex.image.height)
    fitNightPlane()
  })
  nightTex.colorSpace = THREE.SRGBColorSpace

  camera = new THREE.PerspectiveCamera(50, W/H, 0.01, 30)
  camera.position.set(0, 0, 2.4444)

  // 跟随相机的背景平面：不透明，renderOrder:-100 最先渲染，必然在骰子下层；按原比例 contain，不拉伸
  const nightMat = new THREE.MeshBasicMaterial({ map: nightTex, depthTest: true, depthWrite: false, transparent: true })
  nightPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), nightMat)
  nightPlane.renderOrder = -100
  nightPlane.position.set(0, 0, -5)
  nightPlane.visible = false   // 纹理就绪前不显示，避免无图时白屏
  nightPlane.userData.imgAR = 1
  camera.add(nightPlane)
  scene.add(camera)
  fitNightPlane()

  // 「手」前景平面：放进独立 overlay 场景，每帧单独 render 一次，从机制上保证绝对画在骰子最前，
  // 不再依赖 renderOrder 排序（骰子淡入/可交互时会被设为 transparent，与手同处透明队列，单纯 renderOrder
  // 在复杂队列下压不住，导致手被骰子盖住）。位置按相机实时计算（见 fitHandPlane / updateHandTransform），
  // 高度填满、比例不变、叠加按视野比例的偏移 → 跨设备（手机/桌面）与背景图相对位置一致。
  // 去除透明 PNG 边缘的杂边（黑边/白边）：半透明像素往往被导出时的背景色污染（黑底→黑边，白底→白边）。
  // 这里把每个半透明像素的 RGB 替换成其邻域最近的不透明手部实色，保留 alpha 渐变 → 边缘纯净，无黑无白边。
  function decontaminate(src) {
    const w = src.width, h = src.height
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const ctx = cv.getContext('2d')
    ctx.drawImage(src, 0, 0)
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    const copy = new Uint8ClampedArray(d)   // 读源，避免被替换结果影响邻域采样
    const RAD = 2
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const a = d[i + 3]
        if (a >= 250 || a === 0) continue   // 不透明 / 全透明：不动；只处理半透明边缘
        let fr = -1, fg = -1, fb = -1, best = 1e9
        for (let dy = -RAD; dy <= RAD; dy++) {
          for (let dx = -RAD; dx <= RAD; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            const j = (ny * w + nx) * 4
            if (copy[j + 3] >= 250) {
              const dist = dx * dx + dy * dy
              if (dist < best) { best = dist; fr = copy[j]; fg = copy[j + 1]; fb = copy[j + 2] }
            }
          }
        }
        if (fr >= 0) { d[i] = fr; d[i + 1] = fg; d[i + 2] = fb }   // 染成最近手部实色，alpha 不变
      }
    }
    ctx.putImageData(img, 0, 0)
    return cv
  }

  const handUrl = new URL('../../public/images/background/夜晚-手.png', import.meta.url).href
  handScene = new THREE.Scene()
  handTex = new THREE.TextureLoader().load(handUrl, (tex) => {
    handReady = true
    if (tex.image) { tex.image = decontaminate(tex.image); tex.needsUpdate = true }  // 白边/杂边染成手部实色
    handTex.image && (handPlane.userData.imgAR = tex.image.width / tex.image.height)
    fitHandPlane()
  })
  handTex.colorSpace = THREE.SRGBColorSpace
  // 直 Alpha 混合（premultiplyAlpha=false）：预乘会把浅色边缘 RGB×alpha 压暗、在浅色背景上显成黑边。
  // 边缘杂色改用 decontaminate() 在加载时染成手部实色来消除，而不是靠预乘。关 mipmap 避免缩小时边缘渗入。
  handTex.premultiplyAlpha = false
  handTex.generateMipmaps = false
  handTex.minFilter = THREE.LinearFilter
  handTex.magFilter = THREE.LinearFilter
  handTex.wrapS = handTex.wrapT = THREE.ClampToEdgeWrapping
  handTex.needsUpdate = true
  // 直 Alpha 混合：premultipliedAlpha=false 与纹理 premultiplyAlpha=false 配套，避免浅边被压暗成黑边。
  // alphaTest 丢弃最淡的边缘像素，进一步消除细边/杂色残留。
  const handMat = new THREE.MeshBasicMaterial({ map: handTex, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: false, alphaTest: 0.15 })
  handPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), handMat)
  handPlane.frustumCulled = false  // 防止被视锥裁剪误判
  handPlane.visible = false
  handPlane.userData.imgAR = 1
  handScene.add(handPlane)
  fitHandPlane()

  // 昼间背景 / 手纹理（昼夜切换时使用；手图用直 Alpha + 加载时去边，浅色背景下不会压成黑边）
  const dayUrl = new URL('../../public/images/background/白天.png', import.meta.url).href
  dayNightTex = new THREE.TextureLoader().load(dayUrl, (tex) => {
    dayNightReady = true
    if (isDay.value && nightPlane) {
      nightPlane.material.map = dayNightTex   // 持久化为昼时，加载完即应用昼版背景（夜间为默认）
      nightPlane.userData.imgAR = tex.image.width / tex.image.height; fitNightPlane()
    }
  })
  dayNightTex.colorSpace = THREE.SRGBColorSpace

  const dayHandUrl = new URL('../../public/images/background/白天-手.png', import.meta.url).href
  dayHandTex = new THREE.TextureLoader().load(dayHandUrl, (tex) => {
    dayHandReady = true
    if (tex.image) {
      tex.image = decontaminate(tex.image)   // 浅/白杂边染成手部实色，边缘纯净
      tex.needsUpdate = true
    }
    if (isDay.value && handPlane) { handPlane.userData.imgAR = tex.image.width / tex.image.height; fitHandPlane() }
  })
  dayHandTex.colorSpace = THREE.SRGBColorSpace
  dayHandTex.premultiplyAlpha = false
  dayHandTex.generateMipmaps = false
  dayHandTex.minFilter = THREE.LinearFilter
  dayHandTex.magFilter = THREE.LinearFilter
  dayHandTex.wrapS = dayHandTex.wrapT = THREE.ClampToEdgeWrapping
  dayHandTex.needsUpdate = true

  ambientLight = new THREE.AmbientLight(0xfff8f2, 1.2)
  scene.add(ambientLight)
  spotLight = new THREE.SpotLight(0xfff6ee, 3.2, 10, Math.PI/3, 0.4)
  spotLight.position.set(0, 1.5, 1.5)
  spotLight.castShadow = true
  spotLight.shadow.mapSize.set(1024, 1024)
  spotLight.shadow.bias = -0.0015
  spotLight.shadow.normalBias = 0.004
  spotLight.shadow.camera.near = 0.5
  spotLight.shadow.camera.far = 8
  scene.add(spotLight)
  scene.add(spotLight.target)   // target 必须在场景里，移动光源时朝向才更新
  rimLight = new THREE.DirectionalLight(0xfff0dc, 0.25)
  rimLight.position.set(-1.2, 0.3, 0.6); scene.add(rimLight)
//鼠标光线范围调整
  mouseLight = new THREE.PointLight(0xffffff, 0, 5)
  mouseLight.position.set(0, 0.3, 1.5)
  scene.add(mouseLight)

  const floorMat = new THREE.ShadowMaterial({ opacity:0.15 })
  floorMat.depthWrite = false   // 只接阴影，不写深度，避免遮挡轨道下半部分
  floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(8,8), floorMat)
  floorMesh.rotation.x = -Math.PI/2
  floorMesh.position.y = FLOOR_Y
  floorMesh.receiveShadow = true
  scene.add(floorMesh)

  const gc=document.createElement('canvas'); gc.width=gc.height=128
  const gx=gc.getContext('2d')
  const gg=gx.createRadialGradient(64,64,0,64,64,64)
  gg.addColorStop(0,'rgba(180,140,50,.4)'); gg.addColorStop(1,'rgba(180,140,50,0)')
  gx.fillStyle=gg; gx.fillRect(0,0,128,128)
  glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(gc), transparent:true, opacity:0
  }))
  glowSprite.scale.set(0.6,0.15,1)
  glowSprite.position.set(0, FLOOR_Y+0.005, 0)
  scene.add(glowSprite)

  function mat(n) {
    return new THREE.MeshStandardMaterial({
      map:             boneTex(n),
      normalMap:       pipsNormalMap(n),
      normalScale:     new THREE.Vector2(2.0, 2.0),
      displacementMap:   pipsDispMap(n),
      displacementScale: -0.022,  // 负值：白色区域沿法线向内 = 凹陷
      displacementBias:   0,      // 黑底(0) → 0*(-0.022)+0 = 0，面不动
      roughness: .62, metalness: .04
    })
  }
  const mats2=[
    mat(2), mat(5), mat(3), mat(4),
    mat(0),
    mat(6),
  ]
  diceMats = mats2   // 存引用，昼夜切换时按冷/暖调调整骰子材质色

  const geo = new RoundedBoxGeometry(D, D, D, 96, D*0.12)

  dice2 = new THREE.Mesh(geo, mats2)
  dice2.castShadow = true
  dice2.receiveShadow = true
  dice2.position.set(0, fallY2, 0)
  dice2.quaternion.setFromEuler(new THREE.Euler(
    (Math.random()-.5)*Math.PI*2,
    (Math.random()-.5)*Math.PI*2,
    (Math.random()-.5)*Math.PI*2
  ))
  baseQuat2.copy(dice2.quaternion)
  scene.add(dice2)

  // 眼球凸起 dome（贴在 +Z 面表面，随骰子一起旋转）
  const domeGeo = buildDomeGeo(D * 0.83, D * 0.83, 64, D * 0.1)
  const domeMat = new THREE.MeshStandardMaterial({
    map: buildRightEye(),
    roughness: 0.62, metalness: 0.04
  })
  eyeDome = new THREE.Mesh(domeGeo, domeMat)
  eyeDome.position.set(0, 0, D / 2)
  eyeDome.castShadow = true
  dice2.add(eyeDome)

  // 公转铜钱（与六爻页面同款：圆柱，正面 yang.png，背面 yin.png，侧面金色）
  const coinLoader = new THREE.TextureLoader()
  const coinYangTex = coinLoader.load('./images/yang.png')
  const coinYinTex  = coinLoader.load('./images/yin.png')
  // CylinderGeometry 材质顺序：[0]=侧面，[1]=顶面(正/yang)，[2]=底面(背/yin)
  const coinGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.009, 40)
  orbitSphere = new THREE.Mesh(coinGeo, [
    new THREE.MeshStandardMaterial({ color: 0xC8951A, roughness: 0.18, metalness: 0.72, emissive: 0x5A3000, emissiveIntensity: 0.20, transparent: true }),
    new THREE.MeshStandardMaterial({ map: coinYangTex, roughness: 0.30, metalness: 0.25, transparent: true }),
    new THREE.MeshStandardMaterial({ map: coinYinTex,  roughness: 0.30, metalness: 0.25, transparent: true }),
  ])
  orbitSphere.castShadow = true
  orbitSphere.visible = false
  scene.add(orbitSphere)

  // 铜钱2：同贴图，翻转 X 轴旋转后底面(yin)朝向摄像机，与铜钱1相对
  const coin2Geo = new THREE.CylinderGeometry(0.052, 0.052, 0.009, 40)
  orbitSphere2 = new THREE.Mesh(coin2Geo, [
    new THREE.MeshStandardMaterial({ color: 0xC8951A, roughness: 0.18, metalness: 0.72, emissive: 0x5A3000, emissiveIntensity: 0.20, transparent: true }),
    new THREE.MeshStandardMaterial({ map: coinYangTex, roughness: 0.30, metalness: 0.25, transparent: true }),
    new THREE.MeshStandardMaterial({ map: coinYinTex,  roughness: 0.30, metalness: 0.25, transparent: true }),
  ])
  orbitSphere2.castShadow = true
  orbitSphere2.visible = false
  scene.add(orbitSphere2)

  // 公转粒子轨道环（轨道1）
  orbitParticles = buildOrbitRing()
  orbitParticles.visible = false
  scene.add(orbitParticles)

  // 轨道2 粒子环
  orbitParticles2 = buildOrbitRing2()
  orbitParticles2.visible = false
  scene.add(orbitParticles2)

  // 轨道2：三张塔罗牌（当前主题牌背，正反面相同，绕轨道公转；主题切换时换贴图）
  orbitCards2 = []  // 重置，防止 HMR 热更新后残留旧引用
  const cardLoader = new THREE.TextureLoader()
  const cardTex = cardLoader.load(`./images/themes/${store.themeKey}/card.jpg`)
  const cardAlpha = makeRoundAlphaMap()
  // 正面 / 背面材质（有贴图 + 圆角遮罩）
  const cardFaceMat = new THREE.MeshStandardMaterial({
    map: cardTex, alphaMap: cardAlpha,
    transparent: true, depthWrite: true,
    roughness: 0.92, metalness: 0.0,
    envMapIntensity: 0.1,
  })
  orbitCardFaceMat = cardFaceMat   // 暴露给主题切换逻辑（applyThemeToScene）
  // 四条边材质（实心卡纸色，无遮罩）
  const cardEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xF2E8D0, roughness: 0.90, metalness: 0.0, transparent: true,
  })
  // BoxGeometry 面序：[+X右, -X左, +Y顶, -Y底, +Z前, -Z后]
  const cardMats = [cardEdgeMat, cardEdgeMat, cardEdgeMat, cardEdgeMat, cardFaceMat, cardFaceMat]
  for (let k = 0; k < 3; k++) {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(ORBIT2_CARD_W, ORBIT2_CARD_H, ORBIT2_CARD_D),
      cardMats
    )
    card.visible = false
    scene.add(card)
    orbitCards2.push(card)
  }

  glowSprite.scale.set(0.6, 0.15, 1)

  buildNavCardRing()
  buildGlobe()
  buildParticles()
}

// ── 经纬度 → 球面 XYZ ─────────────────────────────────────────
function latLngToXYZ(lat, lng, r) {
  const phi   = (90 - lat)  * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

// ── 构建粒子地球 ───────────────────────────────────────────────
function buildGlobe() {
  globeGroup = new THREE.Group()
  globeGroup.position.set(globeOffsetX(), 0, 0)

  // 球体背景底色（从0淡入，随地球一起显隐）
  globeCore = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_R * 0.98, 40, 40),
    new THREE.MeshBasicMaterial({
      color: isDay.value ? '#e4e0e0' : '#2d2d2f', transparent: true, opacity: 0, depthWrite: true,
    })
  )
  globeCore.renderOrder = -1
  globeGroup.add(globeCore)

  // 大陆数据（复用于粒子着色、轮廓线、大陆覆盖层）
  const countries = topoFeature(worldTopo, worldTopo.objects.countries)
  worldCountries = countries

  // 大陆覆盖层：核心球上方绘制陆地色块（primary 不透明），区分陆海
  globeLandCanvas = document.createElement('canvas')
  globeLandCanvas.width = 1024; globeLandCanvas.height = 512
  globeLandTex = new THREE.CanvasTexture(globeLandCanvas)
  globeLandOverlay = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_R * 0.99, 50, 50),
    new THREE.MeshBasicMaterial({
      map: globeLandTex, transparent: true, opacity: 0, depthWrite: false,
    })
  )
  globeLandOverlay.renderOrder = 0
  globeGroup.add(globeLandOverlay)

  // 填充大陆覆盖层画布
  ;(() => {
    const ctx = globeLandCanvas.getContext('2d')
    ctx.clearRect(0, 0, 1024, 512)
    ctx.globalAlpha = 1.0
    ctx.fillStyle = currentTheme.value.primary
    const drawRing = (coords) => {
      ctx.beginPath()
      for (let i = 0; i < coords.length; i++) {
        const [lng, lat] = coords[i]
        const x = (lng + 180) / 360 * 1024
        const y = (90 - lat)  / 180 * 512
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.fill()
    }
    for (const feat of countries.features) {
      const { type, coordinates } = feat.geometry
      if (type === 'Polygon')           coordinates.forEach(drawRing)
      else if (type === 'MultiPolygon') coordinates.forEach(p => p.forEach(drawRing))
    }
    globeLandTex.needsUpdate = true
  })()

  // 球面粒子云：Fibonacci 均匀分布，按陆地/海洋/极地染色
  const landCanvas = createLandCanvas(512, 256, countries)
  const { pos: surfacePos, col: surfaceCol, alpha: surfaceAlpha, sizes: surfaceSizes } = fibonacciColored(GLOBE_PARTICLE_N, GLOBE_R * 0.997, landCanvas)
  // 每个地球粒子对应的骰子面采样位置（倒放变形目标）
  const dicePosForGlobe = sampleDiceSurface(GLOBE_PARTICLE_N)
  const surfaceGeo = new THREE.BufferGeometry()
  surfaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(surfacePos, 3))
  surfaceGeo.setAttribute('aColor',   new THREE.Float32BufferAttribute(surfaceCol, 3))
  surfaceGeo.setAttribute('aAlpha',   new THREE.Float32BufferAttribute(surfaceAlpha, 1))
  surfaceGeo.setAttribute('aSize',    new THREE.Float32BufferAttribute(surfaceSizes, 1))
  surfaceGeo.setAttribute('aDicePos', new THREE.Float32BufferAttribute(dicePosForGlobe, 3))
  const surfaceMat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity:     { value: 0 },
      uSizeScale:   { value: Math.min(window.devicePixelRatio || 1, 2) * 1 },
      uTime:        { value: 0 },
      uHoverPoint:  { value: new THREE.Vector3(0, 100, 0) },
      uHoverRadius: { value: 0.22 },  // ← 鼠标影响半径（模型空间）
      uMorphT:      { value: 0 },     // ← 倒放进度：0=地球形态，1=骰子形态
    },
    vertexShader: `
      attribute vec3  aColor;
      attribute float aAlpha;
      attribute float aSize;
      attribute vec3  aDicePos;
      varying   vec3  vColor;
      varying   float vAlpha;
      varying   float vHover;
      varying   float vMorphFade;
      uniform   float uSizeScale;
      uniform   float uTime;
      uniform   vec3  uHoverPoint;
      uniform   float uHoverRadius;
      uniform   float uMorphT;
      void main() {
        vAlpha = aAlpha;
        // 前 40%：地形色 → 白色（先变白再变形）
        float colorT  = smoothstep(0.0, 0.40, uMorphT);
        vColor = mix(aColor, vec3(0.96, 0.96, 0.96), colorT);
        // 形状从 35% 处才开始变形（颜色已基本变白）
        float shapeT  = smoothstep(0.35, 1.0, uMorphT);
        float scatter = sin(shapeT * 3.14159265) * 0.20;
        vec3 sdir = normalize(position + vec3(0.001, 0.001, 0.001));
        vec3 morphPos = mix(position, aDicePos, shapeT) + sdir * scatter;
        // 末尾 20% 渐隐，让粒子在骰子出现前淡出
        vMorphFade = 1.0 - smoothstep(0.90, 1.0, uMorphT);
        // 呼吸感（变形中逐渐关闭）
        float bMask = 1.0 - uMorphT;
        float breath = 1.0 + sin(uTime * 2.1 + position.x * 6.28 + position.z * 4.71) * 0.09 * bMask;
        // 鼠标悬停（变形中逐渐关闭）
        float hDist = length(position - uHoverPoint);
        float hT = max(0.0, 1.0 - hDist / uHoverRadius) * bMask;
        hT = hT * hT * hT;
        vHover = hT;
        vec3 p = morphPos + normalize(position) * hT * 0.048;
        gl_Position  = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uSizeScale * breath * (1.0 + hT * 2.2);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3  vColor;
      varying float vAlpha;
      varying float vHover;
      varying float vMorphFade;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = dot(c, c);
        if (r > 1.0) discard;
        float glow  = 1.0 - sqrt(r);
        vec3  col   = vColor + vHover * vec3(0.55, 0.50, 0.22);
        float alpha = glow * vAlpha * uOpacity * (1.0 + vHover * 1.6) * vMorphFade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
  })
  globeSurface = new THREE.Points(surfaceGeo, surfaceMat)
  globeGroup.add(globeSurface)

  // 大陆轮廓线（金色 LineSegments）
  const verts = []
  function addRing(coords) {
    for (let i = 0; i < coords.length - 1; i++) {
      const v1 = latLngToXYZ(coords[i][1],   coords[i][0],   GLOBE_R + 0.003)
      const v2 = latLngToXYZ(coords[i+1][1], coords[i+1][0], GLOBE_R + 0.003)
      verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
    }
  }
  for (const feat of countries.features) {
    const { type, coordinates } = feat.geometry
    if (type === 'Polygon')      coordinates.forEach(addRing)
    else if (type === 'MultiPolygon') coordinates.forEach(p => p.forEach(addRing))
  }
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  const lineMat = new THREE.LineBasicMaterial({
    color:       new THREE.Color(isDay.value ? currentTheme.value.primaryDark : currentTheme.value.primaryLight),
    transparent: true,
    opacity:     0,
    depthWrite:  false,
  })
  globeLines = new THREE.LineSegments(lineGeo, lineMat)
  globeLines.visible = true
  globeGroup.add(globeLines)

  globeGroup.visible = false
  scene.add(globeGroup)

  buildMarks()   // 占卜数据柱 + 名称气泡
}

// ── 占卜数据标记：国家质心立 3D 柱（信仰星级+影响力）+ 名称气泡 ──
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
}

// 绘制占卜名称气泡贴图；active=true 时边框加粗并由主题色发光
function renderLabelTexture(sp, active) {
  const text = sp.userData.text
  const dpr = 2
  const fontSize = 24, padX = 18, padY = 10
  const cv = sp.userData.cv || document.createElement('canvas')
  sp.userData.cv = cv
  const ctx = cv.getContext('2d')
  const fontStr = `400 ${fontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.font = fontStr
  const tw = ctx.measureText(text).width
  cv.width = Math.ceil(tw + padX * 2) * dpr
  cv.height = Math.ceil(fontSize + padY * 2) * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const w = cv.width / dpr, h = cv.height / dpr
  sp.userData.aspect = w / h
  ctx.clearRect(0, 0, w, h)
  const r = h / 2
  const day = isDay.value
  const t = currentTheme.value
  // 昼夜双套配色（用户指定）：
  //   白天：背景 primaryLight，文字 primary
  //   黑夜：背景 primary，文字 白色
  const glow = day ? t.primary : t.primaryLight
  const [bgR, bgG, bgB] = hexToRgbArr(day ? t.primaryLight : t.primary)
  const fill = `rgba(${bgR},${bgG},${bgB},0.96)`
  const textColor = day ? t.primary : '#ffffff'
  // 药丸形底
  ctx.fillStyle = fill
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r)
  ctx.fill()
  // 边框：静止态细边；高亮态用主题色加粗并发光（夜间晕影更强）
  if (active) {
    ctx.save()
    ctx.shadowColor = glow
    ctx.shadowBlur = day ? 16 : 22
    ctx.lineWidth = 5
    ctx.strokeStyle = glow
    roundRectPath(ctx, 2, 2, w - 4, h - 4, r - 1)
    ctx.stroke()
    ctx.restore()
  } else {
    ctx.lineWidth = 2
    ctx.strokeStyle = day ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.18)'
    roundRectPath(ctx, 1, 1, w - 2, h - 2, r)
    ctx.stroke()
  }
  // 文字
  ctx.fillStyle = textColor
  ctx.font = fontStr
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2 + 1)
  const tex = sp.userData.tex || new THREE.CanvasTexture(cv)
  sp.userData.tex = tex
  tex.anisotropy = 4
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  sp.material.map = tex
  sp.material.needsUpdate = true
}
function setLabelActive(sp, active) {
  if (sp && sp.userData && sp.userData.text != null) renderLabelTexture(sp, active)
  // 高亮（悬停/点击）时关闭深度测试并提到最上层，避免被地球/其它柱遮挡
  if (sp && sp.material) {
    sp.material.depthTest = !active
    sp.renderOrder = active ? 11 : 0
  }
}
function makeMarkLabel(text) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }))
  sp.userData.text = text
  sp.userData.kind = 'label'
  renderLabelTexture(sp, false)
  const worldH = 0.026
  sp.scale.set(worldH * sp.userData.aspect, worldH, 1)
  return sp
}

function buildMarks() {
  if (!divinationData || !divinationData.records || !globeGroup) return
  if (globeMarks) { globeGroup.remove(globeMarks); globeMarks = null }
  markMeshes.length = 0

  const MAX_BAR = 0.12            // 柱最大高度（更短）
  const RAD = 0.006              // 柱半径
  const GOLDEN = Math.PI * (3 - Math.sqrt(5))
  const SPREAD = 3.5             // 同国多记录围绕质心螺旋散开半径（度）：足以分开气泡，又大多留在国境之内
  const UP = new THREE.Vector3(0, 1, 0)
  const t = currentTheme.value

  // 按国家分组
  const byCountry = {}
  for (const r of divinationData.records) {
    if (!r.matched || r.lat == null) continue
    ;(byCountry[r.country] = byCountry[r.country] || []).push(r)
  }

  const group = new THREE.Group()
  for (const country in byCountry) {
    const list = byCountry[country]
    const k = list.length
    list.forEach((r, idx) => {
      // 螺旋散布：idx=0 在质心，其余沿黄金角向外铺开，不重叠
      const ang = idx * GOLDEN
      const rad = SPREAD * Math.sqrt(idx / Math.max(1, k - 1))
      const dLng = Math.cos(ang) * rad
      const dLat = Math.sin(ang) * rad
      const base = latLngToXYZ(r.lat + dLat, r.lng + dLng, GLOBE_R * 1.004)
      const normal = base.clone().normalize()

      // 局部切线帧：right 用于左右并排放两柱
      const upRef = Math.abs(normal.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : UP
      const right = new THREE.Vector3().crossVectors(normal, upRef).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(UP, normal)

      const faithH = Math.max(0.015, (r.faith / 5) * MAX_BAR)
      const inflH = Math.max(0.015, (r.influence / 5) * MAX_BAR)
      const gap = RAD * 2.0   // 两柱中心间距（收紧以减小单记录占用，便于同国多记录聚拢）

      // 底座圆点（位置符号）
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(RAD * 1.6, 8, 8),
        new THREE.MeshBasicMaterial({ color: t.primary, transparent: true })
      )
      dot.position.copy(base)
      dot.userData.record = r; dot.userData.kind = 'dot'
      group.add(dot); markMeshes.push(dot)

      // 信仰星级柱（左）
      const faithCenter = base.clone().addScaledVector(right, -gap / 2)
      const faithMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(RAD, RAD, faithH, 10),
        new THREE.MeshBasicMaterial({ color: t.primaryDark, transparent: true })
      )
      faithMesh.position.copy(faithCenter).addScaledVector(normal, faithH / 2)
      faithMesh.quaternion.copy(q)
      faithMesh.userData.record = r; faithMesh.userData.kind = 'faith'
      group.add(faithMesh); markMeshes.push(faithMesh)

      // 影响力柱（右）
      const inflCenter = base.clone().addScaledVector(right, gap / 2)
      const inflMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(RAD, RAD, inflH, 10),
        new THREE.MeshBasicMaterial({ color: t.primary, transparent: true })
      )
      inflMesh.position.copy(inflCenter).addScaledVector(normal, inflH / 2)
      inflMesh.quaternion.copy(q)
      inflMesh.userData.record = r; inflMesh.userData.kind = 'infl'
      group.add(inflMesh); markMeshes.push(inflMesh)

      // 占卜名称气泡（置于两柱中间上方，可点击弹出介绍）
      const label = makeMarkLabel(r.name)
      const topH = Math.max(faithH, inflH)
      label.position.copy(base).addScaledVector(normal, topH + 0.045)
      label.userData.record = r
      group.add(label); markMeshes.push(label)
    })
  }
  globeGroup.add(group)
  globeMarks = group
}

function recolorMarks() {
  if (!globeMarks) return
  const t = currentTheme.value
  globeMarks.traverse(o => {
    const k = o.userData && o.userData.kind
    // 占卜名称气泡的配色由纹理（renderLabelTexture）按昼夜绘制，不在这里染色，
    // 否则 material.color 会常数倍乘纹理，把昼夜差异洗掉，导致切换看起来“不变”
    if (!k || k === 'label') return
    const c = k === 'infl' ? t.primary
            : k === 'faith' ? t.primaryDark
            : t.primary
    if (o.material && o.material.color) o.material.color.set(c)
  })
  // 主题/昼夜切换时，重绘全部名称气泡（颜色与昼夜态同步刷新，含静止态的深浅反色）
  for (const m of markMeshes) {
    if (m.userData && m.userData.kind === 'label') {
      if (m.material && m.material.color) m.material.color.set('#ffffff')  // 纹理已含配色，材质色须为白避免倍乘
      renderLabelTexture(m, m === hoveredLabel || m === clickedLabel)
    }
  }
}

const _pickRay = new THREE.Raycaster()
const _pickRay2 = new THREE.Raycaster()
const _pickNDC = new THREE.Vector2()
function pickMark(cx, cy) {
  if (!globeMarks || !renderer || !camera) return null
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = ((cx - rect.left) / rect.width) * 2 - 1
  const ny = -((cy - rect.top) / rect.height) * 2 + 1
  _pickNDC.set(nx, ny)
  _pickRay.setFromCamera(_pickNDC, camera)
  const hits = _pickRay.intersectObjects(markMeshes, false)
  return hits.length ? hits[0].object.userData.record : null
}
function pickMarkMesh(cx, cy) {
  if (!globeMarks || !renderer || !camera) return null
  const rect = renderer.domElement.getBoundingClientRect()
  const nx = ((cx - rect.left) / rect.width) * 2 - 1
  const ny = -((cy - rect.top) / rect.height) * 2 + 1
  _pickNDC.set(nx, ny)
  _pickRay2.setFromCamera(_pickNDC, camera)
  const hits = _pickRay2.intersectObjects(markMeshes, false)
  return hits.length ? hits[0].object : null
}

function openMarkCard(r) {
  if (!r) return
  selectedMark.value = r
  markCardOpen.value = true
  document.body.classList.add('dialog-open')
  vib('medium')   // 点击标签出卡片的震动反馈
}
function closeMarkCard() {
  markCardOpen.value = false
  selectedMark.value = null
  cardDragActive = false
  document.body.classList.remove('dialog-open')
  if (clickedLabel) { setLabelActive(clickedLabel, false); clickedLabel = null }
}

// 卡片展示的全部字段（顺序即展示顺序；name/国家/星级/图片/链接单独处理）
const markFieldMeta = [
  { label: '别名/英文名', key: 'alias' },
  { label: '主要流行国家/地区', key: 'popularCountries' },
  { label: '起源国家', key: 'originCountry' },
  { label: '流行地区', key: 'region' },
  { label: '起源年代', key: 'origin' },
  { label: '时代分段', key: 'era' },
  { label: '文明分类大类', key: 'civCategory' },
  { label: '文明/文化圈', key: 'culture' },
  { label: '文明大类核心特点', key: 'civFeature' },
  { label: '原理归属大类', key: 'principleCategory' },
  { label: '原理分类核心说明', key: 'principleNote' },
  { label: '核心功能', key: 'function' },
  { label: '使用载体/工具', key: 'tool' },
  { label: '使用阶层', key: 'cls' },
  { label: '占卜原理', key: 'principle' },
  { label: '起源传说/背景', key: 'legend' },
  { label: '详细介绍', key: 'intro' },
  { label: '历史演化', key: 'evolution' },
  { label: '主要分支', key: 'branches' },
  { label: '与其他占卜方式的关系', key: 'relations' }
]
const markSections = computed(() => {
  const m = selectedMark.value
  if (!m) return []
  return markFieldMeta
    .map(f => ({ label: f.label, value: m[f.key] }))
    .filter(s => s.value != null && String(s.value).trim() !== '')
})

// ── 粒子过渡：骰子面采样 ─────────────────────────────────────
function sampleDiceSurface(n) {
  const pos = new Float32Array(n * 3)
  const h = D / 2
  for (let i = 0; i < n; i++) {
    const face = Math.floor(Math.random() * 6)
    const u = (Math.random() - 0.5) * D
    const v = (Math.random() - 0.5) * D
    let x, y, z
    if      (face === 0) { x =  h; y = u; z = v }
    else if (face === 1) { x = -h; y = u; z = v }
    else if (face === 2) { x = u; y =  h; z = v }
    else if (face === 3) { x = u; y = -h; z = v }
    else if (face === 4) { x = u; y = v; z =  h }
    else                 { x = u; y = v; z = -h }
    pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z
  }
  return pos
}

// ── Fibonacci 球面均匀分布 ────────────────────────────────────
function fibonacciSphere(n, r) {
  const pos = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y   = 1 - (i / (n - 1)) * 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    pos[i*3]   = Math.cos(theta) * rad * r
    pos[i*3+1] = y * r
    pos[i*3+2] = Math.sin(theta) * rad * r
  }
  return pos
}

// ── 生成陆地/海洋 Canvas（等距圆柱投影，用于粒子染色） ──────────
function createLandCanvas(W, H, countries) {
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  // 海洋底色
  ctx.fillStyle = '#1A304E'
  ctx.fillRect(0, 0, W, H)
  // 陆地多边形（绿色，与海洋蓝色形成明显通道差异）
  ctx.fillStyle = '#3E5A28'
  function drawRingOnCanvas(coords) {
    ctx.beginPath()
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i]
      const x = (lng + 180) / 360 * W
      const y = (90 - lat)  / 180 * H
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
  for (const feat of countries.features) {
    const { type, coordinates } = feat.geometry
    if (type === 'Polygon')           coordinates.forEach(drawRingOnCanvas)
    else if (type === 'MultiPolygon') coordinates.forEach(p => p.forEach(drawRingOnCanvas))
  }
  return canvas
}

// ── 地形高程：多控制点高斯叠加，近似真实地球地势 ────────────────
function computeElevation(lat, lng, isLand) {
  let elev = 0

  // 平滑高斯区域，处理经度跨日期线折叠
  function zone(clat, clng, latR, lngR, strength) {
    const dlat = (lat - clat) / latR
    const dlng = ((lng - clng + 540) % 360 - 180) / lngR
    const d2 = dlat * dlat + dlng * dlng
    if (d2 >= 1.0) return 0
    const t = 1 - d2
    return strength * t * t
  }

  // ── 山脉 / 高原 ──────────────────────────────────────────────
  elev += zone( 32,   90,  12, 22, 0.085)  // 喜马拉雅 / 青藏高原
  elev += zone(-15,  -70,  30, 12, 0.062)  // 安第斯山脉（主体）
  elev += zone(  5,  -75,  10,  9, 0.048)  // 安第斯北段（哥伦比亚）
  elev += zone( 45, -113,  16, 14, 0.045)  // 洛基山脉
  elev += zone( 46.5, 10.5, 4,  8, 0.042)  // 阿尔卑斯
  elev += zone(  5,   38,  12,  9, 0.040)  // 东非高原
  elev += zone( 43,   44,   3,  8, 0.038)  // 高加索山脉
  elev += zone( 72,  -40,  14, 22, 0.055)  // 格陵兰冰盖
  elev += zone( 35,   52,   8, 14, 0.035)  // 伊朗高原
  elev += zone(-33,  -70,   8,  8, 0.034)  // 巴塔哥尼亚安第斯
  elev += zone( 46,  105,   8, 22, 0.032)  // 蒙古高原
  elev += zone(-44,  170,   4,  4, 0.032)  // 新西兰南阿尔卑斯
  elev += zone( 33,    3,   6, 14, 0.030)  // 阿特拉斯山脉
  elev += zone( 63,   15,  11, 12, 0.028)  // 斯堪的纳维亚山脉
  elev += zone( 57,   57,  15,  6, 0.022)  // 乌拉尔山
  elev += zone( 40,  -79,   9,  7, 0.020)  // 阿巴拉契亚山

  // 南极洲冰盖高程
  if (lat < -70) {
    const t = Math.min(1, (-lat - 70) / 18)
    elev += 0.060 * t
  }

  // ── 洋盆 / 海沟（仅海洋粒子） ───────────────────────────────
  if (!isLand) {
    elev += zone(  0,  180,  42, 82, -0.028)  // 太平洋盆地
    elev += zone(-20, -148,  32, 72, -0.025)  // 南太平洋
    elev += zone( 13,  143,   3,  4, -0.058)  // 马里亚纳海沟
    elev += zone( 10,  126,   3,  3, -0.040)  // 菲律宾海沟
    elev += zone( 37,  143,   4,  3, -0.035)  // 日本海沟
    elev += zone( 20,  -40,  38, 28, -0.022)  // 北大西洋
    elev += zone(-30,  -25,  26, 24, -0.020)  // 南大西洋
    elev += zone(-20,   80,  26, 30, -0.022)  // 印度洋
    if (lat > 78)  elev -= 0.020 * Math.min(1, (lat  -  78) / 12)  // 北冰洋
    if (lat < -52) elev -= 0.018 * Math.min(1, (-lat -  52) / 16)  // 南冰洋
    // 大洋中脊（正地形）
    elev += zone(  0,  -25,  50,  8,  0.012)  // 大西洋中脊
    elev += zone(-20, -110,  30, 10,  0.010)  // 东太平洋海隆
  }

  // 分形噪声：陆地更粗糙，海洋更平滑
  const ns = isLand ? 0.018 : 0.008
  function hn(x, y, s) {
    const v = Math.sin(x * 0.1273 + y * 0.3141 + s) * 43758.5453
    return (v - Math.floor(v)) * 2 - 1
  }
  elev += hn(lat * 4.1, lng * 3.7, 0.0) * ns
  elev += hn(lat * 9.7, lng * 8.3, 1.7) * ns * 0.45

  return Math.max(-0.095, Math.min(0.11, elev))
}

// ── Fibonacci 球面 + 地形驱动（密度 + 颜色，大小统一） ──────────
function fibonacciColored(n, r, landCanvas) {

  // ═══════════════════════════════════════════════════════════════
  // ▼ 粒子大小（所有粒子统一，改这一个数）
  const PARTICLE_SIZE = 2   // 单位：像素基值（×uSizeScale）
  // ▼ 密度（0~1：该地形粒子被保留的概率，越小越稀疏）
  const D_ALPINE   = 300.00   // ← 雪线以上密度
  const D_HIGHLAND = 200.78   // ← 高原 / 山地密度
  const D_LOWLAND  = 200.46   // ← 低地平原密度
  const D_POLAR    = 200.86   // ← 极地冰盖密度
  const D_SHELF    = 200.34   // ← 大陆架 / 浅海密度
  const D_OCEAN    = 200.22   // ← 开阔洋盆密度
  const D_TRENCH   = 200.09   // ← 深海沟密度
  // ▼ 颜色（随主题/昼夜变化；运行期由 recolorGlobe 重新着色）
  //    陆地=primary；海洋=昼primaryLight / 夜primaryDark（昼夜皆可区分陆海）
  const _landCol  = hexToRgb01(currentTheme.value.primary)
  const _oceanCol = hexToRgb01(isDay.value ? currentTheme.value.primaryLight : currentTheme.value.primaryDark)
  // ═══════════════════════════════════════════════════════════════

  const W = landCanvas.width, H = landCanvas.height
  const ctx = landCanvas.getContext('2d')
  const { data } = ctx.getImageData(0, 0, W, H)

  const pos   = new Float32Array(n * 3)
  const col   = new Float32Array(n * 3)
  const alpha = new Float32Array(n)
  const sizes = new Float32Array(n)
  const landFlags = new Uint8Array(n)   // 每粒子陆地/海洋标志，供 recolorGlobe 运行期重新着色
  const golden = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < n; i++) {
    const yv    = 1 - (i / (n - 1)) * 2
    const rad   = Math.sqrt(Math.max(0, 1 - yv * yv))
    const theta = golden * i

    const lat = Math.asin(yv) * 180 / Math.PI
    const lng = -Math.atan2(Math.sin(theta) * rad, Math.cos(theta) * rad) * 180 / Math.PI

    const px  = Math.min(W - 1, Math.max(0, Math.floor((lng + 180) / 360 * W)))
    const py  = Math.min(H - 1, Math.max(0, Math.floor((90 - lat)  / 180 * H)))
    const idx = (py * W + px) * 4
    const isLand  = data[idx + 1] > data[idx + 2]
    landFlags[i] = isLand ? 1 : 0
    const absLat  = Math.abs(lat)
    const isPolar = absLat > 68

    const elev    = computeElevation(lat, lng, isLand)
    const rActual = r * (1 + elev)

    pos[i*3]   = Math.cos(theta) * rad * rActual
    pos[i*3+1] = yv * rActual
    pos[i*3+2] = Math.sin(theta) * rad * rActual

    // 粒子大小分布：60% = 2.0，其余均匀分布在 1.5~2.3（确定性随机）
    const szH = ((Math.sin(i * 53.3 + 179.7) * 43758.5453) % 1 + 1) % 1
    if (szH < 0.60) {
      sizes[i] = 2.0
    } else {
      const r2 = ((Math.sin(i * 23.7 + 91.3) * 43758.5453) % 1 + 1) % 1
      sizes[i] = 1.5 + r2 * 0.8   // 1.5 ~ 2.3
    }

    // 确定性哈希（用粒子序号做种，保证刷新结果一致）
    const hash = ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1

    // ── 颜色 + 密度（密度用 alpha=0 表示"不存在"） ───────────────
    if (isPolar) {
      // 极地：按陆地/海洋归类着色（陆地=primary，海洋=昼light/夜dark），密度 D_POLAR
      const _c = isLand ? _landCol : _oceanCol
      col[i*3] = _c[0]; col[i*3+1] = _c[1]; col[i*3+2] = _c[2]
      alpha[i]  = hash < D_POLAR ? 1.00 : 0

    } else if (isLand) {
      if (elev > 0.055) {
        // 雪线以上：陆地统一 primary，密度 D_ALPINE
        col[i*3] = _landCol[0]; col[i*3+1] = _landCol[1]; col[i*3+2] = _landCol[2]
        alpha[i] = hash < D_ALPINE ? 0.95 : 0

      } else if (elev > 0.018) {
        // 高原/山地：陆地统一 primary，密度 D_HIGHLAND → D_ALPINE 渐变
        const t = (elev - 0.018) / 0.037
        col[i*3]   = _landCol[0]
        col[i*3+1] = _landCol[1]
        col[i*3+2] = _landCol[2]
        const dens = D_HIGHLAND + t * (D_ALPINE - D_HIGHLAND)
        alpha[i] = hash < dens ? Math.min(1, 0.95 + t * 0.05) : 0

      } else {
        // 低地平原：陆地统一 primary，密度 D_LOWLAND → D_HIGHLAND 渐变
        const t = Math.max(0, (elev + 0.008) / 0.026)
        col[i*3]   = _landCol[0]
        col[i*3+1] = _landCol[1]
        col[i*3+2] = _landCol[2]
        const dens = D_LOWLAND + t * (D_HIGHLAND - D_LOWLAND)
        alpha[i] = hash < dens ? 0.60 + t * 0.18 : 0
      }

    } else {
      // 海洋：统一 昼primaryLight/夜primaryDark，深度决定密度和亮度
      col[i*3] = _oceanCol[0]; col[i*3+1] = _oceanCol[1]; col[i*3+2] = _oceanCol[2]
      if (elev < -0.040) {
        // 深海沟（密度最低）
        alpha[i] = hash < D_TRENCH ? 0.40 : 0
      } else if (elev < 0) {
        // 开阔洋盆（深度越大越稀疏）
        const t = -elev / 0.040
        const dens = D_OCEAN + (1 - t) * (D_SHELF - D_OCEAN)
        alpha[i] = hash < dens ? 0.50 + (1 - t) * 0.14 : 0
      } else {
        // 大陆架（最浅，密度最高的海区）
        alpha[i] = hash < D_SHELF ? 0.65 : 0
      }
    }
  }

  // 记录陆地/海洋分类，供 recolorGlobe 运行期重新着色
  surfaceLand = landFlags
  return { pos, col, alpha, sizes }
}

// ── 运行期重新着色地球粒子与轮廓线（主题/昼夜变化时调用） ──────────
function recolorGlobe() {
  // 粒子：陆地=primary（昼/夜同）；海洋=昼primaryLight / 夜primaryDark
  if (globeSurface && surfaceLand) {
    const land  = hexToRgb01(currentTheme.value.primary)
    const ocean = hexToRgb01(isDay.value ? currentTheme.value.primaryLight : currentTheme.value.primaryDark)
    const colAttr = globeSurface.geometry.getAttribute('aColor')
    const arr = colAttr.array
    for (let i = 0; i < surfaceLand.length; i++) {
      const c = surfaceLand[i] ? land : ocean
      arr[i*3]     = c[0]
      arr[i*3 + 1] = c[1]
      arr[i*3 + 2] = c[2]
    }
    colAttr.needsUpdate = true
  }
  // 轮廓线（海岸线/国界/河流）：昼=primaryDark，夜=primaryLight
  if (globeLines) {
    globeLines.material.color.set(isDay.value ? currentTheme.value.primaryDark : currentTheme.value.primaryLight)
  }
  // 球体背景底色：白天白、黑天黑（不透明度由 GLOBE_CORE_OPACITY 控制）
  if (globeCore) {
    globeCore.material.color.set(isDay.value ? '#e4e0e0' : '#2d2d2f')
  }
  // 大陆覆盖层纹理：primary 不透明填充
  if (globeLandCanvas && globeLandTex && worldCountries) {
    const ctx = globeLandCanvas.getContext('2d')
    const W = globeLandCanvas.width, H = globeLandCanvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.globalAlpha = 1.0
    ctx.fillStyle = currentTheme.value.primary
    const drawRing = (coords) => {
      ctx.beginPath()
      for (let i = 0; i < coords.length; i++) {
        const [lng, lat] = coords[i]
        const x = (lng + 180) / 360 * W
        const y = (90 - lat)  / 180 * H
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.fill()
    }
    for (const feat of worldCountries.features) {
      const { type, coordinates } = feat.geometry
      if (type === 'Polygon')           coordinates.forEach(drawRing)
      else if (type === 'MultiPolygon') coordinates.forEach(p => p.forEach(drawRing))
    }
    globeLandTex.needsUpdate = true
  }
  recolorMarks()   // 占卜数据柱随主题/昼夜换色
}

// ── 骰子整体不透明度（用于淡入淡出） ─────────────────────────────
function setDiceOpacity(v) {
  if (!dice2) return
  const t = v < 1.0
  if (Array.isArray(dice2.material)) {
    dice2.material.forEach(m => {
      m.opacity = v
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true }
    })
  } else {
    dice2.material.opacity = v
    if (dice2.material.transparent !== t) { dice2.material.transparent = t; dice2.material.needsUpdate = true }
  }
  if (eyeDome) {
    eyeDome.material.opacity = v
    if (eyeDome.material.transparent !== t) { eyeDome.material.transparent = t; eyeDome.material.needsUpdate = true }
  }
}

// ── 轨道物件整体透明度（用于骰子恢复后渐入） ──────────────────
function setOrbitOpacity(v) {
  // 所有轨道材质已在创建时设 transparent:true，直接改 opacity 即可
  const applyMat = (m) => { m.opacity = v }
  ;[orbitSphere, orbitSphere2].forEach(mesh => {
    if (!mesh) return
    if (Array.isArray(mesh.material)) mesh.material.forEach(applyMat)
    else applyMat(mesh.material)
  })
  if (orbitParticles)  orbitParticles.material.opacity  = v * 0.85
  if (orbitParticles2) orbitParticles2.material.opacity = v * ORBIT2_OPACITY
  orbitCards2?.forEach(card => {
    if (Array.isArray(card.material)) card.material.forEach(applyMat)
    else applyMat(card.material)
  })
}

// ── 构建粒子过渡系统 ──────────────────────────────────────────
function buildParticles() {
  const dicePos  = sampleDiceSurface(PARTICLE_N)
  const globePos = fibonacciSphere(PARTICLE_N, GLOBE_R)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position',  new THREE.Float32BufferAttribute(dicePos,  3))
  geo.setAttribute('aGlobePos', new THREE.Float32BufferAttribute(globePos, 3))

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uSize:     { value: window.devicePixelRatio > 1 ? 2.5 : 1.5 },
    },
    vertexShader: `
      attribute vec3 aGlobePos;
      uniform float uProgress;
      uniform float uSize;
      void main() {
        float scatter = sin(uProgress * 3.14159265) * 0.22;
        vec3 dir = normalize(position + vec3(0.001, 0.001, 0.001));
        vec3 pos = mix(position, aGlobePos, uProgress) + dir * scatter;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        float sz = uSize * (1.0 + sin(uProgress * 3.14159265) * 1.2);
        gl_PointSize = max(1.0, sz);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = dot(c, c);
        if (r > 1.0) discard;
        float glow    = 1.0 - sqrt(r);
        float fadeIn  = smoothstep(0.0,  0.18, uProgress);
        float fadeOut = 1.0 - smoothstep(0.82, 1.0,  uProgress);
        float alpha = glow * fadeIn * fadeOut * mix(0.68, 0.90, uProgress);
        gl_FragColor = vec4(vec3(0.96, 0.96, 0.96), alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
  })

  particleSystem = new THREE.Points(geo, mat)
  particleSystem.position.copy(globeGroup.position)
  particleSystem.visible = false
  scene.add(particleSystem)
}

function onResize(W, H) {
  if (!renderer) return
  camera.aspect = W/H; camera.updateProjectionMatrix()
  renderer.setSize(W, H)
  CAMERA_DEFAULT.z = responsiveCamZ(W)   // 屏宽变化时同步相机基准距离
  if (globeGroup) globeGroup.position.x = globeOffsetX()  // 横竖屏切换时地球居中/偏左
  if (particleSystem) particleSystem.position.copy(globeGroup.position)  // 过渡粒子系统跟随地球位置
  // 横竖屏切换（方向变化）时重算地球默认距离，保证完整可见；地址栏伸缩(方向不变)不重设，保留用户缩放
  const aspect = W / H
  if (lastAspect > 0 && (aspect < 1) !== (lastAspect < 1)) cameraZoom = globeFitCamZ()
  lastAspect = aspect
  fitNightPlane()
  fitHandPlane()
}
let lastAspect = 0

// 按「图片原比例 + 视口比例」做 contain，平面填满视野但图片不被拉伸；
// 多出的边由 scene.background 的纯色兜底，保证夜晚氛围不露白
function fitNightPlane() {
  if (!nightPlane || !camera) return
  const dist = 5
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const imgAR = nightPlane.userData.imgAR || 1
  // 以高度为基准：图片高度永远撑满视野，宽度按原比例缩放（超出部分自然裁切）；
  // 无论窗口/手机怎么变，高度填满且横宽比例不变、绝不被拉伸
  const h = viewH
  const w = viewH * imgAR
  nightPlane.scale.set(w, h, 1)
}

// 手前景平面缩放：与背景图完全相同的「高度填满、比例不变」fit（只设 scale，位置每帧由 updateHandTransform 计算）
function fitHandPlane() {
  if (!handPlane || !camera) return
  const dist = 5
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const imgAR = handPlane.userData.imgAR || 1
  handPlane.scale.set(viewH * imgAR, viewH, 1)
}

// 每帧按相机实时摆位：相机正前方 dist=5 处铺满视野、比例不变，再叠加按视野宽/高比例的偏移。
// 偏移用视野宽/高的分数（而非像素/百分比），保证手机与桌面下手相对背景图的相对位置一致，不会两端对不上。
const _handCamPos = new THREE.Vector3()
const _handQuat = new THREE.Quaternion()
const _handFwd = new THREE.Vector3()
const _handRight = new THREE.Vector3()
const _handUp = new THREE.Vector3()
function updateHandTransform() {
  if (!handPlane || !camera) return
  const dist = 5
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const viewW = viewH * camera.aspect
  camera.getWorldPosition(_handCamPos)
  camera.getWorldQuaternion(_handQuat)
  _handFwd.set(0, 0, -1).applyQuaternion(_handQuat)
  _handRight.set(1, 0, 0).applyQuaternion(_handQuat)
  _handUp.set(0, 1, 0).applyQuaternion(_handQuat)
  handPlane.position.copy(_handCamPos)
    .addScaledVector(_handFwd, dist)
    .addScaledVector(_handRight, HAND_OFFSET_X_FRAC * viewW)
    .addScaledVector(_handUp, HAND_OFFSET_Y_FRAC * viewH)
  handPlane.quaternion.copy(_handQuat)
}

function onPtrDown(cx, cy){
  if (sp > 0.85) {
    // 第三页：拖拽原地旋转地球
    globeDragging  = true
    globeDragLastX = cx
    globeDragLastY = cy
    markDragActive = true
    markDragMoved  = 0
    markDownX = cx
    markDownY = cy
    return
  }

  // ── 第二页：记录拖拽起点 + 延迟卡牌点击（在 onPtrUp 区分点击/拖拽） ──
  navDownX = cx; navDownY = cy
  navPendingCard = null
  navDragActive = false
  if (sp > 0.45 && sp < 0.87) {
    navDragActive = true
    navDragPrevX = cx
  }

  const el=mountEl.value
  if(el && dice2 && camera && renderer){
    const cvRect=renderer.domElement.getBoundingClientRect()
    _oNDC.set((cx-cvRect.left)/el.clientWidth*2-1, -((cy-cvRect.top)/el.clientHeight*2-1))
    _oRc.setFromCamera(_oNDC, camera)

    // 第二页：仅记录点击的卡牌（不立即跳转），交给 onPtrUp 判断是点击还是拖拽
    if (sp > 0.45 && sp < 0.87 && getNavCardOpacity() > 0.55) {
      const cardHits = _oRc.intersectObjects(navCards3D, false)
      if (cardHits.length > 0) {
        const diceHits = _oRc.intersectObject(dice2, true)
        if (diceHits.length === 0 || cardHits[0].distance < diceHits[0].distance) {
          navPendingCard = cardHits[0].object.userData.navPath
        }
      }
    }

    if(curPhase!=='interactive') return
    if(_oRc.intersectObject(dice2, true).length===0) return
  } else if(curPhase!=='interactive') {
    return
  }
  isDragging=true
  dragLastX=cx; dragLastY=cy; dragQuat.identity()
}
function onPtrMove(cx, cy){
  mouseX=cx; mouseY=cy

  const el=mountEl.value
  if (el && camera && renderer && navCards3D.length > 0 && getNavCardOpacity() > 0.05) {
    const cvRect=renderer.domElement.getBoundingClientRect()
    _oNDC.set((cx-cvRect.left)/el.clientWidth*2-1, -((cy-cvRect.top)/el.clientHeight*2-1))
    _oRc.setFromCamera(_oNDC, camera)
    const cardHits = _oRc.intersectObjects(navCards3D, false)
    if (cardHits.length > 0) {
      const hit = cardHits[0]
      navHoverCard = hit.object
      navHoverCard.worldToLocal(_navHitLocal.copy(hit.point))
      const nx = Math.max(-1, Math.min(1, _navHitLocal.x / (NAV_CARD_W * 0.5)))
      const ny = Math.max(-1, Math.min(1, _navHitLocal.y / (NAV_CARD_H * 0.5)))
      const u = navHoverCard.userData
      u.targetMagX = nx * Math.abs(nx) * NAV_MAGNET_X
      u.targetMagY = ny * Math.abs(ny) * NAV_MAGNET_Y
    } else {
      navHoverCard = null
    }
  } else {
    navHoverCard = null
  }
  for (const card of navCards3D) {
    if (card !== navHoverCard) {
      card.userData.targetMagX = 0
      card.userData.targetMagY = 0
    }
  }

  if (globeDragging && sp > 0.85 && globeGroup) {
    const dx = cx - globeDragLastX
    const dy = cy - globeDragLastY
    globeDragLastX = cx; globeDragLastY = cy
    const d = Math.hypot(dx, dy)
    markDragMoved += d
    // 转动地球时轻微震动反馈：累计位移达阈值触发一次轻震，避免每帧连续震
    if (d > 0) {
      globeVibAccum += d
      if (globeVibAccum >= 12) { globeVibAccum = 0; try { navigator.vibrate && navigator.vibrate(12) } catch (e) {} }
    }
    globeGroup.rotation.y += dx * 0.005
    globeGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2,
      globeGroup.rotation.x + dy * 0.005))
    if (particleSystem?.visible) particleSystem.rotation.copy(globeGroup.rotation)
    return
  }

  // ── 第二页卡牌环拖拽旋转 ──
  if (navDragActive && !isDragging && !globeDragging && sp > 0.45 && sp < 0.87) {
    const dx = cx - navDragPrevX
    navDragPrevX = cx
    navAngularVel = dx * NAV_DRAG_SENS
    navCardAngle += navAngularVel   // 右拖 = 顺时针旋转
    // 拖动旋转时：把角度量化成步进，每跨一步轻震一次，手感同塔罗扇形牌区
    const vStep = Math.round(navCardAngle / 0.10)
    if (vStep !== navVibStep) {
      navVibStep = vStep
      vib('light')
    }
    return
  }

  // ── 第三页占卜柱/名称悬停：停转地球 + 高亮 + 弹出星级提示 ──
  if (globeGroup && globeGroup.visible) {
    const hit = pickMarkMesh(cx, cy)
    const rec = hit && hit.userData.record ? hit : null
    const lbl = rec && hit.userData.kind === 'label' ? hit : null
    // 名称气泡高亮切换（加粗边框 + 主题色发光）
    if (lbl !== hoveredLabel) {
      if (hoveredLabel && hoveredLabel !== clickedLabel) setLabelActive(hoveredLabel, false)
      if (lbl) setLabelActive(lbl, true)
      hoveredLabel = lbl
    }
    if (rec) {
      hoveredMarkMesh = (hit.userData.kind && hit.userData.kind !== 'label') ? hit : null
      markHover.value = { record: rec.userData.record, kind: hit.userData.kind || 'label' }
      hoverTip.value = { x: cx, y: cy }
    } else {
      if (hoveredLabel && hoveredLabel !== clickedLabel) setLabelActive(hoveredLabel, false)
      hoveredLabel = null
      hoveredMarkMesh = null
      markHover.value = null
    }
  } else if (hoveredLabel) {
    if (hoveredLabel !== clickedLabel) setLabelActive(hoveredLabel, false)
    hoveredLabel = null
  }

  if(!isDragging) return
  const dx=cx-dragLastX, dy=cy-dragLastY
  dragLastX=cx; dragLastY=cy
  const dq=new THREE.Quaternion().setFromEuler(new THREE.Euler(dy*.016, dx*.016, 0))
  dragQuat.premultiply(dq)
}
function onPtrUp(cx, cy){
  if (pinching) { pinching = false; globeDragging = false; return }  // 双指捏合结束，不视为点击
  globeDragging = false
  navDragActive = false
  navHoverCard = null
  for (const card of navCards3D) {
    card.userData.targetMagX = 0
    card.userData.targetMagY = 0
  }

  // ── 第三页地球：拖拽位移很小 → 视为点击占卜柱/名称气泡，弹出介绍卡片 ──
  if (markDragActive && markDragMoved < 8) {
    const obj = pickMarkMesh(markDownX, markDownY)
    if (obj && obj.userData.record) {
      if (obj.userData.kind === 'label') {
        if (clickedLabel && clickedLabel !== obj) setLabelActive(clickedLabel, false)
        clickedLabel = obj
        setLabelActive(obj, true)
      }
      openMarkCard(obj.userData.record)
    }
  }
  markDragActive = false

  // 第二页卡牌：鼠标/触摸点击（按下到松开位移很小，且之前命中了卡牌）→ 跳转 + 中震动反馈
  if (navPendingCard && Math.hypot(cx - navDownX, cy - navDownY) < 8 && !document.body.classList.contains('dialog-open')) {
    vib('medium')
    router.push({ path: navPendingCard, query: { from: 'index', page: '2' } })
  }
  navPendingCard = null
  fistDragMode = false  // 松手后复位（保留变量以防其它分支引用）

  if(!isDragging) return
  isDragging=false
  baseQuat2.premultiply(dragQuat)
  dragQuat.identity()
  retFrom2=dice2.quaternion.clone()
  retT=0; curPhase='returning'
}

// 真实鼠标/触摸事件的包装器：手势模式下完全由光球驱动，忽略真实指针，避免两套输入互相抢光标
function onPtrDownEvt(e){
  if (store.isGesture) return
  onPtrDown(e.clientX ?? e.touches?.[0]?.clientX ?? 0, e.clientY ?? e.touches?.[0]?.clientY ?? 0)
}
function onPtrMoveEvt(e){
  if (store.isGesture) return
  onPtrMove(e.clientX ?? e.touches?.[0]?.clientX ?? mouseX, e.clientY ?? e.touches?.[0]?.clientY ?? mouseY)
}
function onPtrUpEvt(e){
  if (store.isGesture) return
  const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? mouseX
  const y = e.clientY ?? e.changedTouches?.[0]?.clientY ?? mouseY
  onPtrUp(x, y)
}

function animate(now){
  animId=requestAnimationFrame(animate)
  const dt=Math.min((now-prevTime)/1000,.05); prevTime=now
  const t = now / 1000

  // 地球缩放：解锁后若静止（不再改变大小）满 2 秒，则自动锁定大小
  if (zoomArmed.value && !zoomLocked.value && Date.now() - lastZoomChangeTime.value > 2000) {
    zoomLocked.value = true
    document.dispatchEvent(new CustomEvent('gesture-zoom-locked'))
  }

  // ── 滚动驱动：背景 ─────────────────────────────────
  scrollLerp += (scrollTarget - scrollLerp) * 0.06
  if (Math.abs(scrollTarget - scrollLerp) < 0.0008) scrollLerp = scrollTarget  // 渐近逼近时吸附到精确目标，避免第2/3页仍被判定为第1页
  sp = Math.max(0, Math.min(1, scrollLerp))
  if (renderer) {
    const onPage1 = sp < 0.5
    // 背景过渡改由下方两层 DOM 背景（.ds-pagebg1 / .ds-pagebg）的径向遮罩完成；
    // 画布保持透明，只负责骰子/地球/手（不被圆形裁切）。
    if (nightPlane) nightPlane.visible = false          // 第一页背景交给 DOM 图层 .ds-pagebg1
    // 前景「手」：随离开第1页的进度平滑淡出，到第二页完全消失
    if (handPlane) {
      const fade = onPage1 ? (1 - sp * 8 ): 0
      handPlane.visible = handReady && fade > 0.01
      handPlane.material.opacity = fade
    }
    // 径向过渡进度：0=第1页停泊，1=已到第二页（由平滑 sp 驱动，光圈随滚动平滑展开/收拢）
    irisT.value = Math.max(0, Math.min(1, sp / 0.5))
    // 画布始终透明，露出下方 DOM 背景图层（第一/二页）
    scene.background = null
    renderer.setClearColor(0x000000, 0)
  }

  // 第二页开始隐藏地板阴影网格，防止其深度值遮挡下方功能卡牌/地球粒子
  // 地板只在第一页骰子落地阶段显示；第二页卡牌环、globe/reversing 都不显示
  if (floorMesh) floorMesh.visible = sp < 0.35 && particlePhase !== 'globe' && particlePhase !== 'reversing'

  // ── 相机 z 轴：第二页滚轮缩放，离开第二页归位 ────────────────
  if (camera) {
    const targetZ = sp < 0.75 ? CAMERA_DEFAULT.z : cameraZoom
    camera.position.z += (targetZ - camera.position.z) * 0.09
  }

  // ── 地球自转（粒子动画完成后显示，拖拽时停止自转） ──────────
  if (globeGroup) {
    const showGlobe = (particlePhase === 'globe') ||
                      (particlePhase === 'animating'  && globeFadeStart > 0 && now >= globeFadeStart) ||
                      (particlePhase === 'reversing')
    globeGroup.visible = showGlobe
    if (showGlobe) {
      if (particlePhase !== 'reversing') {
        // 正向淡入（animating 交叠阶段 + globe 阶段）
        const gft  = Math.max(0, Math.min(1, (now - globeFadeStart) / GLOBE_FADE_MS))
        const gOpacity = gft * (2 - gft)
        globeSurface.material.uniforms.uOpacity.value = gOpacity * GLOBE_PARTICLE_OPACITY
        globeLines.material.opacity = gOpacity * 0.72
        if (globeCore) globeCore.material.opacity = gOpacity * GLOBE_CORE_OPACITY
        if (globeLandOverlay) globeLandOverlay.material.opacity = gOpacity * GLOBE_CORE_OPACITY
        if (globeMarks) globeMarks.traverse(o => { if (o.material) o.material.opacity = gOpacity })
      }
      // 拖拽或悬停时停止自转；停止交互 3 秒后恢复自转
      const interacting = globeDragging || !!markHover.value
      if (interacting) lastGlobeInteract = now
      if (particlePhase !== 'reversing' && (now - lastGlobeInteract) > 3000) globeGroup.rotation.y += dt * 0.10

      // 悬停高亮：被悬停的占卜柱加粗+增亮，其余回弹
      if (globeMarks) {
        const hm = hoveredMarkMesh
        // 柱体高亮时关闭深度测试并置于上层（renderOrder 10），名称卡片用 11 盖在柱体之上
        if (hm !== prevHoverMesh) {
          if (prevHoverMesh && prevHoverMesh.material) {
            prevHoverMesh.material.depthTest = true
            prevHoverMesh.renderOrder = 0
          }
          if (hm && hm.material) {
            hm.material.depthTest = false
            hm.renderOrder = 10
          }
          prevHoverMesh = hm
        }
        globeMarks.traverse(o => {
          // 跳过名称气泡：它由贴图重绘高亮，不能用柱体的 scale 方式（scale.y=1 会让 sprite 变得巨大）
          if (!o.userData || !o.userData.kind || o.userData.kind === 'label') return
          const target = (o === hm) ? 1.8 : 1
          const cur = o.scale.x
          const ns = cur + (target - cur) * 0.18
          o.scale.set(ns, 1, ns)
          if (o === hm && o.material) o.material.opacity = Math.min(1, o.material.opacity * 1.5)
        })
      }

      // 呼吸 + 鼠标悬停（始终更新）
      globeSurface.material.uniforms.uTime.value = now * 0.001
      if (renderer && camera && particlePhase !== 'reversing') {
        const _rc = renderer.domElement.getBoundingClientRect()
        const _nx = ((mouseX - _rc.left) / _rc.width)  * 2 - 1
        const _ny = -((mouseY - _rc.top)  / _rc.height) * 2 + 1
        _hoverRay.setFromCamera({ x: _nx, y: _ny }, camera)
        globeGroup.getWorldPosition(_hoverWP)
        const _sp = new THREE.Sphere(_hoverWP, GLOBE_R)
        if (_hoverRay.ray.intersectSphere(_sp, _hoverTarget)) {
          globeGroup.worldToLocal(_hoverTarget)
          globeSurface.material.uniforms.uHoverPoint.value.copy(_hoverTarget)
        } else {
          globeSurface.material.uniforms.uHoverPoint.value.set(0, 100, 0)
        }
      }
    }
  }

  // ── 粒子过渡动画 ─────────────────────────────────────────────
  if (particleSystem) {
    // 触发：完全进入第二页且处于骰子状态
    if (sp > 0.8 && particlePhase === 'dice') {
      particlePhase = 'animating'
      particleStartTime = now
      diceFadeStart = now          // 开始骰子渐隐
      globeFadeStart = now + Math.floor(PARTICLE_MS * 0.60)  // 粒子75%时地球开始淡入（交叠）
      if (glowSprite) glowSprite.visible = false
      particleSystem.visible = true
      particleSystem.rotation.set(0, 0, 0)
      orbitExpandScale = 1.0   // 从正常半径开始向外扩散
    }

    if (particlePhase === 'animating') {
      const rawP = Math.min(1, (now - particleStartTime) / PARTICLE_MS)
      const p = rawP < 0.5 ? 2 * rawP * rawP : 1 - 2 * (1 - rawP) * (1 - rawP)
      particleSystem.material.uniforms.uProgress.value = p
      particleSystem.rotation.y += dt * 0.06
      // 过渡粒子系统从骰子位置精确插值到地球位置：起点对齐骰子、终点对齐地球
      particleSystem.position.lerpVectors(dice2.position, globeGroup.position, p)

      // 骰子渐隐：前 DICE_FADE_MS 毫秒线性淡出
      const diceFadeT = Math.min(1, (now - diceFadeStart) / DICE_FADE_MS)
      const diceOp = 1 - diceFadeT * diceFadeT   // ease-in
      setDiceOpacity(diceOp)
      if (dice2.visible && diceOp <= 0.02) dice2.visible = false

      // 轨道扩散：scale 1→8，opacity 1→0
      // 每帧强制设 visible（否则 sp>0.5 时 else 分支会把轨道提前关掉）
      const expandP = Math.min(1, (now - particleStartTime) / ORBIT_EXPAND_MS)
      orbitExpandScale = 1 + expandP * 7
      setOrbitOpacity(Math.max(0, 1 - expandP))
      const _expandDone = expandP >= 1
      ;[orbitSphere, orbitSphere2, orbitParticles, orbitParticles2].forEach(o => { if (o) o.visible = !_expandDone })
      orbitCards2?.forEach(c => { if (c) c.visible = !_expandDone })

      // 持续同步旋转（地球在交叠期间跟随粒子系统）
      if (globeGroup.visible) globeGroup.rotation.copy(particleSystem.rotation)

      if (rawP >= 1) {
        particlePhase = 'globe'
        particleSystem.visible = false
        globeGroup.rotation.copy(particleSystem.rotation)
        globeGroup.visible = true
        // globeFadeStart 已在过渡触发时设置，无需重置
      }
    }

    // 返回第一页：globe 阶段 → 真倒放（同一批地形粒子变形回骰子）
    if (sp < 0.65 && particlePhase === 'globe') {
      particlePhase = 'reversing'
      reverseStartTime = now
      reverseStartPos.copy(globeGroup.position)   // 记录倒放起点（地球当前位置）
      globeSurface.material.uniforms.uMorphT.value = 0
      globeSurface.material.uniforms.uOpacity.value = GLOBE_PARTICLE_OPACITY
      globeSurface.material.uniforms.uHoverPoint.value.set(0, 100, 0)
      globeLines.material.opacity = 0.72
      if (globeCore) {
        globeCore.material.opacity = GLOBE_CORE_OPACITY
        globeCore.material.depthWrite = false   // 倒放时关闭深度写入，避免实体球遮挡向中心聚拢的粒子
      }
      if (globeLandOverlay) globeLandOverlay.material.opacity = GLOBE_CORE_OPACITY
      dice2.visible = false
      // 轨道从屏幕外开始收拢（scale 8 → 1，opacity 0 → 1）
      orbitExpandScale = 8.0
      orbInited = false; orb2Inited = false
      ;[orbitSphere, orbitSphere2, orbitParticles, orbitParticles2].forEach(o => { if (o) o.visible = true })
      orbitCards2?.forEach(c => { if (c) c.visible = true })
      setOrbitOpacity(0)
    }
    // 其他阶段中途返回 → 直接重置
    if (sp < 0.65 && particlePhase === 'animating') {
      particlePhase = 'dice'
      particleSystem.material.uniforms.uProgress.value = 0
      particleSystem.visible = false
      dice2.visible = true
      setDiceOpacity(1.0)
      if (glowSprite) glowSprite.visible = true
      orbitExpandScale = 1.0
      setOrbitOpacity(1.0)
      ;[orbitSphere, orbitSphere2, orbitParticles, orbitParticles2].forEach(o => { if (o) o.visible = true })
      orbitCards2?.forEach(c => { if (c) c.visible = true })
      globeGroup.visible = false
      if (globeSurface) { globeSurface.material.uniforms.uOpacity.value = 0; globeSurface.material.uniforms.uMorphT.value = 0 }
      if (globeLines)   globeLines.material.opacity = 0
      if (globeCore)    globeCore.material.opacity = 0
      if (globeLandOverlay) globeLandOverlay.material.opacity = 0
      cameraZoom = CAMERA_DEFAULT.z
    }

    // ── 真倒放：同一批地形色粒子从球面变形 → 骰子形状 → 骰子淡入 ──
    if (particlePhase === 'reversing') {
      const rawP  = Math.min(1, (now - reverseStartTime) / PARTICLE_MS)
      const morphT = rawP < 0.5 ? 2 * rawP * rawP : 1 - 2 * (1 - rawP) * (1 - rawP)
      globeSurface.material.uniforms.uMorphT.value = morphT
      // 轨道收拢：scale 8→1，opacity 在后 40% 淡入
      orbitExpandScale = Math.max(1, 8 * (1 - rawP))
      setOrbitOpacity(Math.max(0, (rawP - 0.6) / 0.4))

      // 背景地球（含地形粒子）从倒放起点精确插值到骰子位置，终点与骰子完全对齐（无滞后/偏移）
      globeGroup.position.lerpVectors(reverseStartPos, dice2.position, morphT)

      // 轮廓线 + 背景球体 + 陆地色 + 占卜柱 随变形同步渐隐（分母越大，粒子留得越久，与骰子淡入重叠越多）
      const lineFade = Math.max(0, 1.0 - morphT / 0.55)
      globeLines.material.opacity = 0.72 * lineFade
      if (globeCore) globeCore.material.opacity = GLOBE_CORE_OPACITY * lineFade
      if (globeLandOverlay) globeLandOverlay.material.opacity = GLOBE_CORE_OPACITY * lineFade
      if (globeMarks) globeMarks.traverse(o => { if (o.material) o.material.opacity = lineFade })

      // 骰子提前淡入，与仍在淡出的粒子重叠（起点 0.45，用剩余 55% 渐显）
      if (rawP > 0.8) {
        const t = (rawP - 0.8) / 0.2
        dice2.visible = true
        setDiceOpacity(t * t)
      }

      if (rawP >= 1) {
        particlePhase = 'dice'
        dice2.visible = true
        setDiceOpacity(1.0)
        if (glowSprite) glowSprite.visible = true
        setOrbitOpacity(1.0)
        orbitExpandScale = 1.0
        globeGroup.visible = false
        globeGroup.position.set(globeOffsetX(), 0, 0)
        if (globeSurface) { globeSurface.material.uniforms.uOpacity.value = 0; globeSurface.material.uniforms.uMorphT.value = 0 }
        if (globeLines)   globeLines.material.opacity = 0
        if (globeCore)    { globeCore.material.opacity  = 0; globeCore.material.depthWrite = true }
        if (globeLandOverlay) globeLandOverlay.material.opacity = 0
        if (globeMarks) globeMarks.traverse(o => { if (o.material) o.material.opacity = 0 })
        cameraZoom = CAMERA_DEFAULT.z
      }
    }

  }

  const el=mountEl.value; if(!el||!dice2) return
  const W=el.clientWidth, H=el.clientHeight

  if(curPhase==='fall'){
    // 骰子 2 (传统朱砂红一点) 物理重力与回弹
    if(fallY2 > 0 || fallVY2 > 0){
      fallVY2 -= 9.8*dt; fallY2 += fallVY2*dt
    }
    if(fallY2 <= 0 && fallVY2 < 0){
      const iv = Math.abs(fallVY2)            // 落地冲击速度
      fallY2 = 0; fallBounces2++
      fallVY2 = iv * 0.34
      fallAVX2 *= 0.72; fallAVY2 *= 0.72; fallAVZ2 *= 0.60
      // 每次落地播放撞击/掉落声（参考 Dice.vue 的 playBounce）
      if(iv > 1.5) playBounce(iv)
      if(iv > 1.5) vib('heavy')   // 首页骰子落地重震动，与骰子页面（Dice.vue）投掷掉落震动一致
    }
    dice2.position.y = fallY2 + DICE_PAGE1_Y_OFFSET   // 掉落落点 = 第一页偏移位置
    if(fallBounces2 >= 1 && fallY2 <= 0.005){
      fallAVX2 *= 0.975; fallAVY2 *= 0.975; fallAVZ2 *= 0.965
    }
    if(fallY2 > 0.005){
      fallAVX2 *= 0.994; fallAVY2 *= 0.994; fallAVZ2 *= 0.994
    }
    dice2.quaternion.multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(fallAVX2, fallAVY2, fallAVZ2))
    )

    // 骰子静止后触发对齐
    const totalAV2 = Math.abs(fallAVX2) + Math.abs(fallAVY2) + Math.abs(fallAVZ2)
    if(fallBounces2 >= 1 && fallY2 <= 0.005 && Math.abs(fallVY2) < 0.25 && totalAV2 < 0.006 && !alignStarted){
      alignStarted = true
      setTimeout(()=>{
        let op=0; const fi=setInterval(()=>{
          op+=.05; glowSprite.material.opacity=Math.min(op,1); if(op>=1)clearInterval(fi)
        },16)
        retFrom2=dice2.quaternion.clone()
        retT=0; curPhase='aligning'
      },250)
    }
  }

  if(curPhase==='aligning'){
    retT=Math.min(retT+dt*0.9,1)
    dice2.quaternion.slerpQuaternions(retFrom2,FACE1,easeBack(retT))
    dice2.position.y += (DICE_PAGE1_Y_OFFSET - dice2.position.y) * .07   // 对齐阶段收敛到第一页偏移落点
    if(retT>=1){
      curPhase='interactive'; eyeActive.value=true
      baseQuat2.copy(FACE1)
      triggerRightEyeAwaken()
    }
  }

  if(curPhase==='returning'){
    retT=Math.min(retT+dt*1.6,1)
    dice2.quaternion.slerpQuaternions(retFrom2,FACE1,easeBack(retT))
    if(retT>=1){
      curPhase='interactive'
      baseQuat2.copy(FACE1)
      dragQuat.identity()
    }
  }

  // ── 滚动驱动骰子世界坐标（交互/归位阶段覆盖静止位置）──────────
  // 骰子只在 page2→page3（sp 0.5→1.0）阶段移动，page1→page2 保持原位
  if (curPhase === 'interactive' || curPhase === 'returning') {
    const pathT = Math.max(0, (sp - 0.5) * 2)   // sp<0.5 → 0，sp=1 → 1
    // 骰子终点 x 跟随地球位置：桌面/横屏地球偏左(-0.6)→骰子左移落入；竖屏手机地球居中(0)→骰子不左移
    const sdx = cubicBez(pathT, DICE_PATH_X[0], DICE_PATH_X[1], DICE_PATH_X[2], globeOffsetX())
    const sdy = cubicBez(pathT, DICE_PATH_Y[0], DICE_PATH_Y[1], DICE_PATH_Y[2], DICE_PATH_Y[3])
    // 首页第一页骰子整体下移：sp<0.42 全量，sp 0.42→0.5 平滑淡出；第二页起无偏移（其他页位置不变）
    const page1Off = sp < 0.5
      ? DICE_PAGE1_Y_OFFSET * Math.min(1, Math.max(0, (0.5 - sp) / 0.08))
      : 0
    dice2.position.x = sdx
    dice2.position.y = sdy + page1Off
    if (glowSprite) {
      glowSprite.position.x = sdx
      glowSprite.position.y = FLOOR_Y + 0.005 + sdy + page1Off
    }
  }

  // 把全局鼠标坐标转成画布局部坐标
  const cvRect = renderer.domElement.getBoundingClientRect()
  const localMX = mouseX - cvRect.left
  const localMY = mouseY - cvRect.top

  if(curPhase==='interactive'){
    const nx=(localMX/W)*2-1, ny=(localMY/H)*2-1
    tFollowRX= ny*.52; tFollowRY= nx*.52
    followRX+=(tFollowRX-followRX)*.05
    followRY+=(tFollowRY-followRY)*.05
    if(isDragging){
      dice2.quaternion.copy(baseQuat2).premultiply(dragQuat)
    } else {
      const fq=new THREE.Quaternion().setFromEuler(new THREE.Euler(followRX,followRY,0))
      dice2.quaternion.copy(baseQuat2).premultiply(fq)
    }
  }

  // ── 滚动驱动骰子旋转：page2→page3 过渡中骰子向左滚动 90° ──────
  if (dice2 && (curPhase === 'interactive' || curPhase === 'returning')) {
    const pathT = Math.max(0, (sp - 0.5) * 2)
    if (pathT > 0) {
      // ease-in-out，让滚动开头慢、结尾也慢
      const rollEased = pathT < 0.5
        ? 2 * pathT * pathT
        : 1 - 2 * (1 - pathT) * (1 - pathT)
      // 向左移动 → 绕 Z 轴正向（逆时针）滚动 90°
      _rollQ.setFromAxisAngle(_rollAxis, rollEased * Math.PI / 2)
      dice2.quaternion.premultiply(_rollQ)
    }
  }

  drawRightEye(localMX,localMY,W,H)

  // spotLight + mouseLight 同步跟随鼠标，阴影随光源位置变化
  updateNavCardRing(t, dt)

  if(spotLight && mouseLight){
    const nMX = (localMX / W) * 2 - 1
    const nMY = -((localMY / H) * 2 - 1)
    const lx = nMX * 1.8
    const ly = Math.max(nMY * 1.2 + 0.2, -0.3)  // 防止光源降到骰子正下方
    const lz = 1.5
    const tx = dice2.position.x, ty = dice2.position.y, tz = dice2.position.z
    spotLight.position.set(lx + tx, ly + ty, lz)
    spotLight.target.position.set(tx, ty, tz)
    mouseLight.position.set(lx + tx, ly + ty, lz)
    const inFall   = curPhase === 'fall' || curPhase === 'aligning'
    const active   = curPhase === 'interactive' || curPhase === 'returning'
    if (sp > 0.85) {
      // 第三页：关掉鼠标追踪光线，改用固定顶光
      spotLight.intensity  = 0.4
      mouseLight.intensity = 0
    } else if (active) {
      spotLight.intensity  = 3.2 + Math.sin(now * 0.0007) * 0.2
      mouseLight.intensity = 1.5
    } else if (inFall) {
      // 落下 / 对齐阶段：鼠标灯光也跟随，营造戏剧感
      spotLight.intensity  = 2.4
      mouseLight.intensity = 1.6
    } else {
      spotLight.intensity  = 1.5
      mouseLight.intensity = 0
    }
  }

  // 动态粒子轨道 + 公转小球
  if (orbitSphere && orbitSphere2 && orbitParticles && orbCur) {
    if ((curPhase === 'interactive' || curPhase === 'returning') && (sp < 0.75 || particlePhase === 'animating')) {
      if (!orbitSphere.visible && particlePhase === 'dice') { orbitSphere.visible = true; orbitSphere2.visible = true; orbitParticles.visible = true }
      orbitAngle += dt * 0.55
      const TX = ORBIT_TILT, TZ = ORBIT_TILT_Z
      const cx = dice2.position.x, cy = dice2.position.y + ORBIT_Y, cz = dice2.position.z

      // ── 计算每个粒子的基准位置（带扩散倍数 + 每粒子随机偏移，形成木星环般弥散但仍在轨道上）
      const _scatter1 = ORBIT_R * 0.00 * orbitExpandScale   // 粒子随机散布强度（轨道半径比例），调大更弥散、调小更贴轨道
      for (let i = 0; i < ORBIT_N; i++) {
        const a = (i / ORBIT_N) * Math.PI * 2
        const px0 = ORBIT_R  * orbitExpandScale * Math.cos(a)
        const py0 = -ORBIT_RV * orbitExpandScale * Math.sin(a) * Math.sin(TX)
        const pz0 = ORBIT_RV  * orbitExpandScale * Math.sin(a) * Math.cos(TX)
        orbBase[i*3]   = cx + px0 * Math.cos(TZ) - py0 * Math.sin(TZ) + orbRand[i*3]   * _scatter1
        orbBase[i*3+1] = cy + px0 * Math.sin(TZ) + py0 * Math.cos(TZ) + orbRand[i*3+1] * _scatter1
        orbBase[i*3+2] = cz + pz0                                + orbRand[i*3+2] * _scatter1
      }

      // ── 首帧初始化 / 过渡期直接定位，正常态用弹簧物理
      if (!orbInited) { orbCur.set(orbBase); orbInited = true }

      const _orbitTransit1 = particlePhase === 'animating' || particlePhase === 'reversing'
      if (_orbitTransit1) {
        orbCur.set(orbBase)
      } else {
        _oNDC.set((localMX / W) * 2 - 1, -((localMY / H) * 2 - 1))
        _oRc.setFromCamera(_oNDC, camera)
        const hasMouse = !isDragging && curPhase === 'interactive'
        const _rox = _oRc.ray.origin.x,    _roy = _oRc.ray.origin.y,    _roz = _oRc.ray.origin.z
        const _rdx = _oRc.ray.direction.x, _rdy = _oRc.ray.direction.y, _rdz = _oRc.ray.direction.z

        // ── 轨道悬停音效：指针/手指经过轨道环（轨道1 或 轨道2）时触发一次（参考 orbitTick + 轻震动）
        {
          const cxo = dice2.position.x, czo = dice2.position.z, cyo = dice2.position.y
          const d1 = orbitRingDist(_oRc.ray, cxo, cyo + ORBIT_Y,  czo, ORBIT_R,  ORBIT_RV,  ORBIT_TILT,  ORBIT_TILT_Z,  orbitExpandScale)
          const d2 = orbitRingDist(_oRc.ray, cxo, cyo + ORBIT2_Y, czo, ORBIT2_R, ORBIT2_RV, ORBIT2_TILT, ORBIT2_TILT_Z, orbitExpandScale)
          const hovering = hasMouse && (d1 < ORBIT_HOVER_R || d2 < ORBIT_HOVER_R)
          if (hovering) {
            const now = performance.now()
            // 仅在"进入轨道"的瞬间触发，并与上次间隔 600ms 节流，避免快速连发
            if (!orbitHovering && now - lastOrbitHoverT > 600) { playOrbit(); lastOrbitHoverT = now }
            orbitHovering = true
          } else {
            orbitHovering = false
          }
        }

        const VEL_AMP  = 0.00017, DRIFT_F  = 0.22, VEL_TAU  = 0.013
        const DAMP     = 0.94,    SPRING_K = 0.035, REP_R = 0.34, REP_F = 0.004
        for (let i = 0; i < ORBIT_N; i++) {
          const i3 = i * 3
          const wavePh = (i / ORBIT_N) * Math.PI * 2
          const ph = wavePh + orbPhase[i] * 0.22
          const vxt = Math.sin(DRIFT_F * now + ph)            * VEL_AMP
          const vyt = Math.cos(DRIFT_F * now * 0.57 + ph)     * VEL_AMP * 0.36
          const vzt = Math.sin(DRIFT_F * now * 0.83 + ph)     * VEL_AMP * 0.91
          orbVel[i3]   += (vxt - orbVel[i3])   * VEL_TAU
          orbVel[i3+1] += (vyt - orbVel[i3+1]) * VEL_TAU
          orbVel[i3+2] += (vzt - orbVel[i3+2]) * VEL_TAU
          const bdx = orbBase[i3]   - orbCur[i3]
          const bdy = orbBase[i3+1] - orbCur[i3+1]
          const bdz = orbBase[i3+2] - orbCur[i3+2]
          orbVel[i3]   += bdx * SPRING_K
          orbVel[i3+1] += bdy * SPRING_K
          orbVel[i3+2] += bdz * SPRING_K
          if (hasMouse) {
            const px = orbCur[i3], py = orbCur[i3+1], pz = orbCur[i3+2]
            const t = (px-_rox)*_rdx + (py-_roy)*_rdy + (pz-_roz)*_rdz
            if (t > 0) {
              const mdx = px - (_rox + _rdx*t), mdy = py - (_roy + _rdy*t), mdz = pz - (_roz + _rdz*t)
              const md2 = mdx*mdx + mdy*mdy + mdz*mdz
              if (md2 < REP_R * REP_R && md2 > 1e-6) {
                const md = Math.sqrt(md2)
                const f = REP_F * (1 - md / REP_R) / md
                orbVel[i3] += mdx * f; orbVel[i3+1] += mdy * f; orbVel[i3+2] += mdz * f
              }
            }
          }
          orbVel[i3] *= DAMP; orbVel[i3+1] *= DAMP; orbVel[i3+2] *= DAMP
          orbCur[i3]   += orbVel[i3]
          orbCur[i3+1] += orbVel[i3+1]
          orbCur[i3+2] += orbVel[i3+2]
        }
      }
      orbitParticles.geometry.attributes.position.needsUpdate = true

      // ── 公转铜钱（带扩散倍数 + 上下漂浮）
      const oa = orbitAngle
      // 漂浮幅度：轨道垂直半径的比例；调大更明显飘、调小更贴轨道。双频正弦+独立相位 → 不规则漂浮感
      const COIN_FLOAT_AMP = ORBIT_RV * 0.07
      const coinF1 = (Math.sin(now * 0.0011) + 0.45 * Math.sin(now * 0.0024 + 1.7)) * COIN_FLOAT_AMP
      const coinF2 = (Math.sin(now * 0.0011 + 2.2) + 0.45 * Math.sin(now * 0.0019 + 0.5)) * COIN_FLOAT_AMP
      const spx = ORBIT_R  * orbitExpandScale * Math.cos(oa)
      const spy = -ORBIT_RV * orbitExpandScale * Math.sin(oa) * Math.sin(TX)
      const spz = ORBIT_RV  * orbitExpandScale * Math.sin(oa) * Math.cos(TX)
      orbitSphere.position.set(
        cx + spx * Math.cos(TZ) - spy * Math.sin(TZ),
        cy + spx * Math.sin(TZ) + spy * Math.cos(TZ) + coinF1,
        cz + spz
      )
      orbitCoinSpin += dt * 1.4
      orbitSphere.rotation.set(Math.PI / 2, 0, -orbitCoinSpin)

      const oa2 = oa + Math.PI
      const sp2x = ORBIT_R  * orbitExpandScale * Math.cos(oa2)
      const sp2y = -ORBIT_RV * orbitExpandScale * Math.sin(oa2) * Math.sin(TX)
      const sp2z = ORBIT_RV  * orbitExpandScale * Math.sin(oa2) * Math.cos(TX)
      orbitSphere2.position.set(
        cx + sp2x * Math.cos(TZ) - sp2y * Math.sin(TZ),
        cy + sp2x * Math.sin(TZ) + sp2y * Math.cos(TZ) + coinF2,
        cz + sp2z
      )
      orbitSphere2.rotation.set(-Math.PI / 2, 0, -orbitCoinSpin)
    } else {
      orbitSphere.visible = false
      orbitSphere2.visible = false
      orbitParticles.visible = false
      orbInited = false
    }
  }

  // ── 轨道2：粒子环 + 三张卡牌公转
  if (orbitParticles2 && orb2Cur) {
    if ((curPhase === 'interactive' || curPhase === 'returning') && (sp < 0.75 || particlePhase === 'animating')) {
      if (!orbitParticles2.visible && particlePhase === 'dice') orbitParticles2.visible = true
      orbitAngle2 += dt * ORBIT2_SPEED
      orb2CardSpin += dt * ORBIT2_CARD_SPIN
      const T2X = ORBIT2_TILT, T2Z = ORBIT2_TILT_Z
      const cx2 = dice2.position.x, cy2 = dice2.position.y + ORBIT2_Y, cz2 = dice2.position.z

      const _scatter2 = ORBIT2_R * 0.00 * orbitExpandScale   // 粒子随机散布强度（轨道半径比例），调大更弥散、调小更贴轨道
      for (let i = 0; i < ORBIT2_N; i++) {
        const a = (i / ORBIT2_N) * Math.PI * 2
        const px0 = ORBIT2_R  * orbitExpandScale * Math.cos(a)
        const py0 = -ORBIT2_RV * orbitExpandScale * Math.sin(a) * Math.sin(T2X)
        const pz0 =  ORBIT2_RV * orbitExpandScale * Math.sin(a) * Math.cos(T2X)
        orb2Base[i*3]   = cx2 + px0 * Math.cos(T2Z) - py0 * Math.sin(T2Z) + orb2Rand[i*3]   * _scatter2
        orb2Base[i*3+1] = cy2 + px0 * Math.sin(T2Z) + py0 * Math.cos(T2Z) + orb2Rand[i*3+1] * _scatter2
        orb2Base[i*3+2] = cz2 + pz0                                + orb2Rand[i*3+2] * _scatter2
      }
      if (!orb2Inited) { orb2Cur.set(orb2Base); orb2Inited = true }

      const _orbitTransit2 = particlePhase === 'animating' || particlePhase === 'reversing'
      if (_orbitTransit2) {
        orb2Cur.set(orb2Base)
      } else {
        const hasMouse2 = !isDragging && curPhase === 'interactive'
        const r2ox = _oRc.ray.origin.x,    r2oy = _oRc.ray.origin.y,    r2oz = _oRc.ray.origin.z
        const r2dx = _oRc.ray.direction.x, r2dy = _oRc.ray.direction.y, r2dz = _oRc.ray.direction.z
        const VEL_AMP2 = 0.00015, DRIFT_F2 = 0.18, VEL_TAU2 = 0.013
        const DAMP2 = 0.94, SPRING_K2 = 0.035, REP_R2 = 0.34, REP_F2 = 0.004
        for (let i = 0; i < ORBIT2_N; i++) {
          const i3 = i * 3
          const ph2 = (i / ORBIT2_N) * Math.PI * 2 + orb2Phase[i] * 0.22
          const vxt2 = Math.sin(DRIFT_F2 * now + ph2)        * VEL_AMP2
          const vyt2 = Math.cos(DRIFT_F2 * now * 0.57 + ph2) * VEL_AMP2 * 0.36
          const vzt2 = Math.sin(DRIFT_F2 * now * 0.83 + ph2) * VEL_AMP2 * 0.91
          orb2Vel[i3]   += (vxt2 - orb2Vel[i3])   * VEL_TAU2
          orb2Vel[i3+1] += (vyt2 - orb2Vel[i3+1]) * VEL_TAU2
          orb2Vel[i3+2] += (vzt2 - orb2Vel[i3+2]) * VEL_TAU2
          const bdx2 = orb2Base[i3]   - orb2Cur[i3]
          const bdy2 = orb2Base[i3+1] - orb2Cur[i3+1]
          const bdz2 = orb2Base[i3+2] - orb2Cur[i3+2]
          orb2Vel[i3]   += bdx2 * SPRING_K2
          orb2Vel[i3+1] += bdy2 * SPRING_K2
          orb2Vel[i3+2] += bdz2 * SPRING_K2
          if (hasMouse2) {
            const px2 = orb2Cur[i3], py2 = orb2Cur[i3+1], pz2 = orb2Cur[i3+2]
            const t2 = (px2-r2ox)*r2dx + (py2-r2oy)*r2dy + (pz2-r2oz)*r2dz
            if (t2 > 0) {
              const mdx2 = px2 - (r2ox + r2dx*t2), mdy2 = py2 - (r2oy + r2dy*t2), mdz2 = pz2 - (r2oz + r2dz*t2)
              const md2sq = mdx2*mdx2 + mdy2*mdy2 + mdz2*mdz2
              if (md2sq < REP_R2 * REP_R2 && md2sq > 1e-6) {
                const f2 = REP_F2 * (1 - Math.sqrt(md2sq) / REP_R2) / Math.sqrt(md2sq)
                orb2Vel[i3] += mdx2*f2; orb2Vel[i3+1] += mdy2*f2; orb2Vel[i3+2] += mdz2*f2
              }
            }
          }
          orb2Vel[i3] *= DAMP2; orb2Vel[i3+1] *= DAMP2; orb2Vel[i3+2] *= DAMP2
          orb2Cur[i3]   += orb2Vel[i3]
          orb2Cur[i3+1] += orb2Vel[i3+1]
          orb2Cur[i3+2] += orb2Vel[i3+2]
        }
      }
      orbitParticles2.geometry.attributes.position.needsUpdate = true

      if (orbitCards2.length > 0) {
        if (!orbitCards2[0].visible && particlePhase === 'dice') orbitCards2.forEach(c => { c.visible = true })
        const CARD_FLOAT_AMP = ORBIT2_RV * 0.03   // 卡牌漂浮幅度（轨道垂直半径比例），调大更飘、调小更贴轨道
        for (let k = 0; k < 3; k++) {
          const a = orbitAngle2 + (k - 1) * ORBIT2_CARD_GAP
          const px0 = ORBIT2_R  * orbitExpandScale * Math.cos(a)
          const py0 = -ORBIT2_RV * orbitExpandScale * Math.sin(a) * Math.sin(T2X)
          const pz0 =  ORBIT2_RV * orbitExpandScale * Math.sin(a) * Math.cos(T2X)
          // 每张卡牌独立相位 + 双频正弦 → 三张错落漂浮，互不重复
          const cardF = (Math.sin(now * 0.0011 + k * 2.1) + 0.45 * Math.sin(now * 0.0024 + k * 1.3)) * CARD_FLOAT_AMP
          orbitCards2[k].position.set(
            cx2 + px0 * Math.cos(T2Z) - py0 * Math.sin(T2Z),
            cy2 + px0 * Math.sin(T2Z) + py0 * Math.cos(T2Z) + cardF,
            cz2 + pz0
          )
          orbitCards2[k].rotation.set(0, orb2CardSpin, 0)
        }
      }
    } else {
      orbitParticles2.visible = false
      orb2Inited = false
      orbitCards2.forEach(c => { c.visible = false })
    }
  }

  renderer.render(scene, camera)

  // 手前景 overlay：清掉深度后单独渲染一次，100% 盖在骰子及所有物体之上（不依赖渲染队列排序，
  // 也不受骰子透明化影响）。handScene 无背景，render 时不会擦掉主画面；depthTest:false 进一步确保覆盖。
  if (handPlane && handPlane.visible) {
    updateHandTransform()
    renderer.autoClear = false
    renderer.clearDepth()
    renderer.render(handScene, camera)
    renderer.autoClear = true
  }
}

onMounted(async ()=>{
  await nextTick()
  // 等两帧让 flex 布局完全稳定
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const el=mountEl.value; if(!el) return
  initThree(el)

  // ResizeObserver 用 contentRect，比 clientWidth 更可靠
  ro = new ResizeObserver(entries => {
    const entry = entries[0]
    if (!entry) return
    const W = Math.round(entry.contentRect.width)
    const H = Math.round(entry.contentRect.height)
    if (W === 0 || H === 0) return
    onResize(W, H)
  })
  ro.observe(el)

  animId=requestAnimationFrame(animate)

  const root = rootEl.value
  if (root) {
    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })
  }
  // 手势：第一/二页握拳拖拽骰子/轨道、点“向下滚动页面”翻页；第三页捏合缩放地球；悬停驱动光标
  document.addEventListener('gesture-click', onGestureClick)
  document.addEventListener('gesture-pinch', onGesturePinch)
  document.addEventListener('gesture-hover', onGestureHover)
  document.addEventListener('gesture-release', onGestureRelease)
  document.addEventListener('gesture-zoom-armed', onGestureZoomArmed)
  document.addEventListener('gesture-point-hold', onGesturePointHold)
  document.addEventListener('gesture-trigger', onGestureTrigger)
  document.addEventListener('gesture-fist-drag', onGestureFistDrag)

  globeWrap=el.parentElement||el
  globeWrap.addEventListener('mousedown',   onPtrDownEvt)
  globeWrap.addEventListener('touchstart',  onPtrDownEvt, {passive:true})
  globeWrap.addEventListener('touchstart',  onGlobeTouchStart, {passive:true})
  window.addEventListener('touchmove', onGlobeTouchMove, {passive:false})
  window.addEventListener('touchend',  onGlobeTouchEnd, {passive:true})
  window.addEventListener('mousemove', onPtrMoveEvt)
  window.addEventListener('touchmove', onPtrMoveEvt, {passive:true})
  window.addEventListener('mouseup',   onPtrUpEvt)
  window.addEventListener('touchend',  onPtrUpEvt)

  // 漂浮汉字探照灯：跟随光标照亮背景中的隐藏汉字
  document.addEventListener('pointermove', onLampMove, { passive: true })
  document.addEventListener('mousemove',   onLampMove, { passive: true })
  document.addEventListener('pointerleave', onLampLeave)

  // 当从导航卡片返回（from=index&page=2）时，自动定位第二页
  await nextTick()
  applyShowcaseQueryPage(route.query?.page, route.query?.from)
  // 定位后立即清除 ?page=2 / from，避免刷新或再次进入时被误判为“返回”又跳第二页；
  // 浏览器直接进 /index（无 from）永远第一页，返回键（带 from=index）这次跳页仍生效。
  if (route.query?.page || route.query?.from) {
    router.replace({ path: '/index' })
  }
  // 持久化昼夜：进入时若已为昼，3D 贴图默认是夜版，需主动切到昼版（背景/手）
  if (isDay.value) {
    if (nightPlane && dayNightTex) nightPlane.material.map = dayNightTex
    if (handPlane && dayHandTex) handPlane.material.map = dayHandTex
  }
  // 持久化昼夜：按当前昼/夜状态同步灯光与骰子冷/暖调（默认初始化为暖白，夜间需改冷）
  applyDayNightLighting()
  stopPageQueryWatch = watch(() => route.query?.page, (v) => applyShowcaseQueryPage(v, route.query?.from))
  // 文案中英轮换：每 10 秒渐隐→切换语言→渐显
  captionTimer = setInterval(() => {
    captionFading.value = true                      // 先渐隐
    setTimeout(() => {
      captionEn.value = !captionEn.value            // 隐完切换语言
      captionFading.value = false                   // 再渐显
    }, 1800)
  }, 10000)
  // 首次任意交互后恢复 AudioContext，确保首页自动掉落音效不被浏览器自动播放策略静音
  const resumeOnce = () => resumeAudio()
  ;['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(ev =>
    window.addEventListener(ev, resumeOnce, { once: true, passive: true })
  )
})

onUnmounted(()=>{
  cancelAnimationFrame(animId)
  if (snapAnimId) cancelAnimationFrame(snapAnimId)
  navHoverCard = null
  if (navGlowTex) {
    navGlowTex.dispose?.()
    navGlowTex = null
  }
  rootEl.value?.removeEventListener('wheel', onWheel)
  rootEl.value?.removeEventListener('touchstart', onTouchStart)
  rootEl.value?.removeEventListener('touchend', onTouchEnd)
  document.removeEventListener('gesture-click', onGestureClick)
  document.removeEventListener('gesture-pinch', onGesturePinch)
  document.removeEventListener('gesture-hover', onGestureHover)
  document.removeEventListener('gesture-release', onGestureRelease)
  document.removeEventListener('gesture-zoom-armed', onGestureZoomArmed)
  document.removeEventListener('gesture-point-hold', onGesturePointHold)
  document.removeEventListener('gesture-trigger', onGestureTrigger)
  document.removeEventListener('gesture-fist-drag', onGestureFistDrag)
  stopPageQueryWatch?.()
  ro?.disconnect()
  window.removeEventListener('mousemove',onPtrMoveEvt)
  window.removeEventListener('touchmove',onPtrMoveEvt)
  window.removeEventListener('mouseup',  onPtrUpEvt)
  window.removeEventListener('touchend', onPtrUpEvt)
  globeWrap.removeEventListener('touchstart', onGlobeTouchStart)
  window.removeEventListener('touchmove', onGlobeTouchMove)
  window.removeEventListener('touchend',  onGlobeTouchEnd)
  document.removeEventListener('pointermove', onLampMove)
  document.removeEventListener('mousemove',   onLampMove)
  document.removeEventListener('pointerleave', onLampLeave)
  renderer?.dispose(); renderer?.domElement?.remove()
})
</script>

<style scoped>
/* 首页新：弹窗整体半透明（70%），不影响其他页面的弹窗。
   !important 是为了压过 useCurtainMotion.js 入场动画的 fill:both（否则 opacity 会被钉在 1，透明不生效）。 */
.help-popup {
  background-color: rgba(255,255,255,0.7);  /* 半透明白底玻璃感（昼夜统一）；黑夜由 .app-shell.dark .help-popup 的 !important 黑底覆盖，文字不再被整体 opacity 调暗 */
}
.ds-root {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  /* 隐藏原生滚动条：WebGL 合成层会将其遮盖，用 .ds-scrollbar 替代 */
  scrollbar-width: none;
}
/* 首页鼠标指针：第一、二页显示星星 ✦，覆盖全屏 canvas 的 grab 光标使其可见，热点居中，失败回退 auto */
/* 夜晚（默认）：白色星星 + 黑描边，暗背景上清晰 */
.ds-cursor-star,
.ds-cursor-star .ds-wrap,
.ds-cursor-star .ds-wrap:active {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ctext x='14' y='16' font-size='22' text-anchor='middle' dominant-baseline='central' fill='white' stroke='black' stroke-width='0.7'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E") 14 14, auto;
}
/* 白天（.is-day）：黑色星星 + 白描边，亮背景上清晰 */
.ds-cursor-star.is-day,
.ds-cursor-star.is-day .ds-wrap,
.ds-cursor-star.is-day .ds-wrap:active {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ctext x='14' y='16' font-size='22' text-anchor='middle' dominant-baseline='central' fill='black' stroke='white' stroke-width='0.7'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E") 14 14, auto;
}
.ds-root::-webkit-scrollbar { display: none; }

.ds-page1 {
  height: 100vh;
  height: 100dvh;
  position: relative;
  background: transparent;  /* canvas 负责背景色 */
}

/* 第一页骰子下方文案：不参与交互，置于画布之上、呼吸灯之下 */
.ds-dice-caption {
  position: fixed;
  left: 50%;
  top: 80%;        /* ← 桌面端竖向位置：调大=更靠下（如 68% / 72%），调小=更靠上 */
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: none;
  text-align: center;
  user-select: none;
  width: 90%;
  max-width: 480px;
  font-family: "Songti SC", "STSong", "SimSun", "宋体", serif;  /* 宋体 */
  opacity: 0;                                   /* 默认隐藏，滚动到第一页才渐入 */
  visibility: hidden;
  transition: opacity 0.7s ease, visibility 0s linear 0.7s;  /* 渐入渐隐 0.7s */
}
/* 仅第一页：渐入至 70% 不透明度 */
.ds-dice-caption.is-visible {
  opacity: 0.7;
  visibility: visible;
  transition: opacity 0.7s ease, visibility 0s linear 0s;
}
.ds-dice-caption-line1 {
  /* 纯比例自适应（同骰子）：随视口长边缩放，无上下限 */
  font-size: 2.5vmax;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.55);
  margin-bottom: 8px;
}
.ds-dice-caption-line2 {
  font-size: clamp(12px, 1.6vw, 15px);
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.04em;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}
/* 白天模式：黑色文字，去掉白底阴影 */
.ds-dice-caption--day .ds-dice-caption-line1 {
  color: rgba(0, 0, 0, 0.82);
  text-shadow: none;
}
.ds-dice-caption--day .ds-dice-caption-line2 {
  color: rgba(0, 0, 0, 0.6);
  text-shadow: none;
}
/* 移动端与桌面端一致：固定在屏幕 80% 高度处（无需从底部避让，80% 仍在导航栏之上） */
@media (max-width: 767px) {
  .ds-dice-caption {
    top: 80%;
    bottom: auto;
  }
  /* 手机端第二行：字号已由上方 vmax 自适应，此处只额外压低不透明度 */
  .ds-dice-caption-line2 {
    opacity: 0.7;  /* 在整体 70% 基础上再叠加 70%，实际约 49% */
  }
}
/* 中英轮换的内层渐隐渐显（独立于外层第一页显隐），1.8s 缓入缓出，观感温和 */
.ds-dice-caption-text {
  opacity: 1;
  transition: opacity 1.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.ds-dice-caption-text.is-fading {
  opacity: 0;
}

/* Three.js canvas：z-index:10 确保在所有页面内容上方 */
.ds-wrap {
  position: fixed;
  inset: 0;
  z-index: 10;
  cursor: grab;
  overflow: hidden;
}
.ds-wrap:active { cursor: grabbing; }

/* 第一页 DOM 背景图层（替代原画布内 nightPlane）：置于最底层，画布透明时透出 */
.ds-pagebg1 {
  position: fixed;
  inset: 0;
  z-index: 1;
  background-size: auto 100%;        /* 高度铺满、比例不变、宽度溢出裁切（与手/夜晚1背景一致） */
  background-position: center center;
  background-repeat: no-repeat;
  /* 底色由内联 style 按昼夜驱动：白昼白(#fff)、夜黑(#000)，不在此硬编码以免白昼露黑 */
  pointer-events: none;
}

/* 第二、三页 DOM 背景图层：置于第一页背景(z-index:1)之上、画布(z-index:10)下方 */
.ds-pagebg {
  position: fixed;
  inset: 0;
  z-index: 2;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  pointer-events: none;
  transform-origin: center center;       /* 从中心缩放展开 */
  will-change: transform, opacity;
}

/* 骰子之上的前景图：整屏铺满、不透明，营造视觉层次；不拦截交互；填充方式与夜晚1一致（高度填满、比例不变） */
.ds-fg {
  position: fixed;
  inset: 0;
  z-index: 20;            /* 高于画布(z-index:10) */
  pointer-events: none;   /* 鼠标穿透，不影响拖拽/点击 */
  background-size: auto 100%;  /* 高度填满、比例不变、宽度溢出裁切，与夜晚1背景一致的填充方式 */
  background-position: center;  /* 必须与 3D 居中的背景图(夜晚1)对齐：保持 center 才会和背景图重叠；
                                   改成 70%/right 等百分比会因依赖视口宽度，导致手机与桌面相对背景位置不同（对不上） */
  background-repeat: no-repeat;
  /* 不要加 transform: translate(...) 移位：translateY 相对视口高、translateX 相对视口宽，
     不同宽高比设备换算像素不同，也会造成两端对不上。
     若需“在所有设备上都与背景图保持同一相对偏移”，应把手图改造成 3D 前景平面
     （与背景图同相机、同 fit 逻辑）后再整体平移，投影后相对位置才会跨设备一致。 */
}

/* 第二页：背景交给 Three.js，保留 height 撑出滚动空间 */
.ds-page2 {
  height: 100vh;
  height: 100dvh;
  position: relative;
  background: transparent;
}

/* 第三页（地球）：同上 */
.ds-page3 {
  height: 100vh;
  height: 100dvh;
  position: relative;
  background: transparent;
}

/* 呼吸灯提示文字：第一、二页底部显示，可点击向下滚动 */
.ds-breathe {
  position: fixed;
  bottom: max(1.5vh, 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  pointer-events: auto;          /* 可点击 / 手势命中 */
  border: none;
  background: none;
  padding: 8px 14px;             /* 增大命中区域，便于手掌光标/手指点击 */
  margin: 0;
  font: inherit;
  cursor: pointer;
  font-size: clamp(12px, 1.4vw, 16px);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.15em;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  animation: ds-breathe-pulse 4s ease-in-out infinite;
  user-select: none;
}
.ds-breathe:hover { color: rgba(255, 255, 255, 0.9); }
.ds-breathe--day {
  color: rgba(0, 0, 0, 0.55);
  text-shadow: none;
}
.ds-breathe--day:hover { color: rgba(0, 0, 0, 0.8); }
/* 第三页手势缩放提示 */
.ds-gesture-hint {
  position: fixed;
  bottom: max(3vh, 24px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.85);
  font-size: clamp(12px, 1.3vw, 15px);
  letter-spacing: 0.08em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  user-select: none;
}

@keyframes ds-breathe-pulse {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 0.8; }
}
/* 移动端底部栏适配：避开 TabBar (56px) */
@media (max-width: 767px) {
  .ds-breathe { bottom: calc(56px + max(2vh, 10px)); }
}

/* 第二页右侧内容区（后续填充，z-index 高于 canvas） */
.ds-info {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  color: #E8DDD0;
  z-index: 2;
  pointer-events: none;  /* 填充内容时改回 auto */
}

/* 占卜介绍卡片背景遮罩：点击非卡片区域关闭 */
.mark-card-backdrop {
  position: fixed;
  inset: 0;
  z-index: 25;
  background: transparent;
  pointer-events: auto;
}

/* 占卜介绍卡片（点击地球占卜柱/名称气泡弹出） */
.mark-card {
  position: fixed;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  width: clamp(280px, 32vw, 420px);   /* 自适应宽度 */
  max-width: 88vw;
  max-height: 90vh;
  z-index: 215;
  padding: 18px 16px 16px;
  box-sizing: border-box;
  border-radius: 16px;
  background: rgba(28, 26, 32, 0.4);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--primary-rgb), 0.45);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45), 0 0 12px rgba(var(--primary-rgb), 0.12);
  color: #ECE6DC;
  font-size: 13px;
  line-height: 1.65;
  display: flex;
  flex-direction: column;
  animation: markCardIn 0.22s ease;
}
/* 滚动容器：把滚动收敛到内容区，关闭按钮留在卡片右上角固定不动 */
.mark-card-body {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(90vh - 34px);
  scrollbar-width: thin;                                        /* Firefox 细滚动条 */
  scrollbar-color: rgba(var(--primary-rgb), 0.5) transparent;
}
/* WebKit 细滚动条：透明轨道 + 上下留空，保住四角圆角 */
.mark-card-body::-webkit-scrollbar { width: 2px; }
.mark-card-body::-webkit-scrollbar-track {
  background: transparent;
  margin: 16px 0;
}
.mark-card-body::-webkit-scrollbar-thumb {
  background: rgba(var(--primary-rgb), 0.5);
  border-radius: 3px;
}
/* 横屏：卡片更宽，靠右显示，挡住部分地球也没关系 */
@media (orientation: landscape) {
  .mark-card {
    width: clamp(360px, 42vw, 560px);
  }
}
/* 竖屏手机：卡片居中显示（不再贴右） */
@media (max-width: 768px) and (orientation: portrait) {
  .mark-card {
    right: auto;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 440px);
    animation: markCardInCenter 0.22s ease;
  }
}
@keyframes markCardIn {
  from { opacity: 0; transform: translateY(-50%) translateX(14px); }
  to   { opacity: 1; transform: translateY(-50%) translateX(0); }
}
@keyframes markCardInCenter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.98); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.mark-card.dn-mode-day {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(var(--primary-dark-rgb), 0.4);
  color: #2a2a2a;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.18), 0 0 10px rgba(var(--primary-rgb), 0.1);
  scrollbar-color: rgba(var(--primary-dark-rgb), 0.5) transparent;
}
.mark-card.dn-mode-day::-webkit-scrollbar-thumb {
  background: rgba(var(--primary-dark-rgb), 0.5);
}
.mark-card-close {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 2;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.mark-card.dn-mode-day .mark-card-close { background: rgba(0, 0, 0, 0.08); }
.mark-card-img {
  width: 100%;
  max-height: 190px;
  object-fit: cover;
  border-radius: 10px;
  margin: 22px 0 12px;   /* 顶部留白，避开右上角关闭按钮，避免重叠 */
  background: rgba(255, 255, 255, 0.06);
}
.mark-card-name {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--primary);
}
.mark-card.dn-mode-day .mark-card-name { color: var(--primary-dark); }
.mark-stars {
  font-style: normal;
  color: var(--primary);
  letter-spacing: 1px;
}
.mark-card.dn-mode-day .mark-stars { color: var(--primary-dark); }
.mark-card-alias {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 2px;
}
.mark-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12px;
  margin: 10px 0 6px;
  opacity: 0.92;
}
.mark-card-meta span { white-space: nowrap; }
.mark-card-sec {
  margin-top: 10px;
  font-size: 13px;
}
.mark-card-sec b {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
  color: rgba(var(--primary-rgb), 0.85);
}
.mark-card.dn-mode-day .mark-card-sec b { color: rgba(var(--primary-dark-rgb), 0.9); }
.mark-card-intro {
  opacity: 0.95;
  text-align: justify;
}
.mark-card-link {
  display: inline-block;
  margin-top: 14px;
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}
.mark-card.dn-mode-day .mark-card-link { color: var(--primary-dark); }

/* 占卜柱悬停星级提示框：跟随光标，出现在光标上方 */
.mark-tip {
  position: fixed;
  z-index: 220;
  transform: translate(-50%, calc(-100% - 18px));
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(28, 26, 32, 0.9);
  border: 1px solid rgba(var(--primary-rgb), 0.5);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.5), 0 0 10px rgba(var(--primary-rgb), 0.15);
  color: #ECE6DC;
  font-size: 12px;
  line-height: 1.5;
  pointer-events: none;
  white-space: nowrap;
  animation: markTipIn 0.12s ease;
}
@keyframes markTipIn {
  from { opacity: 0; transform: translate(-50%, calc(-100% - 8px)); }
  to   { opacity: 1; transform: translate(-50%, calc(-100% - 18px)); }
}
.mark-tip.dn-mode-day {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(var(--primary-dark-rgb), 0.45);
  color: #2a2a2a;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.2), 0 0 8px rgba(var(--primary-rgb), 0.12);
}
.mark-tip-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 3px;
}
.mark-tip-img {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.15);
  flex: 0 0 auto;
}
.mark-tip.dn-mode-day .mark-tip-name { color: var(--primary-dark); }
.mark-tip-row { display: flex; align-items: center; gap: 4px; }
.mark-tip-row .mark-stars {
  font-style: normal;
  color: var(--primary);
  letter-spacing: 1px;
}
.mark-tip.dn-mode-day .mark-tip-row .mark-stars { color: var(--primary-dark); }


/* 自定义滚动指示条 */
.ds-scrollbar {
  position: fixed;
  right: 4px;
  top: 8%;
  height: 84%;
  width: 3px;
  background: rgba(255, 255, 255, 0.30);   /* 纯白 30% 不透明 */
  border-radius: 2px;
  z-index: 200;
  pointer-events: none;
}
.ds-scrollthumb {
  position: absolute;
  left: 0;
  width: 100%;
  height: 50%;
  background: rgba(255, 255, 255, 0.70);   /* 纯白 70% 不透明 */
  border-radius: 2px;
  transition: top 0.12s ease;
}

/* ── 三个悬浮按钮统一宽度（昼夜/主题/手势） ── */
.ds-daynight-btn,
.ds-theme-btn,
.ds-gesture-btn { width: var(--ds-btn-w, 51px); }

/* 昼夜切换按钮（右上角）：圆形徽章包符号 + 文字，徽章随昼夜左右滑动。颜色沿用原玻璃拟态。 */
.ds-daynight-btn {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 210;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 25px;
  padding: 0 4px;
  box-sizing: border-box;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 999px;
  background: rgba(20,20,30,0.30);   /* 按钮背景透明度 30% */
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;        /* 参考首页手势按钮字体 12px */
  cursor: pointer;
  user-select: none;
  transition: background .2s, transform .1s, top .25s ease;
}
.ds-daynight-btn:hover { background: rgba(20,20,30,0.45); }
.ds-daynight-btn:active { transform: scale(0.96); }

/* 符号徽章：绝对定位 + left 过渡 → 昼夜切换时左右滑动 */
.ds-dn-badge {
  position: absolute;
  top: 50%;
  left: 4px;          /* 夜间：徽章在左 */
  transform: translateY(-50%);
  width: 15px;        /* = 28px * 0.7，调整为原来的 70%（首页感觉90%仍显大） */
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.3);
  flex-shrink: 0;
  transition: left .35s cubic-bezier(0.34, 1.56, 0.64, 1);  /* 弹性滑动（带轻微回弹） */
}
/* 昼间：白底黑字 + 徽章滑到最右（白底下徽章改深色才看得见） */
.ds-daynight-btn.dn-mode-day {
  background: rgba(255,255,255,0.30);
  color: #1a1a1a;
  border-color: rgba(0,0,0,0.25);
}
.ds-daynight-btn.dn-mode-day:hover { background: rgba(255,255,255,0.95); }
.ds-daynight-btn.dn-mode-day .ds-dn-badge {
  left: calc(100% - 19px);     /* 4 + 15，对齐默认档徽章实际宽度，使昼/夜离边框对称 */
  background: rgba(0,0,0,0.08);
  border-color: rgba(0,0,0,0.3);
}

/* 符号字体缩小（原 16 → 12） */
.ds-dn-icon { font-size: 12px; line-height: 1; }
/* 文字与滑动圆块在按钮内对称：两者垂直同中轴（line-height:1 + 居中），
   圆块在左/右任一侧滑动，文字在另一侧半区水平居中，圆块与文字间距均匀。 */
.ds-dn-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  line-height: 1;
  font-weight: 500;
  white-space: nowrap;
  padding-left: 15px;   /* 夜间：圆块在左，文字在右半区居中 */
}
.ds-daynight-btn.dn-mode-day .ds-dn-text {
  padding-left: 0;
  padding-right: 15px;  /* 昼间：圆块在右，文字在左半区居中 */
}

/* ── 主题 / 手势 按钮：与昼夜切换按钮完全一致的玻璃拟态样式（字体、边框、颜色、悬停动效相同） ── */
.ds-theme-btn,
.ds-gesture-btn {
  position: fixed;
  z-index: 210;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 25px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 999px;
  background: rgba(20,20,30,0.30);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: background .2s, transform .1s, top .25s ease;
}
.ds-theme-btn:hover,
.ds-gesture-btn:hover { background: rgba(20,20,30,0.45); }
.ds-theme-btn:active,
.ds-gesture-btn:active { transform: scale(0.96); }

/* 昼间：与昼夜按钮一致（白底、黑字、深色边框） */
.ds-theme-btn.dn-mode-day,
.ds-gesture-btn.dn-mode-day {
  color: #1a1a1a;
  background: rgba(255,255,255,0.30);
  border-color: rgba(0,0,0,0.25);
}
.ds-theme-btn.dn-mode-day:hover,
.ds-gesture-btn.dn-mode-day:hover { background: rgba(255,255,255,0.5); }

/* 文字 50% 透明，昼/夜/主题/手势按钮统一 */
.ds-dn-text,
.ds-theme-label,
.ds-gesture-text { opacity: 0.5; }

/* 主题按钮：昼夜按钮正下方（右上角） */
.ds-theme-btn { top: 46px; right: 10px; gap: 6px; }
/* 手势按钮：左上角，与昼夜按钮水平对齐 */
.ds-gesture-btn { top: 10px; left: 10px; }

/* 响应式：小屏缩小、大屏略增，使三个按钮动态适应不同设备。
   必须放在所有按钮基础样式之后，否则主题/手势的基础 width 会覆盖这里的 width，导致只有昼夜按钮响应。 */
@media (max-width: 480px) {
  .ds-daynight-btn,
  .ds-theme-btn,
  .ds-gesture-btn { --ds-btn-w: 45px; height: 26px; padding: 0 10px; font-size: 11px; }
  .ds-dn-badge { width: 16.8px; height: 16.8px; }   /* 24 * 0.7 */
  .ds-dn-icon { font-size: 11px; }
  .ds-dn-text { padding-left: 16.8px; }            /* 与圆块宽度一致，保持对称 */
  .ds-daynight-btn.dn-mode-day .ds-dn-badge { left: calc(100% - 20.8px); }   /* 4 + 16.8 */
  .ds-daynight-btn.dn-mode-day .ds-dn-text { padding-left: 0; padding-right: 16.8px; }
}
@media (min-width: 1024px) {
  .ds-daynight-btn,
  .ds-theme-btn,
  .ds-gesture-btn { --ds-btn-w: 58px; height: 27px; padding: 0 14px; font-size: 13px; }
  .ds-dn-badge { width: 21px; height: 21px; }   /* 30 * 0.7 */
  .ds-dn-icon { font-size: 13px; }
  .ds-dn-text { padding-left: 21px; }          /* 与圆块宽度一致，保持对称 */
  .ds-daynight-btn.dn-mode-day .ds-dn-badge { left: calc(100% - 25px); }   /* 4 + 21 */
  .ds-daynight-btn.dn-mode-day .ds-dn-text { padding-left: 0; padding-right: 21px; }
}

/* 第三页返回第二页按钮：顶部居中，玻璃拟态，与昼夜/手势按钮同款风格 */
.ds-back-page2 {
  position: fixed;
  z-index: 210;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(20,20,30,0.42);
  color: rgba(255,255,255,0.70);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  user-select: none;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  transition: background .2s, transform .1s, top .25s ease;
}
.ds-back-page2:hover { background: rgba(20,20,30,0.6); }
.ds-back-page2:active { transform: translateX(-50%) scale(0.96); }
/* 昼间：白底黑字，与昼夜按钮同步 */
.ds-back-page2.dn-mode-day {
  background: rgba(255,255,255,0.30);
  color: rgba(26,26,26,0.70);
  border-color: rgba(0,0,0,0.25);
}
.ds-back-page2.dn-mode-day:hover { background: rgba(255,255,255,0.95); }

/* 昼间：与昼夜按钮同步切换为白底黑字 + 同款悬停 */
.ds-theme-btn.dn-mode-day,
.ds-gesture-btn.dn-mode-day {
  background: rgba(255,255,255,0.30);
  color: #1a1a1a;
  border-color: rgba(0,0,0,0.25);
}
.ds-theme-btn.dn-mode-day:hover,
.ds-gesture-btn.dn-mode-day:hover { background: rgba(255,255,255,0.95); }

/* 手势开启态：用主色高亮，与玻璃风协调 */
.ds-gesture-btn.active { border-color: var(--primary); background: rgba(20,20,30,0.55); }
.ds-gesture-btn.dn-mode-day.active { border-color: var(--primary); background: rgba(255,255,255,0.75); }

/* 主题色圆点 */
.ds-theme-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
  flex-shrink: 0;
}
.ds-theme-label { line-height: 1; }

/* 主题弹层内的主题列表（复用 .help-popup 容器） */
.ds-theme-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ds-theme-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  border: 1px solid #EBEBEB;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  transition: border-color .15s, background .15s;
}
.ds-theme-opt.active { border-color: var(--primary); background: var(--primary-light, #FFF8EC); }
.ds-theme-opt-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
}
.ds-theme-opt-name { line-height: 1; }

/* 黑夜模式：主题色弹层选项适配暗色背景 */
.app-shell.dark .ds-theme-opt {
  background: #2B2D40 !important;
  border-color: #4D5173 !important;
  color: #D6D6DF !important;
}
.app-shell.dark .ds-theme-opt.active {
  border-color: var(--primary) !important;
  background: rgba(var(--primary-rgb), 0.18) !important;
  color: #FFFFFF !important;
}
.app-shell.dark .ds-theme-opt-dot {
  box-shadow: 0 0 0 1px rgba(255,255,255,0.2) !important;
}
/* teleport 到 body 的弹窗（脱离 .app-shell）使用 :root.dark 命中黑夜样式 */
:root.dark .ds-theme-opt {
  background: #2B2D40 !important;
  border-color: #4D5173 !important;
  color: #D6D6DF !important;
}
:root.dark .ds-theme-opt.active {
  border-color: var(--primary) !important;
  background: rgba(var(--primary-rgb), 0.18) !important;
  color: #FFFFFF !important;
}
:root.dark .ds-theme-opt-dot {
  box-shadow: 0 0 0 1px rgba(255,255,255,0.2) !important;
}

.txt-enter-active { transition: opacity 2.5s ease; }
.txt-leave-active { transition: opacity  .5s ease; }
.txt-enter-from, .txt-leave-to { opacity: 0; }

/* ── 背景漂浮汉字 + 鼠标探照灯遮罩 ───────────────────────────── */
@property --lamp-r { syntax: '<length>'; inherits: false; initial-value: 0px; }

.ds-float-layer {
  position: fixed;
  inset: 0;
  z-index: 15;
  pointer-events: none;
  overflow: hidden;
  -webkit-mask-image: radial-gradient(circle var(--lamp-r, 0px) at var(--lamp-x, 50%) var(--lamp-y, 50%),
                        #000 0%, rgba(0,0,0,0.9) 38%, transparent 72%);
          mask-image: radial-gradient(circle var(--lamp-r, 0px) at var(--lamp-x, 50%) var(--lamp-y, 50%),
                        #000 0%, rgba(0,0,0,0.9) 38%, transparent 72%);
  transition: --lamp-r .28s ease;
}

.ds-float-char {
  position: absolute;
  color: rgba(239, 236, 228, 0.92);
  text-shadow: 0 0 10px var(--primary, #e8c87a), 0 0 22px rgba(232, 200, 122, 0.5);
  font-family: "SimSun", "Songti SC", "Noto Serif SC", serif;
  font-weight: 600;
  user-select: none;
  will-change: transform;
  animation: dsFloat var(--dur, 20s) ease-in-out var(--delay, 0s) infinite;
}

.ds-float-layer.is-day .ds-float-char {
  color: rgba(128, 125, 121, 0.9);
   text-shadow: 0 0 10px var(--primary, #e8c87a), 0 0 22px rgba(232, 200, 122, 0.5);
}

@keyframes dsFloat {
  0%   { transform: translate(0, 0) rotate(0deg); }
  50%  { transform: translate(var(--tx, 0), var(--ty, 0)) rotate(var(--rot, 0deg)); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

</style>

<style>
/* 手势悬停高亮（非 scoped）—— 上方栏按钮 */
.ds-gesture-btn.gesture-hovered,
.ds-daynight-btn.gesture-hovered,
.ds-theme-btn.gesture-hovered {
  background: rgba(20,20,30,0.45) !important;
}
.ds-gesture-btn.dn-mode-day.gesture-hovered,
.ds-daynight-btn.dn-mode-day.gesture-hovered,
.ds-theme-btn.dn-mode-day.gesture-hovered {
  background: rgba(255,255,255,0.95) !important;
}
.ds-back-page2.gesture-hovered {
  background: rgba(20,20,30,0.6) !important;
}
.ds-back-page2.dn-mode-day.gesture-hovered {
  background: rgba(255,255,255,0.95) !important;
}
</style>
