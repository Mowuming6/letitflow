<template>
  <!-- Toast -->
  <Transition name="fade">
    <div v-if="toastState.show" class="toast-overlay">{{ toastState.title }}</div>
  </Transition>

  <!-- Modal -->
  <Transition name="fade">
    <div v-if="modalState.show" class="modal-mask" @click.self="cancelModal">
      <div class="modal-box">
        <div class="modal-title">{{ modalState.title }}</div>
        <div class="modal-content">{{ modalState.content }}</div>
        <div class="modal-btns">
          <div class="modal-btn" @click="cancelModal">{{ modalState.cancelText }}</div>
          <div class="modal-btn" :class="modalState.dangerConfirm ? 'danger' : 'confirm'" @click="confirmModal">
            {{ modalState.confirmText }}
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Aura Orb (Gesture Mode Circular Cursor) -->
  <div v-if="store.isGesture"
       class="aura-orb"
       :class="{ 'is-clicked': isPointerDown }"
       :style="orbStyle"></div>

  <!-- Camera Radar (Floating, semi-transparent circular preview window) -->
  <div v-if="store.isGesture" class="camera-radar-container">
    <div class="radar-circle">
      <video ref="videoElement" class="radar-video" autoplay playsinline muted></video>
      <canvas ref="canvasElement" class="radar-canvas"></canvas>
      <div class="radar-status-dot" :class="{ 'connected': isModelLoaded }"></div>
    </div>
  </div>
</template>

<script setup>
import { toastState, modalState, confirmModal, cancelModal, showToast } from '../composables/useModal.js'
import { store } from '../store.js'
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
// 与 App.vue 保持一致：桌面端判定（≥768px 视为可悬停显示上方栏）
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

const route = useRoute()
const router = useRouter()

// ─── 💡 【全景无缝结果智能自动聚焦滚动引擎全局变量】 ───
let domObserver = null
let lastScrolledEl = null
let hasScrolledThisPage = false

function isInViewport(el, { threshold = 0.15 } = {}) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight || 0
  const vw = window.innerWidth || document.documentElement.clientWidth || 0
  if (vh <= 0 || vw <= 0) return false

  const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0)
  const visibleW = Math.min(r.right, vw) - Math.max(r.left, 0)
  if (visibleH <= 0 || visibleW <= 0) return false

  const area = Math.max(r.width, 0) * Math.max(r.height, 0)
  if (area <= 0) return false

  const visibleArea = visibleH * visibleW
  return visibleArea / area >= threshold
}

function scrollIntoViewIfNeeded(el, { block = 'end', behavior = 'smooth', threshold = 0.15 } = {}) {
  if (!el) return false
  // If users can already see the result on mobile, don't auto-scroll.
  if (isInViewport(el, { threshold })) return false
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior, block })
    return true
  }
  return false
}

const pointerX = ref(window.innerWidth / 2)
const pointerY = ref(window.innerHeight / 2)
const isPointerDown = ref(false)

const startX = ref(0)
const startY = ref(0)

const orbStyle = computed(() => {
  const size = isPointerDown.value ? 24 : 36
  return {
    left: `${pointerX.value}px`,
    top: `${pointerY.value}px`,
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `-${size / 2}px`,
    marginTop: `-${size / 2}px`
  }
})

// Camera and MediaPipe Hands tracking
const videoElement = ref(null)
const canvasElement = ref(null)
const isModelLoaded = ref(false)
let handsTracker = null
let cameraTracker = null
let animationFrameId = null

// Horizontal and Vertical Swiping tracking state
let lastPalmX = null
let lastPalmY = null
let lastPalmTime = null
let lastHandState = 'unknown'
let pointHoldStart = 0         // 食指(☝️)伸出起始时间戳，用于「保持3秒解锁缩放」
let lastPointSeen = 0          // 最近一次识别为食指伸出的时间戳（去抖用）
const POINT_HOLD_DEBOUNCE = 350 // 食指误判容忍窗口(ms)：短暂掉帧不重置 3 秒计时
let zoomArmed = false         // 是否已食指解锁地球缩放（闩锁，解锁后保持直到静止锁定）
let zoomLocked = false        // 地球缩放是否已锁定（与 Index.vue 同步）
let pointResetFired = false   // 食指3秒回初次占卜界面事件是否已派发（闩锁，松手复位）
let fistHoldStart = 0         // 首页第二页(卡牌环)握拳按下起始时间，用于区分「短握拳=点击」与「长按2s=拖拽」
let fistDragArmed = false     // 首页第二页是否已因长按≥2s进入拖拽模式（闩锁）
const handleZoomLocked = () => { zoomLocked = true }
const swipeThresholdSpeed = 0.3 // pixels per millisecond (lowered for easier detection)
const swipeMinDist = 30 // minimum pixels distance (lowered for easier detection)
let tabDragging = false      // 是否正在手势拖拽底部 TabBar
let tabDragLastX = 0         // 上一次 Tab 栏拖拽的指针 X，用于计算横向位移
let cardDragging = false     // 是否正在握拳拖拽介绍卡片内容
let cardDragLastY = 0        // 卡片拖拽上一帧指针 Y，用于计算滚动增量
let cardDragMoved = 0        // 本次拖拽累计位移，用于区分「拖拽」与「轻点」
let peaceStartY = null       // ✌ 向上挥动起点 Y，用于判断真实挥动
let peaceFired = false       // 本次 ✌ 是否已触发，防重复
let peaceStable = 0          // ✌ 连续稳定帧数，过滤握拳抖动误判
let pageFistHoldStart = 0    // 普通占卜结果页握拳按下起始时间，短握拳(<2s)=点击，长按(≥2s)=拖拽滚动
let pageDragArmed = false    // 普通占卜结果页是否已因长按≥2s进入拖拽滚动模式（闩锁）
let pageDragging = false     // 普通占卜结果页拖拽滚动中标记（仅 pageDragArmed 后才为 true）
let pageDragLastY = 0        // 页面拖拽上一帧指针 Y
let pageDragMoved = 0        // 本次拖拽累计位移，区分「拖拽」与「轻点」
let pageDragTarget = null    // 当前拖拽的滚动容器
let pageDragVelY = 0         // 页面拖拽末速度（Y 方向），用于松手后的惯性滑行
let pageInertiaRaf = null    // 惯性滑行动画帧句柄
const PAGE_SCROLL_GAIN = 3   // 拖拽灵敏度：手移动 1px 滚动 3px，缓解长页面「一次握拳滚不远、需多次滚动」
let gestureHoveredEl = null  // 手势悬停高亮的元素（.gesture-hovered）
const HOVER_CLICK_HOLD = 3000 // 光标停留在导航图标(上/下栏)上达到该时长(ms)即自动点击跳转
let hoverHoldEl = null        // 当前正在计时的「停留=点击」目标元素
let hoverHoldStart = 0        // 进入该元素计时的起始时间戳

// Smooth cursor coordinates
let targetPointerX = window.innerWidth / 2
let targetPointerY = window.innerHeight / 2

function updatePointerSmoothly() {
  if (store.isGesture) {
    // Linear interpolation for smooth cursor movement
    pointerX.value += (targetPointerX - pointerX.value) * 0.25
    pointerY.value += (targetPointerY - pointerY.value) * 0.25

    document.dispatchEvent(new CustomEvent('gesture-hover', {
      detail: { x: pointerX.value, y: pointerY.value, state: lastHandState }
    }))

    // 💡 手势光标移到页面顶部区域即显示桌面端上方栏，使上栏图标可被悬停高亮 /
    //    停留 3 秒点击（真实鼠标由 App.vue 的 pointermove 控制同一 store.topBarVisible 状态）。
    //    注意：上方栏高约 30px，隐藏阈值必须 > 30px（此处取 45px 留余量），否则光标进入上栏
    //    后会被误判为「离开顶部」→ 上栏滑走 → 停留 3 秒计时不断重置，导致上栏无法点击跳转。
    if (isDesktop() && pointerY.value < 45) {
      if (!store.topBarVisible) store.topBarVisible = true
    } else if (store.topBarVisible && !isPointerDown.value) {
      store.topBarVisible = false
    }

    // 手势悬停高亮：上方栏/下方栏/侧边栏元素
    applyGestureHover(pointerX.value, pointerY.value)
  }
  animationFrameId = requestAnimationFrame(updatePointerSmoothly)
}

function applyGestureHover(x, y) {
  const el = document.elementFromPoint(x, y)
  const target = el?.closest?.('.tab-item, .sidebar-item, .ds-gesture-btn, .ds-daynight-btn, .ds-theme-btn, .ds-back-page2, .page-back-btn, .draw-btn, .mode-tab, [role="button"]')
  const now = Date.now()
  if (target !== gestureHoveredEl) {
    if (gestureHoveredEl) gestureHoveredEl.classList.remove('gesture-hovered')
    if (target) target.classList.add('gesture-hovered')
    gestureHoveredEl = target
    // 悬停目标变了：重置「停留 3 秒自动点击」计时
    hoverHoldEl = null
    hoverHoldStart = 0
  }

  // 💡 上/下栏导航图标：手势光标(非握拳按下状态)停留 ≥3 秒 → 视为点击跳转
  // 仅在未按下时计时；一旦握拳拖拽/点击则交由对应逻辑处理，不在此干扰。
  const isNavIcon = target && (target.classList.contains('tab-item') || target.classList.contains('sidebar-item'))
  if (isNavIcon && !isPointerDown.value) {
    if (hoverHoldEl !== target) {
      hoverHoldEl = target
      hoverHoldStart = now
    } else if (now - hoverHoldStart >= HOVER_CLICK_HOLD) {
      hoverHoldEl = null
      hoverHoldStart = 0
      // 派发 dialog 原点对齐，确保幕布动画从被点图标展开
      const trigger = target.closest('.sidebar-item') || target.closest('.tab-item')
      if (trigger) setDialogOriginFromElement(trigger)
      target.click()
      showToast('光标停留 3 秒：已跳转')
    }
  } else {
    hoverHoldEl = null
    hoverHoldStart = 0
  }
}

function updatePointer(e) {
  // 手势模式下光标由手掌驱动，忽略真实鼠标/触摸移动，避免两者互相抢光标
  if (store.isGesture) return
  let clientX, clientY
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  targetPointerX = clientX
  targetPointerY = clientY
}

function handleStart(e) {
  let clientX, clientY
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  startX.value = clientX
  startY.value = clientY
  updatePointer(e)
  isPointerDown.value = true
}

function handleMove(e) {
  updatePointer(e)
}

function handleEnd() {
  isPointerDown.value = false
  if (!store.isGesture) return

  const dx = pointerX.value - startX.value
  const dy = pointerY.value - startY.value

  const path = route.path
  triggerSwipeActions(dx, dy)
}

function shouldDispatchGestureTrigger(state) {
  return true
}

function isFistGesture() {
  return lastHandState === 'fist'
}

function triggerSwipeActions(dx, dy) {
  const state = lastHandState || 'unknown'
  if (!shouldDispatchGestureTrigger(state)) return

  const path = route.path
  if (['/box', '/dice', '/coin', '/jiao', '/liuyao'].includes(path)) {
    if (dy < -30) {
      document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'swipe-up', state } }))
    }
  } else if (path === '/wheel') {
    if (Math.abs(dy) > 40) {
      document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'vertical-swipe', state } }))
    }
  } else if (['/qian', '/book'].includes(path)) {
    if (Math.abs(dx) > 30) {
      document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'horizontal-swipe', state } }))
    }
  } else if (['/lenormand', '/tarot'].includes(path)) {
    // In shuffle phase, horizontal swipe triggers shuffle
    if (Math.abs(dx) > 30) {
      document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'horizontal-swipe', state } }))
    }
  }
}

// MediaPipe Gesture Processing
async function initMediaPipe() {
  if (!store.isGesture) {
    stopTracking()
    return
  }

  // 💡 If camera APIs are unavailable (common in some in-app browsers / non-HTTPS), abort early.
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    showToast('当前环境不支持摄像头(getUserMedia)。请用系统浏览器打开，并使用 https 访问。')
    return
  }
  if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
    showToast('手势需要安全上下文：请用 https（或 localhost）打开页面。')
    return
  }

  // 💡 如果摄像头和手势引擎已经在正常运行中，直接返回，避免重复初始化造成硬件冲突和画面卡死
  if (cameraTracker && handsTracker) {
    return
  }

  // Ensure window.Hands is loaded from CDN scripts
  if (!window.Hands || !window.Camera) {
    console.log('Waiting for MediaPipe CDN scripts...')
    setTimeout(initMediaPipe, 500)
    return
  }

  // 💡 【终极避坑赛跑机制】：因为 Vue 是异步更新 DOM，点击开启时 <video> 节点尚未挂载到页面上。
  // 如果 videoElement.value 还没有在 DOM 中渲染完毕，我们将顺延 80ms 后再次触发，直至 video 节点完美成活！
  // 这完美解决了"有的时候开启手势需要刷新网页"的痛点，确保一击必中，100% 顺畅启动摄像头！
  if (!videoElement.value) {
    console.log('Waiting for video element in DOM...')
    setTimeout(initMediaPipe, 80)
    return
  }

  try {
    handsTracker = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    })

    handsTracker.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    handsTracker.onResults(onHandResults)

    if (videoElement.value) {
      cameraTracker = new window.Camera(videoElement.value, {
        onFrame: async () => {
          if (videoElement.value) {
            await handsTracker.send({ image: videoElement.value })
          }
        },
        width: 320,
        height: 240,
        facingMode: 'user'
      })

      await cameraTracker.start()
      isModelLoaded.value = true
      showToast('手势引擎已启动，把手伸向摄像头')
    }
  } catch (err) {
    console.error('Failed to initialize MediaPipe Hands:', err)
    showToast('摄像头启动失败，请检查权限')
  }
}

function stopTracking() {
  if (cameraTracker) {
    cameraTracker.stop()
    cameraTracker = null
  }
  if (handsTracker) {
    handsTracker.close()
    handsTracker = null
  }
  isModelLoaded.value = false
}

// Mathematical Gesture Classification
function onHandResults(results) {
  if (!canvasElement.value || !videoElement.value) return

  const canvas = canvasElement.value
  const ctx = canvas.getContext('2d')

  // Set canvas dimension matching radar aspect ratio
  canvas.width = videoElement.value.videoWidth || 320
  canvas.height = videoElement.value.videoHeight || 240

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    return
  }

  const landmarks = results.multiHandLandmarks[0]
  const now = Date.now()

  // Draw landmarks on camera radar canvas
  drawHandRadar(ctx, landmarks)

  // 1. Core Points
  const wrist = landmarks[0]
  const thumbTip = landmarks[4]
  const thumbIP = landmarks[3]
  const thumbMCP = landmarks[2]
  const indexTip = landmarks[8]
  const indexPIP = landmarks[6]
  const indexMCP = landmarks[5]
  const middleTip = landmarks[12]
  const middlePIP = landmarks[10]
  const ringTip = landmarks[16]
  const ringPIP = landmarks[14]
  const pinkyTip = landmarks[20]
  const pinkyPIP = landmarks[18]

  // Palm center (approximate by averaging MCP joints and wrist)
  const palmCenterX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5
  const palmCenterY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5

  // Distances / bent detection
  const indexBent = indexTip.y > indexPIP.y
  const middleBent = middleTip.y > middlePIP.y
  const ringBent = ringTip.y > ringPIP.y
  const pinkyBent = pinkyTip.y > pinkyPIP.y

  // Horizontal distance for thumb
  const thumbBent = Math.abs(thumbTip.x - thumbMCP.x) < 0.08

  // 拇指是否明显伸出（点赞手势 👍）：拇指向外、且明显位于拇指根与食指根上方，避免与握拳混淆
  const thumbExtended = (thumbTip.y < thumbMCP.y - 0.03) &&
    (thumbTip.y < indexMCP.y) &&
    Math.hypot(thumbTip.x - thumbMCP.x, thumbTip.y - thumbMCP.y) > 0.10

  // 2. Gesture classification

  // Check PEACE SIGN (✌️ Home): Index and Middle fingers extended, Ring and Pinky bent
  const isPeace = !indexBent && !middleBent && ringBent && pinkyBent

  // Check INDEX POINTING (Pointing/Hover): Index finger extended, others closed
  const isPointing = !indexBent && middleBent && ringBent && pinkyBent

  // Check LIKE (👍): Four fingers bent, thumb extended upward
  const isLike = indexBent && middleBent && ringBent && pinkyBent && thumbExtended

  // Check FIST (✊ Click): All four fingers bent close to the palm.
  // 注意：只判定四指弯曲，不强制拇指收拢——握拳时拇指常微微上翘，若要求拇指完全折叠
  // 极易被下方 isLike(👍) 抢先分类，导致整段 isFist 点击逻辑被跳过、占卜无法触发。
  const isFist = indexBent && middleBent && ringBent && pinkyBent

  // Check OPEN PALM (Scroll): All four fingers extended
  const isPalm = !indexBent && !middleBent && !ringBent && !pinkyBent
  // 优先级：peace > point > fist > like > palm。
  // 关键：fist 必须在 like 之前——四指弯且拇指上翘的「握拳」应归类为 fist 触发点击，
  // 否则被 isLike(👍) 抢先后整段 isFist 逻辑跳过，占卜/点击都无法触发。
  const handState = isPeace ? 'peace' : isPointing ? 'point' : isFist ? 'fist' : isLike ? 'like' : isPalm ? 'palm' : 'unknown'

  // 捏合距离（拇指尖↔食指尖），用于「手势缩放」（张开≈大，捏合≈小），归一化坐标
  // 恢复：每帧无条件派发，保证实时缩放跟手
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
  document.dispatchEvent(new CustomEvent('gesture-pinch', { detail: { dist: pinchDist } }))

  // Perform Screen Coordinate Mapping
  // MediaPipe X is [0, 1] (left to right from camera perspective, but video is mirrored)
  // Mirror X so it acts like a mirror
  const activeX = handState === 'point' ? indexTip.x : palmCenterX
  const activeY = handState === 'point' ? indexTip.y : palmCenterY
  // 以画面中心为基准放大映射范围，使手势光标能触及屏幕最上/最下及四角
  // （否则手掌在镜头中的活动范围受限，光球到不了顶部按钮）
  const POINTER_GAIN = 1.5
  const normX = Math.max(0, Math.min(1, 0.5 + (activeX - 0.5) * POINTER_GAIN))
  const normY = Math.max(0, Math.min(1, 0.5 + (activeY - 0.5) * POINTER_GAIN))
  const mappedX = (1 - normX) * window.innerWidth
  const mappedY = normY * window.innerHeight

  // Update hover target smoothly
  targetPointerX = mappedX
  targetPointerY = mappedY

  // ✌ 稳定计数放在状态切换帧之外，每帧维护：
  // 否则 peace 持续保持时 handState===lastHandState，整段不执行，peaceStable 卡在 1、peaceStartY 永不赋值。
  if (handState === 'peace') {
    peaceStable++
  } else {
    peaceStable = 0
    peaceStartY = null
    peaceFired = false
  }

  if (handState !== lastHandState) {
    lastHandState = handState
    document.dispatchEvent(new CustomEvent('gesture-state', {
      detail: { state: handState }
    }))

    // 💡 状态切换帧：记录首页✌起始 Y，返回逻辑统一放到每帧判断（见下方）
    if (handState === 'peace') {
      const onHome = route.path === '/' || route.path === '/index'
      if (onHome && peaceStartY === null) {
        peaceStartY = pointerY.value
      }
    }
  }

  // ✌ 识别成功判断（每帧执行，不依赖状态切换帧，否则 peaceStable 在切换帧仅为 1、永远到不了 >=4）：
  // - 首页（'/' 与 '/index'）：向上滚动；
  // - 其它页面：与左上角【返回】按钮行为一致（从首页第二页进入的子页回到第二页，否则回首页第一页）。
  // 连续稳定 4 帧即识别成功（不要求向上挥动门槛），过滤握拳抖动误判。
  if (handState === 'peace' && !peaceFired && peaceStable >= 4) {
    peaceFired = true
    const onHome = route.path === '/' || route.path === '/index'
    if (onHome) {
      document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'swipe-up', state: 'peace' } }))
      showToast('✌️ 识别成功：向上滚动')
    } else {
      if (route.query.page === '2') {
        router.push({ path: '/index', query: { from: 'index', page: '2' } })
      } else {
        router.push('/index')
      }
      showToast('✌️ 识别成功：返回')
    }
  }

  // Emit Fist / Click action trigger
  if (isFist) {
    if (!isPointerDown.value) {
      isPointerDown.value = true
      // 新一次握拳：立即停止上一轮惯性滑行，避免与新一轮拖拽/点击冲突
      stopPageInertia()
      // 检测是否在底部 Tab 栏上 → 握拳+拖拽滚动；在介绍卡片上 → 握拳+拖拽滚动卡片
      const hitEl = document.elementFromPoint(pointerX.value, pointerY.value)
      if (hitEl?.closest?.('.tab-bar')) {
        // 下栏：握拳仅用于拖拽滚动；点击跳转统一交给「停留 3 秒自动点击」(applyGestureHover)，
        // 不再在此派发 mousedown，否则 TabBar 的 mouseDragged 互斥会吞掉 tab 跳转。
        tabDragging = true
      } else if (document.querySelector('.mark-card')) {
        // 介绍卡片打开时：握拳即进入拖拽滚动（不要求光标命中卡片，
        // 避免向下拖出卡片区域时误判关闭/中断）
        cardDragging = true
        cardDragLastY = pointerY.value
        cardDragMoved = 0
      } else if (route.path === '/index') {
        // 首页握拳
        if (route.query.page === '2') {
          // 第二页（卡牌环）：跳转已改为「光标在卡片上停留 3 秒自动跳转」，
          // 因此握拳只用于拖拽旋转（≥2s 进入拖拽），不再派发点击。按下时重置计时。
          fistHoldStart = now
          fistDragArmed = false
        } else {
          // 第一页（骰子）/第三页（地球）：握拳即按下，开 3D 拖拽旋转。
          // 持续旋转由 Index 的 gesture-hover(onPtrMove) 驱动，松手由 gesture-release(onPtrUp) 关闭。
          // 关键：首页不能进 pageDragging，否则握拳移动被当滚动吞掉、且松手时移动>12px 不派发 click，
          // 导致 onPtrDown 从未触发、骰子/地球无法旋转。
          document.dispatchEvent(new CustomEvent('gesture-click', {
            detail: { x: pointerX.value, y: pointerY.value, state: handState }
          }))
          clickElementAt(pointerX.value, pointerY.value)
        }
        } else {
          // 占卜页面：若光标在交互元素上（按钮/牌区/模式切换/八卦盘等），握拳立刻点击，不需等松手
          // 用 closest 而非 matches：命中子元素（如八卦盘中央太极/卦象符号、牌堆内层）也能向上识别为可点击容器
          // 含 .bagua-wrap（八卦盘外层容器），使光标落在圆盘边缘空白区也能即时起卦
          // 可点击元素白名单：交互控件 + 各占卜页触发区 + 关于页目录(.a-toc-item) + 历史页筛选(.filter-tab) +
          // 说明弹窗关闭按钮(.help-popup-close)。这些多为 div，需显式加入才能被握拳命中后 .click() 触发对应 handler
          const CLICKABLE_SEL = 'button, a, [role="button"], .draw-btn, .mode-tab, .deck-display, .btn-gold, .bagua-stage, .bagua-wrap, .a-toc-item, .filter-tab, .toolbar-btn, .edit-btn, .help-popup-close, input, select, textarea, .btn'
          const clickableEl = hitEl?.closest?.(CLICKABLE_SEL)
          if (clickableEl) {
            // 弹窗关闭按钮(.help-popup-close/.theme-popup-close)：不改变弹幕收起原点，
            // 保持打开时的按钮位置，使幕布收回动画与鼠标点击关闭一致。
            // 鼠标关闭时 main.js 不会更新 --dialog-origin-*（它只监听打开按钮），故原点始终是打开按钮。
            if (!clickableEl.closest?.('.help-popup-close, .theme-popup-close')) {
              setDialogOriginFromElement(clickableEl)
            }
            document.dispatchEvent(new CustomEvent('gesture-click', {
              detail: { x: pointerX.value, y: pointerY.value, state: handState }
            }))
            // 直接对命中的可点击元素调用原生 click，绕开 clickElementAt 固定选择器——
            // 否则 .bagua-wrap/.bagua-stage（div，无 role）不会被它触发，导致八卦盘握拳无法起卦。
            clickableEl.click()
          } else {
            // 空白区域：短握拳(<2s)松手即点击，长按≥2s才进入拖拽滚动
            pageFistHoldStart = now
            pageDragArmed = false
            pageDragLastY = pointerY.value
            pageDragMoved = 0
            pageDragTarget = findScrollable(pointerX.value, pointerY.value)
            // About 等「主内容滚动卡片」：内容长、空白处点击无实际功能，
            // 若光标落在主滚动区(.a-main)内，握拳立即进入拖拽滚动，无需等 2s——
            // 否则用户短握拳松手会被当「点击」处理（该处无点击 handler），表现为「滚不动」。
            // 说明弹窗内容区(.help-popup-content)：同样内容长、空白处无点击功能，
            // 握拳立即进入拖拽滚动，无需等 2s，方便在说明框里上下翻看。
            if (pageDragTarget && (pageDragTarget.classList?.contains('a-main') || pageDragTarget.classList?.contains('help-popup-content'))) {
              pageDragArmed = true
              enterPageDrag(pageDragTarget)   // 立即进入拖拽，并临时禁用 scroll-behavior:smooth
            }
          }
        }
    } else if (tabDragging) {
      // TabBar 拖拽中：直接滚动容器（手向左/右移 → 标签栏横向滚动，跟手）
      const tabBar = document.querySelector('.tab-bar')
      if (tabBar) {
        const tabScroll = tabBar.querySelector('.tab-scroll') || tabBar
        const dx = pointerX.value - (tabDragLastX ?? pointerX.value)
        tabDragLastX = pointerX.value
        if (dx) tabScroll.scrollLeft -= dx
      }
    } else if (cardDragging) {
      // 介绍卡片拖拽中：派发 gesture-fist-drag，带当前指针位置（Index 计算 dy 滚动）
      cardDragMoved += Math.abs(pointerY.value - cardDragLastY)
      document.dispatchEvent(new CustomEvent('gesture-fist-drag', {
        detail: { x: pointerX.value, y: pointerY.value }
      }))
      } else if (pageFistHoldStart && !pageDragArmed) {
        // 占卜页面：握拳保持但未满2s，等待判断是点击还是拖拽
        if (now - pageFistHoldStart >= 2000) {
          pageDragArmed = true
          enterPageDrag(pageDragTarget)   // 长按≥2s 进入拖拽，并临时禁用 scroll-behavior:smooth
          pageDragMoved = 0
          pageDragLastY = pointerY.value
        }
      } else if (pageDragging) {
        // 普通占卜结果页拖拽中：直接滚动容器（手向下移 → 内容向下滚，跟手）
        // 灵敏度增益放大滚动量，缓解「一次握拳滚不远、长页面需多次滚动」；
        // 同时记录末速度，供松手后惯性滑行（见松手分支的 startPageInertia）。
      const dy = pointerY.value - pageDragLastY
      pageDragLastY = pointerY.value
      pageDragMoved += Math.abs(dy)
      // 死区过滤：|dy| 过小时忽略，避免摄像头/手势光标的轻微噪声被放大成页面抖动
      if (pageDragTarget && Math.abs(dy) >= 0.5) {
        pageDragTarget.scrollTop += dy * PAGE_SCROLL_GAIN
      }
      pageDragVelY = dy
      } else if (route.path === '/index' && route.query.page === '2' && fistHoldStart) {
      // 第二页卡牌环：握拳持续 ≥2s 才进入拖拽旋转模式
      // 派发 gesture-click（不带 fistDrag），由 Index 的 onGestureClick → onPtrDown 进入旋转，
      // 跳转已由「停留 3 秒」接管，这里不触发导航。
      if (!fistDragArmed && now - fistHoldStart >= 2000) {
        fistDragArmed = true
        document.dispatchEvent(new CustomEvent('gesture-click', {
          detail: { x: pointerX.value, y: pointerY.value, state: handState }
        }))
      }
    }
  } else {
    if (isPointerDown.value) {
      isPointerDown.value = false
      if (tabDragging) {
        // TabBar 拖拽结束：仅结束手势拖拽态（不再派发 mouseup，避免触发 mouseDragged 互斥）
        tabDragging = false
        tabDragLastX = 0
      }
      if (cardDragging) {
        // 几乎没拖动 = 轻点：派发 gesture-click，复用「卡片外握拳关闭」逻辑
        if (cardDragMoved < 12) {
          document.dispatchEvent(new CustomEvent('gesture-click', {
            detail: { x: pointerX.value, y: pointerY.value, state: handState }
          }))
          clickElementAt(pointerX.value, pointerY.value)
        }
        cardDragging = false
      }
      if (pageDragging) {
        // 几乎没拖动 = 轻点：派发 gesture-click，由原生 click 命中按钮/tab/AI 展开
        if (pageDragMoved < 12) {
          document.dispatchEvent(new CustomEvent('gesture-click', {
            detail: { x: pointerX.value, y: pointerY.value, state: handState }
          }))
          clickElementAt(pointerX.value, pointerY.value)
        } else if (pageDragTarget && Math.abs(pageDragVelY) >= 1.5) {
          // 真正拖拽滚动：按末速度启动惯性滑行，滚完松手后继续滑行，
          // 避免长页面「每次都要重新握拳→等2s→滚动」反复多次。
          startPageInertia()
        }
        exitPageDrag()   // 结束拖拽并恢复 scroll-behavior:smooth
        pageDragVelY = 0
      }
      // 占卜页面：短握拳(<2s)松手即点击（从未进入拖拽滚动模式）
      if (pageFistHoldStart && !pageDragArmed) {
        document.dispatchEvent(new CustomEvent('gesture-click', {
          detail: { x: pointerX.value, y: pointerY.value, state: handState }
        }))
        const hitEl = document.elementFromPoint(pointerX.value, pointerY.value)
        setDialogOriginFromElement(hitEl)
        clickElementAt(pointerX.value, pointerY.value)
      }
      // 清理占卜页面握拳计时/拖拽状态
      pageFistHoldStart = 0
      pageDragArmed = false
      if (route.path === '/index' && route.query.page === '2' && fistHoldStart) {
        // 第二页卡牌环：短握拳(<2s)松手 = 握拳点击；长握拳(≥2s)已开拖拽，不再派发 click
        if (!fistDragArmed) {
          document.dispatchEvent(new CustomEvent('gesture-click', {
            detail: { x: pointerX.value, y: pointerY.value, state: handState }
          }))
          clickElementAt(pointerX.value, pointerY.value)
        }
        fistHoldStart = 0
        fistDragArmed = false
      }
      document.dispatchEvent(new CustomEvent('gesture-release', {
        detail: { x: pointerX.value, y: pointerY.value }
      }))
    }
  }

  // 食指(☝️)伸出保持 3 秒 → 闩锁式"解锁"地球缩放。
  // 关键修正：解锁后保持 armed（不再要求持续伸着食指），否则食指与捏合互斥、缩放根本无法触发。
  // 增加去抖：几帧的误判(食指↔握拳抖动)不会重置计时，解决"食指识别不准、到不了 3 秒"的问题。
  // 解锁后保持 armed 直到静止 3 秒被锁定；想要重新缩放只需再次伸出食指 3 秒即可。
  if (handState === 'point') {
    lastPointSeen = now
    if (!pointHoldStart) pointHoldStart = now
  } else if (pointHoldStart && now - lastPointSeen > POINT_HOLD_DEBOUNCE) {
    pointHoldStart = 0
  }
  const pointActive = !!pointHoldStart
  if (pointActive) {
    const held = now - pointHoldStart
    const progress = Math.min(1, held / 3000)
    document.dispatchEvent(new CustomEvent('gesture-point-hold', { detail: { active: true, progress } }))
    if (held >= 3000 && !pointResetFired) {
      // 首页：食指3秒解锁地球缩放（沿用原有 zoom 闩锁逻辑）
      if (route.path === '/index' || route.path === '/') {
        if (!zoomArmed || zoomLocked) {
          zoomArmed = true
          zoomLocked = false
          document.dispatchEvent(new CustomEvent('gesture-zoom-armed', { detail: { armed: true } }))
        }
      } else if (route.path !== '/history' && route.path !== '/about') {
        // 占卜结果页：食指保持3秒 → 回到该占卜类型的「初次占卜界面」
        // 松手后用户即可用投掷/起卦手势再次占卜
        pointResetFired = true
        document.dispatchEvent(new CustomEvent('gesture-point-reset', { detail: {} }))
      }
    }
  } else {
    document.dispatchEvent(new CustomEvent('gesture-point-hold', { detail: { active: false, progress: 0 } }))
    pointResetFired = false
  }

  // 3. Mathematical Swipe Classification
  if (handState !== 'palm' && handState !== 'fist') {
    lastPalmX = null
    lastPalmY = null
    lastPalmTime = null
  }

  if ((handState === 'palm' || handState === 'fist') && lastPalmX !== null && lastPalmY !== null && lastPalmTime !== null) {
    const dt = now - lastPalmTime
    if (dt > 10 && dt < 300) {
      // Delta in pixel coordinates approx
      const dxPixels = (palmCenterX - lastPalmX) * window.innerWidth
      const dyPixels = (palmCenterY - lastPalmY) * window.innerHeight

      const speedX = Math.abs(dxPixels) / dt
      const speedY = Math.abs(dyPixels) / dt

      if (!shouldDispatchGestureTrigger(handState)) {
        lastPalmX = null
        lastPalmY = null
        lastPalmTime = null
        return
      }

      if (speedY > swipeThresholdSpeed && Math.abs(dyPixels) > swipeMinDist) {
        if (dyPixels < -swipeMinDist) {
          // Swipe up (remember Y-axis starts top, so up is negative delta)
          document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'swipe-up', state: handState } }))
          document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'vertical-swipe', direction: 'up', state: handState } }))
          // Reset swipe state to prevent multiple triggers in one go
          lastPalmX = null
          lastPalmY = null
          lastPalmTime = null
          return
        } else if (dyPixels > swipeMinDist) {
          // Swipe down (positive delta = moving down)
          document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'swipe-down', state: handState } }))
          document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'vertical-swipe', direction: 'down', state: handState } }))
          lastPalmX = null
          lastPalmY = null
          lastPalmTime = null
          return
        }
      }

      if (speedX > swipeThresholdSpeed && Math.abs(dxPixels) > swipeMinDist) {
        // Horizontal swipe
        document.dispatchEvent(new CustomEvent('gesture-trigger', {
          detail: {
            type: 'horizontal-swipe',
            direction: dxPixels > 0 ? 1 : -1,
            state: handState
          }
        }))
        lastPalmX = null
        lastPalmY = null
        lastPalmTime = null
        return
      }
    }
  }

  lastPalmX = palmCenterX
  lastPalmY = palmCenterY
  lastPalmTime = now
}

// 手势握拳时，触发光标所在可点击 UI 元素（顶部按钮、开关、关闭按钮等）的原生点击
const DIALOG_TRIGGER_SELECTOR = '.help-btn, .theme-btn, .gesture-theme-btn, .ds-theme-btn, .ds-gesture-btn'

// 手势点击同样需要把幕布展开起点对齐到被点击的按钮，
// 否则只靠 main.js 的 pointerdown 无法覆盖"握拳→.click()"这条路径，
// 导致幕布动画始终从"上一次真实 pointerdown 的位置"(往往是左上角的手势开关)展开。
function setDialogOriginFromElement(el) {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const dx = x - window.innerWidth / 2
  const dy = y - window.innerHeight / 2
  const root = document.documentElement
  root.style.setProperty('--dialog-origin-x', `${x}px`)
  root.style.setProperty('--dialog-origin-y', `${y}px`)
  root.style.setProperty('--dialog-origin-dx', `${dx}px`)
  root.style.setProperty('--dialog-origin-dy', `${dy}px`)
  root.style.setProperty('--dialog-origin-w', `${rect.width}px`)
  root.style.setProperty('--dialog-origin-h', `${rect.height}px`)
}

// 拖拽松手后的惯性滑行：按末速度继续滚动并逐步衰减，减少长页面的重复滚动操作
function startPageInertia() {
  stopPageInertia()
  let vel = pageDragVelY
  if (!pageDragTarget) return
  const step = () => {
    // 惯性随每帧衰减（接近自然滚动手感）
    vel *= 0.90
    if (Math.abs(vel) < 0.4) { pageInertiaRaf = null; return }
    const before = pageDragTarget.scrollTop
    pageDragTarget.scrollTop += vel * PAGE_SCROLL_GAIN
    // 触底/到顶则停止，避免空转
    if (pageDragTarget.scrollTop === before) { pageInertiaRaf = null; return }
    pageInertiaRaf = requestAnimationFrame(step)
  }
  pageInertiaRaf = requestAnimationFrame(step)
}
function stopPageInertia() {
  if (pageInertiaRaf) { cancelAnimationFrame(pageInertiaRaf); pageInertiaRaf = null }
}

function clickElementAt(x, y) {
  const el = document.elementFromPoint(x, y)
  if (!el) return
  const target = el.closest('button, a, input, label, [role="button"], .clickable, .tab-item, .sidebar-item, .a-toc-item, .filter-tab, .toolbar-btn, .edit-btn, .help-popup-close')
  if (target) {
    const trigger = target.closest(DIALOG_TRIGGER_SELECTOR)
    if (trigger) setDialogOriginFromElement(trigger)
    target.click()
  }
}

// 从光标位置向上查找可纵向滚动的祖先容器；找不到则回退到页面根滚动
function findScrollable(x, y) {
  // 1) 从光标命中元素沿祖先链找可滚动容器（如 About 页右侧 .a-main）
  let el = document.elementFromPoint(x, y)
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el
    el = el.parentElement
  }
  // 2) 兜底：光标落在卡片边缘/空白等无内部滚动处时，优先回退到页面的主要内容滚动区，
  //    避免回退到 body 根（About 等固定高度卡片页 body 并不滚动，会导致「握拳拖拽无法翻页」）
  const main = document.querySelector('.a-main, main[class], .main-card, .scene-scroll')
  if (main && getComputedStyle(main).overflowY === 'auto' && main.scrollHeight > main.clientHeight + 1) {
    return main
  }
  return document.scrollingElement || document.documentElement
}

// 拖拽滚动期间需临时禁用容器的 scroll-behavior:smooth——
// 否则逐帧 scrollTop+= 会触发平滑动画叠加，导致页面"跟不上手、抖动"。
let pageDragPrevBehavior = ''   // 记录进入拖拽前的 scrollBehavior，用于退出时恢复
function enterPageDrag(target) {
  pageDragging = true
  if (target) {
    pageDragPrevBehavior = target.style.scrollBehavior || ''
    target.style.scrollBehavior = 'auto'
  }
}
function exitPageDrag() {
  pageDragging = false
  if (pageDragTarget) {
    pageDragTarget.style.scrollBehavior = pageDragPrevBehavior || ''
  }
  pageDragPrevBehavior = ''
}


// Draw skeleton and nodes inside Radar Circle
function drawHandRadar(ctx, landmarks) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  // 💡 骨骼连线与骨骼关节点统一改为白色 40% 透明度，柔和不刺眼
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 3
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'

  // Connections map
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [0, 17] // Palm base connection
  ]

  ctx.beginPath()
  for (const conn of connections) {
    // Mirrored X for natural feedback
    const x1 = (1 - landmarks[conn[0]].x) * w
    const y1 = landmarks[conn[0]].y * h
    const x2 = (1 - landmarks[conn[1]].x) * w
    const y2 = landmarks[conn[1]].y * h

    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.stroke()

  // Draw joint circles
  for (let i = 0; i < landmarks.length; i++) {
    const x = (1 - landmarks[i].x) * w
    const y = landmarks[i].y * h
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, 2 * Math.PI)
    ctx.fill()
  }
}

// Watchers and lifecycle hooks
watch(() => store.isGesture, (newVal) => {
  if (newVal) {
    initMediaPipe()
  } else {
    stopTracking()
  }
})

watch(() => route.path, (newPath) => {
  lastScrolledEl = null
  hasScrolledThisPage = false
  // 清理占卜页面握拳计时/拖拽状态，防止跨页面残留
  stopPageInertia()
  exitPageDrag()   // 结束拖拽并恢复 scroll-behavior，防止跨页面残留 smooth 禁用
  pageFistHoldStart = 0
  pageDragArmed = false
  // 离开首页第二页时清理握拳计时状态，防止旧值残留导致下次快速握拳被误判为长按
  if (newPath !== '/index') {
    fistHoldStart = 0
    fistDragArmed = false
  }
  if (store.isGesture) {
    initMediaPipe()   // 历史/关于等所有页面均支持手势交互（拖拽滚动、点击、✌返回）
  } else {
    stopTracking()
  }
})



onMounted(() => {
  // Watch DOM additions and transitions to automatically scroll results into view center!
  domObserver = new MutationObserver(() => {
    const targetSelector = '.result-box, .result-detail, .qian-result, .hex-display, .book-open-wrap, .interp-box, .gua-result-card'
    const target = document.querySelector(targetSelector)

    if (target) {
      if (lastScrolledEl !== target) {
        lastScrolledEl = target
        setTimeout(() => {
          // Check again inside timeout to prevent erroring on fast page transitions
          const currentTarget = document.querySelector(targetSelector)
          if (currentTarget) {
            const didScroll = scrollIntoViewIfNeeded(currentTarget, { behavior: 'smooth', block: 'end', threshold: 0.75 })
            // Keep a small extra nudge only when we actually scrolled.
            if (didScroll) {
              setTimeout(() => { window.scrollBy({ top: 50, behavior: 'smooth' }) }, 200)
            }
          }
        }, 180)
      }
    } else {
      // 💡 用户重置了结果（点击了"再次占卜/起卦"），我们自动恢复滚动权限，准备迎接下一次结果！
      lastScrolledEl = null
    }
  })

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  })
  window.addEventListener('mousemove', handleMove, { passive: true })
  window.addEventListener('touchmove', handleMove, { passive: true })
  window.addEventListener('mousedown', handleStart, { passive: true })
  window.addEventListener('touchstart', handleStart, { passive: true })
  window.addEventListener('mouseup', handleEnd, { passive: true })
  window.addEventListener('touchend', handleEnd, { passive: true })

  animationFrameId = requestAnimationFrame(updatePointerSmoothly)

  if (store.isGesture) {
    initMediaPipe()
  }

  // 监听 Index.vue 派发的 zoom-locked 同步事件
  document.addEventListener('gesture-zoom-locked', handleZoomLocked)
})

onUnmounted(() => {
  document.removeEventListener('gesture-zoom-locked', handleZoomLocked)
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('touchmove', handleMove)
  window.removeEventListener('mousedown', handleStart)
  window.removeEventListener('touchstart', handleStart)
  window.removeEventListener('mouseup', handleEnd)
  window.removeEventListener('touchend', handleEnd)
  cancelAnimationFrame(animationFrameId)
  stopTracking()
  if (domObserver) {
    domObserver.disconnect()
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.aura-orb {
  position: fixed;
  pointer-events: none;
  border-radius: 50%;
  background: rgba(var(--primary-rgb), 0.15);
  border: 2px solid var(--primary);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.8);
  z-index: 999999;
  transition: width 0.1s ease-out, height 0.1s ease-out, margin 0.1s ease-out, background-color 0.1s;
}
.aura-orb::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px dashed rgba(var(--primary-rgb), 0.5);
  animation: orbRotate 6s linear infinite;
}
.aura-orb.is-clicked {
  background: rgba(var(--primary-rgb), 0.35);
  box-shadow: 0 0 25px var(--primary);
}
@keyframes orbRotate {
  100% { transform: rotate(360deg); }
}

/* Gorgeous Floating Camera Radar Preview Window */
.camera-radar-container {
  position: fixed;
  bottom: 60px;
  right: 16px;
  z-index: 99999;
  pointer-events: none;
}
.radar-circle {
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 12px; /* 💡 彻底更改为精致的圆角矩形 */
  border: 2px solid var(--primary);
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 10px rgba(var(--primary-rgb), 0.5);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radar-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scaleX(-1); /* Mirror camera feed internally */
  opacity: 0.65;
}
.radar-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.radar-status-dot {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4d4f;
  box-shadow: 0 0 6px #ff4d4f;
}
.radar-status-dot.connected {
  background: #52c41a;
  box-shadow: 0 0 6px #52c41a;
}
</style>
