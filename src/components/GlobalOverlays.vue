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
  <div v-if="store.isGesture && route.path !== '/history'"
       class="aura-orb"
       :class="{ 'is-clicked': isPointerDown }"
       :style="orbStyle"></div>

  <!-- Camera Radar (Floating, semi-transparent circular preview window) -->
  <div v-if="store.isGesture && route.path !== '/history'" class="camera-radar-container">
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
const swipeThresholdSpeed = 0.3 // pixels per millisecond (lowered for easier detection)
const swipeMinDist = 30 // minimum pixels distance (lowered for easier detection)

// Smooth cursor coordinates
let targetPointerX = window.innerWidth / 2
let targetPointerY = window.innerHeight / 2

function updatePointerSmoothly() {
  if (store.isGesture && route.path !== '/history') {
    // Linear interpolation for smooth cursor movement
    pointerX.value += (targetPointerX - pointerX.value) * 0.25
    pointerY.value += (targetPointerY - pointerY.value) * 0.25

    document.dispatchEvent(new CustomEvent('gesture-hover', {
      detail: { x: pointerX.value, y: pointerY.value, state: lastHandState }
    }))
  }
  animationFrameId = requestAnimationFrame(updatePointerSmoothly)
}

function updatePointer(e) {
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
  if (!store.isGesture || route.path === '/history') return

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
  if (!store.isGesture || route.path === '/history') {
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
  // 这完美解决了“有的时候开启手势需要刷新网页”的痛点，确保一击必中，100% 顺畅启动摄像头！
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
    // If no hand is visible, fade pointer down
    return
  }

  const landmarks = results.multiHandLandmarks[0]

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

  // 2. Gesture classification

  // Check PEACE SIGN (✌️ Home): Index and Middle fingers extended, Ring and Pinky bent
  const isPeace = !indexBent && !middleBent && ringBent && pinkyBent

  // Check FIST (✊ Click): All four fingers bent close to the palm
  const isFist = indexBent && middleBent && ringBent && pinkyBent

  // Check INDEX POINTING (Pointing/Hover): Index finger extended, others closed
  const isPointing = !indexBent && middleBent && ringBent && pinkyBent

  // Check OPEN PALM (Scroll): All four fingers extended
  const isPalm = !indexBent && !middleBent && !ringBent && !pinkyBent
  const handState = isPeace ? 'peace' : isFist ? 'fist' : isPointing ? 'point' : isPalm ? 'palm' : 'unknown'

  // Perform Screen Coordinate Mapping
  // MediaPipe X is [0, 1] (left to right from camera perspective, but video is mirrored)
  // Mirror X so it acts like a mirror
  const activeX = handState === 'point' ? indexTip.x : palmCenterX
  const activeY = handState === 'point' ? indexTip.y : palmCenterY
  const mappedX = (1 - activeX) * window.innerWidth
  const mappedY = activeY * window.innerHeight

  // Update hover target smoothly
  targetPointerX = mappedX
  targetPointerY = mappedY

  if (handState !== lastHandState) {
    lastHandState = handState
    document.dispatchEvent(new CustomEvent('gesture-state', {
      detail: { state: handState }
    }))

    // 💡 如果检测到剪刀手手势（Peace / ✌️）且当前不在首页，自动返回首页并提示
    if (handState === 'peace' && route.path !== '/') {
      showToast('✌️ 识别成功：返回首页')
      router.push('/')
    }
  }

  // Emit Fist / Click action trigger
  if (isFist) {
    if (!isPointerDown.value) {
      isPointerDown.value = true
      document.dispatchEvent(new CustomEvent('gesture-click', {
        detail: { x: pointerX.value, y: pointerY.value, state: handState }
      }))
    }
  } else {
    isPointerDown.value = false
  }

  // 3. Mathematical Swipe Classification
  const now = Date.now()
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
          document.dispatchEvent(new CustomEvent('gesture-trigger', { detail: { type: 'vertical-swipe', state: handState } }))
          // Reset swipe state to prevent multiple triggers in one go
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
  if (newPath === '/history') {
    stopTracking()
  } else if (store.isGesture) {
    initMediaPipe()
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
      // 💡 用户重置了结果（点击了“再次占卜/起卦”），我们自动恢复滚动权限，准备迎接下一次结果！
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
})

onUnmounted(() => {
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
