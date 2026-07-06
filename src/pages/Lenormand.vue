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
            <span class="help-popup-content">雷诺曼占卜是欧洲传统的意象占卜，共36张牌。不同于塔罗的象征，雷诺曼意象具体、直白，擅长通过牌组精准预测具体事务。
双牌阵——
主体-修饰；
条件-结果；
其他...
三牌阵——
时间流：过去-现在-未来；
其他...

如何使用：
1.选择安静的环境，保持心神专一，默念想要询问的问题。问题要具体明确，时间范围建议在3个月至1年以内，避免长期预测。
2.选择单牌或三牌阵，根据直觉抽出牌。
3.根据牌或牌组解读，获得答案。

注意事项：不问健康生死、黄赌毒、他人隐私、具体数字时间类问题；同一个问题建议隔7天再问，反复追问会让信息混乱；尽量避开深夜11点到凌晨3点能量活跃期间；别把结果当"圣旨"，占卜是给你启示而非替你做决定。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">雷诺曼占卜</div>
      <div class="page-subtitle">浅象明事理，灵卜解难疑</div>

      <!-- Input always visible -->
      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />

      <!-- Phase: choose -->
      <template v-if="phase === 'choose'">
        <div class="draw-count-row">
          <div class="draw-btn" :class="{'draw-on': drawCount===1}" @click="drawCount=1">抽1张</div>
          <div class="draw-btn" :class="{'draw-on': drawCount===2}" @click="drawCount=2">抽2张</div>
          <div class="draw-btn" :class="{'draw-on': drawCount===3}" @click="drawCount=3">抽3张</div>
        </div>
        <div class="deck-display" @click="startShuffle">
          <div v-for="(d,i) in deckDisplay" :key="i" class="deck-card"
            :style="`transform:rotate(${d.rot}deg) translateY(${d.ty}px);z-index:${i};background-image:url(${cardBackSrc});background-size:cover;background-color:#FFFFFF`"></div>
        </div>
        <button class="btn-gold" @click="startShuffle">开始洗牌</button>
        <div class="hint-text">
          <span class="hint-icon">💡</span>
          <span>点击卡牌 / 点击按钮开始洗牌</span>
        </div>
      </template>

      <!-- Phase: shuffle -->
      <template v-if="phase === 'shuffle'">
        <div class="shuffle-hint">左右拨动牌堆洗牌（{{ shuffleCount }}/3次）</div>
        <div class="shuffle-area"
          @touchstart.passive="onShuffleStart" @touchmove.passive="onShuffleMove" @touchend.passive="onShuffleEnd"
          @mousedown="onShuffleMouseDown" @mousemove="onShuffleMouseMove" @mouseup="onShuffleMouseUp" @mouseleave="onShuffleMouseUp">
          <div v-for="(c,i) in shuffleCards" :key="i" class="shuffle-card"
            :style="`transform:translate(${c.x}px,${c.y}px) rotate(${c.rot}deg);z-index:${c.z};background-image:url(${cardBackSrc});background-size:cover;background-color:#FFFFFF`"></div>
        </div>
        <div v-if="shuffleCount >= 3" class="shuffle-ready">洗牌完成，展开牌堆 →</div>
      </template>

      <!-- Phase: spread (fan canvas) -->
      <template v-if="phase === 'spread'">
        <div class="picked-preview">
          <div v-for="(idx, i) in pickedList" :key="i" class="picked-slot">
            <div class="picked-card" :style="`background-image:url(${cardBackSrc});background-size:cover;background-position:center;background-color:#FFFFFF`">
              <span class="picked-num">{{ idx + 1 }}</span>
            </div>
          </div>
          <div v-for="j in (drawCount - pickedList.length)" :key="'e'+j" class="picked-slot">
            <div class="picked-card-empty">{{ pickedList.length + j }}</div>
          </div>
        </div>
        <div class="spread-hint">{{ pickedCount >= drawCount ? '牌已选满' : `可左右滑动选牌（${pickedCount}/${drawCount}）` }}</div>
        <div class="fan-wrap" ref="fanWrapRef">
          <canvas ref="fanCanvasRef" class="fan-canvas"
            @touchstart.passive="onFanTouchStart" @touchmove.passive="onFanTouchMove" @touchend.passive="onFanTouchEnd"
            @mousedown.prevent="onFanMouseDown" @mousemove="onFanMouseMove" @mouseup="onFanMouseUp" @mouseleave="handleCanvasMouseLeave" @mousemove.passive="handleCanvasMouseMove"></canvas>
        </div>
      </template>

      <!-- Phase: flipping -->
      <template v-if="phase === 'flipping'">
        <div class="picked-preview">
          <div v-for="(r, i) in pendingResults" :key="i" class="picked-slot">
            <div class="flip-card">
              <div class="flip-card-inner" :class="{ 'is-flipped': flipState[i] }">
                <div class="flip-card-back" :style="`background-image:url(${cardBackSrc});background-size:cover;background-position:center;background-color:#FFFFFF`">
                  <span class="picked-num">{{ pickedList[i] + 1 }}</span>
                </div>
                <div class="flip-card-front">
                  <img :src="r.img" class="flip-card-img" @error="e=>e.target.style.display='none'" />
                </div>
              </div>
            </div>
            <div class="leno-name" style="margin-top:5px">{{ r.name }}</div>
          </div>
        </div>
      </template>

      <!-- Phase: result -->
      <template v-if="phase === 'result'">
        <!-- 卡牌缩略行 -->
        <div class="result-cards">
          <div v-for="(r,i) in results" :key="i" class="leno-result-card">
            <div class="leno-card-img-wrap">
              <img :src="r.img" class="leno-card-img" @error="e=>e.target.style.display='none'" />
            </div>
            <div class="leno-name">{{ r.name }}</div>
          </div>
        </div>
        <!-- 按钮 -->
        <button class="btn-gold" @click="reset" style="margin-top:12px">再次占卜</button>
        <!-- 详情列表 -->
        <div v-for="(r,i) in results" :key="'d'+i" class="result-detail">
          <div class="detail-title">{{ r.name }}</div>
          <div class="detail-meaning">{{ r.meaning }}</div>
          <div class="detail-ext">{{ r.extended }}</div>
        </div>
      </template>
      <AiDialogue pageType="lenormand" :question="question" :resultData="getLenormandResultData()" :hasResult="phase === 'result'" />
    </div>
    <div style="height:0px"></div>
  </div>
</template>

<script setup>
import { helpCurtainBeforeEnter, helpCurtainEnter, helpCurtainLeave } from '../composables/useCurtainMotion.js'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AiDialogue from '../components/AiDialogue.vue'
import { store } from '../store.js'
import { play } from '../sound.js'
import { THEMES } from '../theme.js'

const themeStyle = computed(() => store.getThemeStyle())
const fanCanvasRef = ref(null)
const fanWrapRef = ref(null)
const showHelpPopup = ref(false)
const phase = ref('choose')
const drawCount = ref(1)
const question = ref('')
const shuffleCards = ref([])
const shuffleCount = ref(0)
const pickedCount = ref(0)
const pickedList = ref([])
const pendingResults = ref([])
const flipState = ref([])
const results = ref([])
const interpretation = ref('')
const deckDisplay = ref(Array.from({length:7},(_,i)=>({rot:(Math.random()-0.5)*10,ty:-i*2})))

function natureProps(nature){switch(nature){case'正面':return{color:'#10b981',nc:'pos'};case'负面':return{color:'#ef4444',nc:'neg'};case'中性偏好':return{color:'#D4A853',nc:'spos'};case'中性偏坏':return{color:'#f97316',nc:'sneg'};default:return{color:'#6B7280',nc:'neu'}}}
const RAW_CARDS=[{id:1,name:'骑士',nature:'中性偏好',meaning:'消息、信差、访客',extended:'新进展、递送、恋情中的新人（男）'},{id:2,name:'幸运草',nature:'正面',meaning:'幸运、机会、开心',extended:'小幸运、小偏财、赌博投机者'},{id:3,name:'船',nature:'中性',meaning:'移动、商业、旅行',extended:'远距离、遗产、转帐、向往、商人'},{id:4,name:'房子',nature:'中性偏好',meaning:'家、私生活、安全',extended:'建筑/场所、稳固、家人'},{id:5,name:'树',nature:'中性',meaning:'健康、根源、成长',extended:'缓慢、耐心、沉闷、远亲/祖先'},{id:6,name:'云',nature:'负面',meaning:'麻烦、迷惘、不幸',extended:'压力、隐藏、猜忌、阴郁'},{id:7,name:'蛇',nature:'中性偏坏',meaning:'欺骗、背叛、复杂',extended:'虚伪、恶意、变故、情敌（女）'},{id:8,name:'棺材',nature:'负面',meaning:'结束、盖棺论定',extended:'疾病、死亡、破产、解脱'},{id:9,name:'花束',nature:'正面',meaning:'幸福、礼物、喜悦',extended:'美好、美丽、成功'},{id:10,name:'镰刀',nature:'负面',meaning:'快速斩断、伤害',extended:'危险、中断、骤停、减少'},{id:11,name:'鞭子',nature:'中性偏坏',meaning:'争执、重复、性',extended:'口角、冲突、责罚、暴力'},{id:12,name:'鸟',nature:'中性',meaning:'聊天、双倍',extended:'沟通、八卦、小麻烦'},{id:13,name:'小孩',nature:'中性',meaning:'孩子、新的',extended:'小的、刚起步、单纯'},{id:14,name:'狐狸',nature:'中性偏坏',meaning:'欺骗、背叛',extended:'利用、聪明、策略性的'},{id:15,name:'熊',nature:'中性偏好',meaning:'力量、资源、母亲',extended:'理财、饮食、女性长辈'},{id:16,name:'星星',nature:'正面',meaning:'展望、指引、实现',extended:'理想、希望、方向正确'},{id:17,name:'鹳鸟',nature:'中性偏好',meaning:'改变、进步、怀孕',extended:'迁移、航行'},{id:18,name:'狗',nature:'正面',meaning:'朋友、忠诚',extended:'帮助、支持、奉献'},{id:19,name:'塔',nature:'中性',meaning:'长寿、权威、孤立',extended:'退休生活、严肃、雄心壮志'},{id:20,name:'花园',nature:'中性偏好',meaning:'公众、社交',extended:'公开、公共场合、社交平台'},{id:21,name:'山',nature:'负面',meaning:'障碍、延迟',extended:'停滞、疏远、远方'},{id:22,name:'路口',nature:'中性',meaning:'选择、多重',extended:'途径、分支、分工'},{id:23,name:'老鼠',nature:'负面',meaning:'损失、压力',extended:'侵蚀、损耗、烦恼'},{id:24,name:'爱心',nature:'正面',meaning:'爱',extended:'情感、爱情、好意、慈悲'},{id:25,name:'戒指',nature:'中性偏好',meaning:'约定、循环',extended:'结合、承诺、合约'},{id:26,name:'书',nature:'中性偏坏',meaning:'未知、知识',extended:'秘密、学业、神秘学'},{id:27,name:'信',nature:'中性',meaning:'书面讯息',extended:'文件、纸制品'},{id:28,name:'男人',nature:'中性',meaning:'男人、阳性',extended:'男性气质的'},{id:29,name:'女人',nature:'中性',meaning:'女人、阴性',extended:'女性气质的'},{id:30,name:'百合',nature:'中性偏好',meaning:'贞洁、年长',extended:'智慧、成熟、性欲'},{id:31,name:'太阳',nature:'正面',meaning:'成功、胜利',extended:'正面、积极、光明正大'},{id:32,name:'月亮',nature:'正面',meaning:'名誉、直觉、阴性',extended:'公众形象、浪漫、神秘感'},{id:33,name:'钥匙',nature:'正面',meaning:'解答、关键、确定',extended:'重大、微妙'},{id:34,name:'鱼',nature:'正面',meaning:'丰盛、财富',extended:'深度、独立自主、自由'},{id:35,name:'锚',nature:'正面',meaning:'稳定、持久',extended:'希望、信念、定下来'},{id:36,name:'十字架',nature:'负面',meaning:'痛苦折磨、宗教',extended:'负担、压力、不幸'}]
const LENORMAND_CARDS=RAW_CARDS.map(c=>({...c,...natureProps(c.nature)}))

let shuffledDeck=[],shuffleTouchX=0,shuffleDir=0,shuffleGestureCounted=false
let shuffleCompleteTimer = null
let fanCtx=null,fanW=1,fanH=1,fanRect=null,fanOffset=0,fanVelocity=0,fanStartX=0,fanPrevX=0,fanTimerId=null
let pickedIndices=[],liftProgress={},cardBackImg=null,dpr=2,fanRafPending=false,fanVibStep=0
function getCardSize(){const w=window.innerWidth;if(w>=1200)return{w:130,h:195};if(w>=768)return{w:105,h:157};return{w:70,h:105}}
let themeColor='#D4A853',themeGlow='rgba(212,168,83,0.75)',themeBorder='rgba(212,168,83,0.5)'
function initTheme(){const t=THEMES[store.themeKey||'jin'],r=parseInt(t.primary.slice(1,3),16),g=parseInt(t.primary.slice(3,5),16),b=parseInt(t.primary.slice(5,7),16);themeColor=t.primary;themeGlow=`rgba(${r},${g},${b},0.75)`;themeBorder=`rgba(${r},${g},${b},0.5)`}
onMounted(()=>initTheme())
const cardBackSrc=computed(()=>store.getThemeCardBack())

function startShuffle(){
  if (shuffleCompleteTimer) {
    clearTimeout(shuffleCompleteTimer)
    shuffleCompleteTimer = null
  }
  shuffledDeck=[...LENORMAND_CARDS].sort(()=>Math.random()-0.5)
  shuffleCards.value=Array.from({length:12},(_,i)=>({x:0,y:0,rot:(Math.random()-0.5)*5,z:i}))
  shuffleCount.value=0;phase.value='shuffle';shuffleGestureCounted=false
}
function onShuffleStart(e){shuffleTouchX=e.touches[0].clientX;shuffleGestureCounted=false}
function onShuffleMove(e){
  const dx=e.touches[0].clientX-shuffleTouchX;if(Math.abs(dx)<15)return
  const dir=dx>0?1:-1
  shuffleDir=dir;shuffleTouchX=e.touches[0].clientX;play('cardShuffle')
  shuffleCards.value=shuffleCards.value.map(()=>({x:(Math.random()-0.5)*120*dir,y:(Math.random()-0.5)*60,rot:(Math.random()-0.5)*25,z:Math.floor(Math.random()*12)}))
  if (!shuffleGestureCounted) {
    shuffleGestureCounted = true
    shuffleCount.value=Math.min(shuffleCount.value+1,5)
    if (shuffleCount.value>=3 && !shuffleCompleteTimer) {
      shuffleCompleteTimer=setTimeout(()=>{
        shuffleCompleteTimer=null
        showSpread()
      },400)
    }
  }
  setTimeout(()=>{shuffleCards.value=shuffleCards.value.map((_,i)=>({x:(Math.random()-0.5)*15,y:(Math.random()-0.5)*10,rot:(Math.random()-0.5)*6,z:i}))},200)
}
function onShuffleEnd(){shuffleDir=0;shuffleGestureCounted=false;if(shuffleCount.value>=3 && !shuffleCompleteTimer){shuffleCompleteTimer=setTimeout(()=>{shuffleCompleteTimer=null;showSpread()},400)}}
function scrollFanIntoView() {
  requestAnimationFrame(() => {
    if (!fanWrapRef.value || typeof fanWrapRef.value.scrollIntoView !== 'function') return

    // If users can already see the fan area (common on mobile), don't auto-scroll.
    const r = fanWrapRef.value.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight || 0
    const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0)
    const ratio = (visibleH > 0 && r.height > 0) ? (visibleH / r.height) : 0
    if (ratio >= 0.15) return

    fanWrapRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function showSpread(){if(!shuffledDeck.length)shuffledDeck=[...LENORMAND_CARDS].sort(()=>Math.random()-0.5);pickedIndices=[];pickedList.value=[];pendingResults.value=[];flipState.value=[];liftProgress={};fanOffset=0;fanVelocity=0;fanCtx=null;pickedCount.value=0;phase.value='spread';setTimeout(()=>{initFanCanvas();scrollFanIntoView()},120)}
function initFanCanvas(){
  initTheme();const cv=fanCanvasRef.value;if(!cv)return
  const rect=cv.getBoundingClientRect();dpr=window.devicePixelRatio||2;cv.width=rect.width*dpr;cv.height=rect.height*dpr
  fanCtx=cv.getContext('2d');fanCtx.scale(dpr,dpr);fanW=rect.width;fanH=rect.height;fanRect=rect
  const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{cardBackImg=img;drawFan()};img.onerror=()=>drawFan();img.src=cardBackSrc.value;drawFan()
}
const hoveredCardIdx = ref(-1)
const gestureState = ref('unknown')
let hoverSelectionTimer = null

function clearHoverSelectionTimer() {
  if (hoverSelectionTimer) {
    clearTimeout(hoverSelectionTimer)
    hoverSelectionTimer = null
  }
}

function startHoverSelectionTimer(idx) {
  clearHoverSelectionTimer()
  if (idx < 0 || gestureState.value !== 'point') return
  hoverSelectionTimer = setTimeout(() => {
    if (gestureState.value === 'point' && hoveredCardIdx.value === idx) {
      pickFanCard(idx)
    }
  }, 3000)
}

function updateHoveredCard(clientX, clientY) {
  if (phase.value !== 'spread') { hoveredCardIdx.value = -1; return -1 }
  const rect = fanCanvasRef.value ? fanCanvasRef.value.getBoundingClientRect() : null; if (!rect) return -1
  const lx = clientX - rect.left, ly = clientY - rect.top
  const total = LENORMAND_CARDS.length, cx = fanW / 2, cy = fanH + 400, R = 500, span = 2.0, { w: cw, h: ch } = getCardSize()
  let bestIdx = -1
  for (let i = 0; i < total; i++) {
    const angle = -span / 2 + i * (span / (total - 1)) - fanOffset
    if (Math.abs(angle) > span / 2 + 0.1) continue
    const x = cx + Math.sin(angle) * R, y = cy - Math.cos(angle) * R
    const dx = lx - x, dy = ly - y, cosA = Math.cos(angle), sinA = Math.sin(angle)
    const lc_x = dx * cosA + dy * sinA, lc_y = -dx * sinA + dy * cosA
    if (Math.abs(lc_x) <= cw / 2 + 10 && Math.abs(lc_y) <= ch / 2 + 10) bestIdx = i
  }
  if (hoveredCardIdx.value !== bestIdx) {
    hoveredCardIdx.value = bestIdx
    drawFan()
    if (bestIdx !== -1) {
      requestAnimationFrame(drawFanLoop)
    }
  }
  return bestIdx
}

function drawFanLoop() {
  if (phase.value === 'spread' && hoveredCardIdx.value !== -1) {
    drawFan()
    requestAnimationFrame(drawFanLoop)
  }
}

function handleGestureHover(e) {
  if (gestureState.value === 'palm') {
    if (phase.value === 'spread') {
      const centerX = window.innerWidth / 2
      if (e.detail.x > centerX + 30) {
        fanOffset += 0.02
      } else if (e.detail.x < centerX - 30) {
        fanOffset -= 0.02
      }
      fanOffset = Math.max(-1.25, Math.min(1.25, fanOffset))
      drawFan()
    }
    hoveredCardIdx.value = -1
    clearHoverSelectionTimer()
    return
  }

  if (gestureState.value !== 'point') {
    hoveredCardIdx.value = -1
    drawFan()
    clearHoverSelectionTimer()
    return
  }

  const prevIdx = hoveredCardIdx.value
  const newIdx = updateHoveredCard(e.detail.x, e.detail.y)
  if (newIdx !== -1) {
    if (newIdx !== prevIdx) {
      startHoverSelectionTimer(newIdx)
    } else if (!hoverSelectionTimer) {
      startHoverSelectionTimer(newIdx)
    }
  } else {
    clearHoverSelectionTimer()
  }
}

function handleGestureState(e) {
  const prevState = gestureState.value
  gestureState.value = e.detail.state || 'unknown'
  if (gestureState.value !== 'point') {
    clearHoverSelectionTimer()
  }
  if (gestureState.value === 'palm') {
    hoveredCardIdx.value = -1
    drawFan()
  }
  if (gestureState.value === 'point' && prevState !== 'point' && hoveredCardIdx.value !== -1) {
    startHoverSelectionTimer(hoveredCardIdx.value)
  }
}

function handleGestureTrigger(e) {
  // In shuffle phase, horizontal swipe triggers shuffle
  if (phase.value === 'shuffle' && e.detail.type === 'horizontal-swipe') {
    // Directly trigger shuffle logic
    const dir = Math.random() > 0.5 ? 1 : -1
    if (dir !== shuffleDir) {
      shuffleDir = dir
      play('cardShuffle')
      shuffleCards.value = shuffleCards.value.map(() => ({
        x: (Math.random() - 0.5) * 120 * dir,
        y: (Math.random() - 0.5) * 60,
        rot: (Math.random() - 0.5) * 25,
        z: Math.floor(Math.random() * 12)
      }))
      shuffleCount.value = Math.min(shuffleCount.value + 1, 5)

      if (shuffleCount.value >= 3) {
        // 洗满 3 次直接平滑跳转到扇形选牌阶段！
        setTimeout(() => {
          showSpread()
          shuffleDir = 0
        }, 500)
      } else {
        setTimeout(() => {
          shuffleCards.value = shuffleCards.value.map((_, i) => ({
            x: (Math.random() - 0.5) * 15,
            y: (Math.random() - 0.5) * 10,
            rot: (Math.random() - 0.5) * 6,
            z: i
          }))
          shuffleDir = 0 // 💡 重置方向限制，以便用户能继续下一次手势挥动洗牌
        }, 200)
      }
    }
  }

  if (phase.value === 'spread' && e.detail.type === 'horizontal-swipe' && e.detail.state === 'palm') {
    const direction = e.detail.direction || 0
    fanOffset += direction * 0.1
    fanOffset = Math.max(-1.25, Math.min(1.25, fanOffset))
    drawFan()
  }
}

function handleGestureClick(e) {
  if (e.detail.state === 'fist') {
    if (phase.value === 'choose') {
      startShuffle()
    } else if (phase.value === 'result') {
      reset()
    }
  }
}

function handleCanvasMouseMove(e) {
  if (store.isGesture) return; // If gestures are enabled, let the camera pointer handle it
  const rect = fanCanvasRef.value ? fanCanvasRef.value.getBoundingClientRect() : null;
  if (!rect) return;
  updateHoveredCard(e.clientX, e.clientY);
}

function handleCanvasMouseLeave() {
  if (store.isGesture) return;
  hoveredCardIdx.value = -1;
  drawFan();
}

onMounted(() => {
  document.addEventListener('gesture-hover', handleGestureHover)
  document.addEventListener('gesture-state', handleGestureState)
  document.addEventListener('gesture-trigger', handleGestureTrigger)
  document.addEventListener('gesture-click', handleGestureClick)
})

onUnmounted(() => {
  document.removeEventListener('gesture-hover', handleGestureHover)
  document.removeEventListener('gesture-state', handleGestureState)
  document.removeEventListener('gesture-trigger', handleGestureTrigger)
  document.removeEventListener('gesture-click', handleGestureClick)
  if (fanTimerId) { clearTimeout(fanTimerId); fanTimerId = null }
})

function drawFan(){
  const ctx=fanCtx;if(!ctx)return
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,fanW,fanH)
  const total=LENORMAND_CARDS.length,cx=fanW/2,cy=fanH+400,R=500,span=2.0,{w:cw,h:ch}=getCardSize(),cr=5
  const drawRound=()=>{ctx.beginPath();ctx.moveTo(-cw/2+cr,-ch/2);ctx.lineTo(cw/2-cr,-ch/2);ctx.arcTo(cw/2,-ch/2,cw/2,-ch/2+cr,cr);ctx.lineTo(cw/2,ch/2-cr);ctx.arcTo(cw/2,ch/2,cw/2-cr,ch/2,cr);ctx.lineTo(-cw/2+cr,ch/2);ctx.arcTo(-cw/2,ch/2,-cw/2,ch/2-cr,cr);ctx.lineTo(-cw/2,-ch/2+cr);ctx.arcTo(-cw/2,-ch/2,-cw/2+cr,-ch/2,cr);ctx.closePath()}
  const items=[];for(let i=0;i<total;i++){const angle=-span/2+i*(span/(total-1))-fanOffset,y=cy-Math.cos(angle)*R;if(y+ch/2<0||y-ch/2>fanH+ch)continue;if(Math.abs(angle)>span/2+0.2)continue;items.push({i,angle})}
  items.sort((a,b)=>a.i-b.i)
  items.forEach(({i,angle})=>{
    const picked=pickedIndices.includes(i),liftY=liftProgress[i]||0
    const x=cx+Math.sin(angle)*R,y=cy-Math.cos(angle)*R-liftY,cos=Math.cos(angle),sin=Math.sin(angle)

    const isHovered = i === hoveredCardIdx.value
    let finalScale = 1.0
    if (isHovered) {
      finalScale = 1.08
    }
    ctx.setTransform(dpr*cos*finalScale,dpr*sin*finalScale,-dpr*sin*finalScale,dpr*cos*finalScale,dpr*x,dpr*y)

    if(picked){
      ctx.shadowColor=themeGlow;ctx.shadowBlur=28;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0
    } else if (isHovered) {
      const breathe = 16 + Math.sin(Date.now() * 0.006) * 6
      ctx.shadowColor = themeGlow;ctx.shadowBlur = breathe;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0
    } else {
      ctx.shadowColor='rgba(0,0,0,0.14)';ctx.shadowBlur=4;ctx.shadowOffsetY=1
    }

    drawRound();ctx.fillStyle='#FFF';ctx.fill()
    if(cardBackImg){
      ctx.save();ctx.shadowColor='transparent';drawRound();ctx.clip();
      ctx.drawImage(cardBackImg,-cw/2,-ch/2,cw,ch);ctx.restore();
      ctx.setTransform(dpr*cos*finalScale,dpr*sin*finalScale,-dpr*sin*finalScale,dpr*cos*finalScale,dpr*x,dpr*y)
    }
    drawRound();ctx.strokeStyle=(picked || isHovered)?themeColor:themeBorder;ctx.lineWidth=(picked || isHovered)?2.2:0.8;ctx.stroke()
    ctx.shadowColor='transparent';ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(-cw/2+2,-ch/2+2,15,12)
    ctx.fillStyle='#222';ctx.font='bold 9px sans-serif';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(i+1,-cw/2+16,-ch/2+3)
  })
  ctx.setTransform(dpr,0,0,dpr,0,0)
}
function onFanTouchStart(e){if(fanTimerId){clearTimeout(fanTimerId);fanTimerId=null};fanVelocity=0;fanStartX=e.touches[0].clientX;fanPrevX=e.touches[0].clientX;fanRafPending=false}
function onFanTouchMove(e){
  const x=e.touches[0].clientX,dx=x-fanPrevX;fanVelocity=dx;fanPrevX=x
  fanOffset-=dx*0.0038;fanOffset=Math.max(-1.25,Math.min(1.25,fanOffset))
  if(!fanRafPending&&fanCanvasRef.value){fanRafPending=true;requestAnimationFrame(()=>{fanRafPending=false;drawFan()})}
  const vStep=Math.round(fanOffset*25);if(vStep!==fanVibStep){fanVibStep=vStep;try{navigator.vibrate&&navigator.vibrate(12)}catch(e){};play('cardTick')}
  if (store.isGesture) {
    updateHoveredCard(x, e.touches[0].clientY)
  }
}
function onFanTouchEnd(e){
  const endX=e.changedTouches[0].clientX,endY=e.changedTouches[0].clientY
  if (store.isGesture && hoveredCardIdx.value !== -1) {
    pickFanCard(hoveredCardIdx.value)
  } else {
    if(Math.abs(endX-fanStartX)<8)trySelectFanCard(endX,endY)
    else if(Math.abs(fanVelocity)>0.5)doFanMomentum()
  }
}
function doFanMomentum(){let vel=fanVelocity;function step(){vel*=0.92;fanOffset-=vel*0.0038;fanOffset=Math.max(-1.25,Math.min(1.25,fanOffset));drawFan();if(Math.abs(vel)>0.25)fanTimerId=setTimeout(step,16)};step()}
function trySelectFanCard(clientX,clientY){const rect=fanCanvasRef.value?fanCanvasRef.value.getBoundingClientRect():fanRect;if(!rect)return;const lx=clientX-rect.left,ly=clientY-rect.top,total=LENORMAND_CARDS.length,cx=fanW/2,cy=fanH+400,R=500,span=2.0,{w:cw,h:ch}=getCardSize();let bestIdx=-1;for(let i=0;i<total;i++){const angle=-span/2+i*(span/(total-1))-fanOffset;if(Math.abs(angle)>span/2+0.1)continue;const x=cx+Math.sin(angle)*R,y=cy-Math.cos(angle)*R,dx=lx-x,dy=ly-y,cosA=Math.cos(angle),sinA=Math.sin(angle),lc_x=dx*cosA+dy*sinA,lc_y=-dx*sinA+dy*cosA;if(Math.abs(lc_x)<=cw/2+4&&Math.abs(lc_y)<=ch/2+4)bestIdx=i};if(bestIdx>=0)pickFanCard(bestIdx)}
function pickFanCard(idx){if(pickedIndices.includes(idx))return;if(pickedIndices.length>=drawCount.value)return;play('cardDraw');try{navigator.vibrate&&navigator.vibrate(45)}catch(e){};pickedIndices=[...pickedIndices,idx];pickedList.value=[...pickedIndices];liftProgress[idx]=0;animateLift(idx);pickedCount.value=pickedIndices.length;if(pickedCount.value>=drawCount.value)setTimeout(()=>revealCards(),650)}
function animateLift(idx){const TARGET=getCardSize().h*0.3,FRAMES=8;let frame=0;function step(){frame++;const t=frame/FRAMES;liftProgress[idx]=TARGET*(1-(1-t)*(1-t));drawFan();if(frame<FRAMES)setTimeout(step,16)};step()}
function revealCards(){
  const res=pickedIndices.map(cardIdx=>{const card=shuffledDeck[cardIdx]||LENORMAND_CARDS[cardIdx];return{id:card.id,name:card.name,nature:card.nature,color:card.color,nc:card.nc,meaning:card.meaning,extended:card.extended,img:`./lenormandcard/${card.id}.jpg`}})
  pendingResults.value=res;flipState.value=res.map(()=>false);phase.value='flipping'
  res.forEach((_,i)=>{setTimeout(()=>{play('cardDraw');const s=[...flipState.value];s[i]=true;flipState.value=s},i*520+100)})
  setTimeout(()=>{
    let interp=''
    if(res.length>=2){
      const posCount=res.filter(r=>r.nature==='正面'||r.nature==='中性偏好').length,negCount=res.filter(r=>r.nature==='负面'||r.nature==='中性偏坏').length
      if(res.length===2){const[cur,adv]=res;interp=`（${cur.name}）：${cur.meaning}，${cur.extended}\n（${adv.name}）：${adv.meaning}，${adv.extended}\n💡 解读：`;if(posCount>=2)interp+='两牌能量积极，顺势推进，时机有利。';else if(negCount>=2)interp+='当前阻力较大，建议放缓脚步，等待转机。';else interp+=`现状与建议形成对比，可借助${adv.name}的力量化解${cur.name}带来的困境。`;if(question.value)interp+=`\n\n关于"${question.value}"，建议借助${adv.name}（${adv.meaning}）寻找方向。`}
      else{const[past,present,future]=res;interp=`（${past.name}）：${past.meaning}，${past.extended}\n（${present.name}）：${present.meaning}，${present.extended}\n（${future.name}）：${future.meaning}，${future.extended}\n💡 综合解读：`;if(posCount>=2)interp+='整体能量积极，三牌呈现正面趋势，建议把握时机、顺势而为。';else if(negCount>=2)interp+='当前挑战较多，建议谨慎应对、耐心等待，待时机成熟再行动。';else interp+='当前处于转折期，正负能量交织，建议保持平衡心态，灵活应对。';if(question.value)interp+=`\n\n关于"${question.value}"，雷诺曼牌提示你关注${present.name}的能量——${present.meaning}。`}
    }
    play('cardReveal');results.value=res;interpretation.value=interp;phase.value='result'
    const historyDesc=drawCount.value===1?'单牌':drawCount.value===2?'两牌展开':'三牌展开'
    store.saveHistory('🎴 雷诺曼占卜',res.map(r=>r.name).join('·'),question.value||historyDesc)
  },res.length*520+900)
}
function reset(){if(fanTimerId){clearTimeout(fanTimerId);fanTimerId=null};fanCtx=null;pickedIndices=[];pickedList.value=[];pendingResults.value=[];flipState.value=[];liftProgress={};fanOffset=0;results.value=[];pickedCount.value=0;shuffleCount.value=0;interpretation.value='';deckDisplay.value=Array.from({length:7},(_,i)=>({rot:(Math.random()-0.5)*10,ty:-i*2}));phase.value='choose'}
let fanMouseDown=false
function onFanMouseDown(e){fanMouseDown=true;onFanTouchStart({touches:[{clientX:e.clientX}]})}
function onFanMouseMove(e){if(!fanMouseDown)return;onFanTouchMove({touches:[{clientX:e.clientX}]})}
function onFanMouseUp(e){if(!fanMouseDown)return;fanMouseDown=false;onFanTouchEnd({changedTouches:[{clientX:e.clientX,clientY:e.clientY}]})}
let shuffleMouseDown=false
function onShuffleMouseDown(e){shuffleMouseDown=true;onShuffleStart({touches:[{clientX:e.clientX}]})}
function onShuffleMouseMove(e){if(!shuffleMouseDown)return;onShuffleMove({touches:[{clientX:e.clientX}]})}
function onShuffleMouseUp(){if(!shuffleMouseDown)return;shuffleMouseDown=false;onShuffleEnd()}

function getLenormandResultData() {
  return results.value.map(r => ({
    name: r.name,
    meaning: r.meaning,
    extended: r.extended
  }))
}
</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }
.draw-count-row { display: flex; gap: 8px; justify-content: center; margin: 10px 0; }
.draw-btn { padding: 8px 16px; border-radius: 15px; font-size: 13px; color: #999; background: #F5F5F7; border: 1px solid #EBEBEB; cursor: pointer; }
.draw-on { color: var(--primary); background: var(--primary-light); border-color: var(--primary); }
.deck-display { position: relative; height: 190px; background: var(--primary-light); border-radius: 10px; margin: 10px 0 8px; cursor: pointer; user-select: none; }
.deck-card { position: absolute; top: 50%; left: 50%; width: 70px; height: 105px; margin-top: -52.5px; margin-left: -35px; background-size: cover; background-position: center; background-clip: padding-box; background-origin: content-box; background-color: #fff; padding: 3px; box-sizing: border-box; border-radius: 5px; border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); box-shadow: 0 1px 5px rgba(0,0,0,0.08); }
.shuffle-hint { text-align: center; font-size: 13px; color: #999; margin: 8px 0; }
.shuffle-area { position: relative; height: 190px; background: var(--primary-light); border-radius: 10px; overflow: hidden; touch-action: pan-y; margin-bottom: 8px; }
.shuffle-card { position: absolute; top: 50%; left: 50%; width: 70px; height: 105px; margin-top: -52.5px; margin-left: -35px; background-size: cover; background-position: center; background-clip: padding-box; background-origin: content-box; background-color: #fff; padding: 3px; box-sizing: border-box; border-radius: 5px; border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); box-shadow: 0 1px 2px rgba(0,0,0,0.15); transition: transform 0.2s; }
.shuffle-ready { text-align: center; font-size: 13px; color: var(--primary); font-weight: bold; margin-top: 8px; }
.picked-preview { display: flex; gap: 8px; justify-content: center; margin: 10px 0 2px; }
.picked-slot { flex: 1; min-width: 80px; max-width: 130px; display: flex; flex-direction: column; align-items: center; }
.picked-card { width: 70px; height: 105px; border-radius: 5px; background-size: cover; background-position: center; background-clip: padding-box; background-origin: content-box; background-color: #fff; padding: 3px; box-sizing: border-box; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); cursor: default; }
.picked-num { position: absolute; top: 4px; left: 5px; font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.9); background: rgba(0,0,0,0.28); border-radius: 3px; padding: 1px 4px; line-height: 1.4; }
.picked-card-empty { width: 70px; height: 105px; border-radius: 5px; background: var(--primary-light); border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: var(--primary); cursor: default; user-select: none; }
.flip-card { width: 70px; height: 105px; perspective: 600px; }
.flip-card-inner { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.55s ease; }
.flip-card-inner.is-flipped { transform: rotateY(180deg); }
.flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); padding: 3px; box-sizing: border-box; }
.flip-card-back { background-size: cover; background-position: center; background-clip: padding-box; background-origin: content-box; background-color: #fff; }
.flip-card-front { transform: rotateY(180deg); overflow: hidden; background: #fff; }
.flip-card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.spread-hint { text-align: center; font-size: 13px; color: #999; margin: 4px 0 8px; }
.fan-wrap { width: 100%; overflow: hidden; background: var(--primary-light); border-radius: 10px; margin-bottom: 8px; }
.fan-canvas { width: 100%; height: 260px; display: block; touch-action: pan-y; background: transparent; }
.result-cards { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
.leno-result-card { flex: 1; min-width: 80px; max-width: 130px; text-align: center; }
.leno-card-img-wrap { width: 70px; height: 105px; border-radius: 5px; overflow: hidden; border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin: 0 auto 5px; padding: 3px; background: #fff; box-sizing: border-box; }
.leno-card-img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: default; user-select: none; }
.leno-nature { font-size: 11px; color: var(--primary); margin-bottom: 2px; }
.leno-name { font-size: 12px; font-weight: bold; color: #444; }
.result-detail { background: #F9F9FB; border: 1px solid #EBEBEB; border-radius: 8px; padding: 14px; margin-top: 10px; text-align: center; }
.detail-title { font-size: 15px; font-weight: bold; color: var(--primary); margin-bottom: 5px; }
.detail-meaning { font-size: 13px; color: #555; line-height: 1.7; margin-bottom: 3px; }
.detail-ext { font-size: 12px; color: #888; line-height: 1.6; }
.interp-box { background: #F5F5F7; border-radius: 8px; padding: 12px; margin-top: 8px; }
.interp-text { font-size: 12px; color: #555; line-height: 1.9; white-space: pre-wrap; }
@media (min-width: 768px) {
  .deck-display { height: 300px; }
  .deck-card { width: 105px; height: 157px; margin-top: -78.5px; margin-left: -52.5px; }
  .shuffle-area { height: 300px; }
  .shuffle-card { width: 105px; height: 157px; margin-top: -78.5px; margin-left: -52.5px; }
  .picked-card { width: 105px; height: 157px; }
  .picked-card-empty { width: 105px; height: 157px; font-size: 22px; }
  .flip-card { width: 105px; height: 157px; }
  .leno-card-img-wrap { width: 105px; height: 157px; }
  .fan-canvas { height: 380px; }
}
@media (min-width: 1200px) {
  .deck-display { height: 380px; }
  .deck-card { width: 130px; height: 195px; margin-top: -97.5px; margin-left: -65px; }
  .shuffle-area { height: 380px; }
  .shuffle-card { width: 130px; height: 195px; margin-top: -97.5px; margin-left: -65px; }
  .picked-card { width: 130px; height: 195px; }
  .picked-card-empty { width: 130px; height: 195px; font-size: 28px; }
  .flip-card { width: 130px; height: 195px; }
  .leno-card-img-wrap { width: 130px; height: 195px; }
  .fan-canvas { height: 480px; }
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
