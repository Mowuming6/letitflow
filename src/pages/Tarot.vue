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
            <span class="help-popup-content">塔罗是"tarot"的音译，源自古文"TARO"，意为不停转动的轮子，是西方古老的占卜工具，被称为大自然的奥秘库。塔罗牌由78张牌组成，分别是22张大阿尔卡纳牌和56张小阿尔卡纳牌。塔罗占卜通过刺激灵性思维的模式，完成与高我的对话，从而对人、事、物进行预测和提供建议。
三牌阵——
时间流：过去-现在-未来；
圣三角：原因-现状-结果；发展-阻碍-建议；
二选一：选项A-提问者态度-选项B
身心灵：身体-心理-精神
其他...

如何使用：
1.选择安静的环境，保持心神专一，默念想要询问的问题。问题要具体明确，时间范围建议在3个月至1年以内，避免长期预测。
2.选择单牌或三牌阵，根据直觉抽出牌。
3.【手势】：【握拳✊】，开始洗牌；【左右挥手掌✋】即可洗牌；选牌界面，【左右挥手掌✋】可左右滑动牌区，伸出【食指☝️】可在当前牌区选牌，食指在某牌上停留超过3秒即可选中该牌。【握拳✊】触发重新占卜。
4.根据牌或牌组解读，获得答案。

注意事项：不问健康生死、黄赌毒、他人隐私、具体数字时间类问题；同一个问题建议隔7天再问，反复追问会让信息混乱；尽量避开深夜11点到凌晨3点能量活跃期间；别把结果当"圣旨"，塔罗是给你启示而非替你做决定。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">塔罗占卜</div>
      <div class="page-subtitle">塔罗牌中意，行止在本心</div>

      <!-- Input always visible -->
      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />

      <!-- Phase: choose -->
      <template v-if="phase === 'choose'">
        <div class="draw-count-row">
          <div class="draw-btn" :class="{'draw-on': drawCount===1}" @click="drawCount=1">抽1张</div>
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
                  <img :src="r.img" class="flip-card-img" :style="r.reversed ? 'transform:rotate(180deg)' : ''" @error="e=>e.target.style.display='none'" />
                </div>
              </div>
            </div>
            <div class="tarot-orient" style="margin-top:5px">{{ r.reversed ? '逆位' : '正位' }}</div>
            <div class="tarot-name">{{ r.name }}</div>
          </div>
        </div>
      </template>

      <!-- Phase: result -->
      <template v-if="phase === 'result'">
        <!-- 卡牌缩略行 -->
        <div class="result-cards">
          <div v-for="(r,i) in results" :key="i" class="tarot-result-card">
            <div class="tarot-card-img-wrap" :style="r.reversed?'transform:rotate(180deg)':''">
              <img :src="r.img" class="tarot-card-img" @error="e=>e.target.style.display='none'" />
            </div>
            <div class="tarot-orient">{{ r.reversed ? '逆位' : '正位' }}</div>
            <div class="tarot-name">{{ r.name }}</div>
          </div>
        </div>
        <!-- 按钮 -->
        <button class="btn-gold" @click="reset" style="margin-top:12px">再次占卜</button>
        <!-- 详情列表 -->
        <div v-for="(r,i) in results" :key="'d'+i" class="result-detail">
          <div class="detail-title">{{ r.name }}・{{ r.reversed ? '逆位' : '正位' }}</div>
          <div class="detail-meaning">{{ r.meaning }}</div>
        </div>
      </template>
      <AiDialogue pageType="tarot" :question="question" :resultData="getTarotResultData()" :hasResult="phase === 'result'" />
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
const fanCanvasRef = ref(null), fanWrapRef = ref(null)
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
const aiInterpretation = ref('')
const deckDisplay = ref(Array.from({length:7},(_,i)=>({rot:(Math.random()-0.5)*10,ty:-i*2})))

const TAROT_KEYWORDS = [
  ['新开始 · 冒险 · 自由 · 无限可能','盲目 · 鲁莽 · 逃避 · 不负责任'],['创造力 · 显化 · 行动力 · 掌控力','拖延 · 能力不足 · 欺骗 · 浪费资源'],['直觉 · 潜意识 · 智慧 · 灵性','忽略直觉 · 迷茫 · 表里不一'],['丰盛 · 孕育 · 滋养 · 物质富足','匮乏 · 过度放纵 · 控制欲 · 停滞'],['权威 · 秩序 · 稳定 · 领导力 · 自律','专制 · 固执 · 失控 · 缺乏规划'],['传统 · 信仰 · 导师 · 规则 · 教育','叛逆 · 教条 · 伪善 · 拒绝帮助'],['爱情 · 选择 · 契合 · 合作','分手 · 抉择困难 · 背叛 · 沟通障碍'],['胜利 · 意志 · 掌控 · 突破 · 勇往直前','失控 · 挫败 · 方向迷失 · 内耗'],['勇气 · 耐心 · 内在力量 · 克制','软弱 · 恐惧 · 失控 · 缺乏耐心'],['内省 · 孤独 · 智慧 · 反思','孤立 · 逃避 · 固执 · 拒绝沟通'],['转折 · 机遇 · 好运 · 循环','厄运 · 失控 · 抗拒变化 · 错失机会'],['公平 · 因果 · 真相 · 责任 · 平衡','不公 · 逃避责任 · 偏见 · 失衡'],['牺牲 · 换位思考 · 暂停 · 新视角','拖延 · 固执 · 不愿牺牲 · 逃避反思'],['结束 · 重生 · 彻底转变 · 放手','抗拒改变 · 停滞 · 重复旧模式'],['平衡 · 调和 · 耐心 · 灵性成长','失衡 · 极端 · 急躁 · 缺乏协调'],['束缚 · 欲望 · 沉迷 · 物质主义','解脱 · 自由 · 觉醒 · 摆脱控制'],['剧变 · 崩塌 · 真相 · 解放','逃避危机 · 拖延 · 虚假稳定'],['希望 · 疗愈 · 灵感 · 平静','绝望 · 迷茫 · 失去信仰 · 自我怀疑'],['潜意识 · 幻觉 · 恐惧 · 直觉','看清真相 · 克服恐惧 · 清晰'],['成功 · 喜悦 · 活力 · 光明 · 幸福','低潮 · 自负 · 失去活力 · 隐藏问题'],['觉醒 · 重生 · 反思 · 新机会','自我否定 · 拖延 · 逃避改变'],['完成 · 成功 · 整合','未完成 · 停滞 · 局限 · 遗憾'],
  ['新计划 · 行动力 · 灵感','犹豫 · 行动力不足 · 灵感枯竭'],['规划 · 选择 · 远见','纠结 · 短视 · 缺乏规划'],['展望 · 合作 · 进展','局限 · 合作破裂 · 停滞'],['庆祝 · 稳定 · 团聚','纷争 · 不稳定 · 分离'],['竞争 · 冲突 · 分歧','妥协 · 和解 · 避免内耗'],['胜利 · 认可 · 自信','失败 · 自卑 · 不被认可'],['坚持 · 勇气 · 防御','退缩 · 放弃 · 脆弱'],['快速 · 消息 · 进展','迟缓 · 消息受阻 · 停滞'],['警惕 · 坚持 · 防御','松懈 · 疲惫 · 放弃警惕'],['负担 · 压力 · 责任','减负 · 放下 · 轻松前行'],['新消息 · 热情 · 好奇','消息滞后 · 冷漠 · 冲动误事'],['行动 · 冒险 · 勇往直前','冲动 · 鲁莽 · 半途而废'],['自信 · 热情 · 领导力','自卑 · 冷漠 · 缺乏领导力'],['权威 · 决断 · 领导力','专制 · 优柔寡断 · 失控'],
  ['新情感 · 爱 · 喜悦','情感匮乏 · 冷漠 · 喜悦缺失'],['和谐 · 合作 · 爱情联结','矛盾 · 对立 · 情感破裂'],['庆祝 · 友情 · 团聚','纷争 · 孤独 · 分离'],['不满 · 内省 · 冷漠','满足 · 积极 · 主动接纳'],['失落 · 悲伤 · 遗憾','放下 · 释怀 · 走出悲伤'],['怀旧 · 童真 · 治愈','沉溺过去 · 无法治愈'],['幻想 · 选择 · 迷茫','清醒 · 坚定 · 脚踏实地'],['离开 · 追寻 · 放下','留恋 · 逃避 · 不愿放下'],['满足 · 愿望达成 · 幸福','不满 · 愿望落空 · 痛苦'],['家庭幸福 · 情感富足 · 圆满','家庭纷争 · 情感匮乏 · 遗憾'],['新情感 · 温柔 · 浪漫','情感冷漠 · 冲动 · 不成熟'],['浪漫 · 温柔 · 情感表达','冷漠 · 敷衍 · 情感压抑'],['慈悲 · 直觉 · 疗愈','冷漠 · 直觉失灵 · 自私'],['成熟 · 包容 · 情感智慧','幼稚 · 狭隘 · 情感失控'],
  ['真相 · 决断 · 新思维','谎言 · 犹豫 · 思维僵化'],['僵局 · 逃避 · 两难','突破 · 面对 · 果断抉择'],['心碎 · 悲伤 · 背叛','疗愈 · 释怀 · 重建信任'],['休息 · 疗愈 · 暂停','忙碌 · 透支 · 不愿休息'],['冲突 · 胜利 · 代价','和解 · 妥协 · 避免代价'],['过渡 · 疗愈 · 脱离困境','停滞 · 深陷困境 · 无法疗愈'],['欺骗 · 策略 · 秘密','真诚 · 坦荡 · 放弃阴谋'],['束缚 · 自我限制 · 恐惧','解脱 · 突破 · 克服恐惧'],['焦虑 · 噩梦 · 精神痛苦','平静 · 安心 · 摆脱焦虑'],['结束 · 失败 · 绝望','新生 · 希望 · 重新开始'],['消息 · 警觉 · 敏锐','消息滞后 · 迟钝 · 疏忽'],['快速 · 决断 · 直言','迟缓 · 优柔寡断 · 沉默'],['智慧 · 独立 · 冷静','愚蠢 · 依赖 · 冲动'],['理性 · 公正 · 决断','感性 · 不公 · 优柔寡断'],
  ['新机会 · 物质 · 稳定','错失机会 · 物质匮乏 · 不稳定'],['平衡 · 灵活 · 选择','失衡 · 固执 · 无法抉择'],['合作 · 技能 · 进展','合作失败 · 技能不足 · 停滞'],['稳定 · 保守 · 掌控','挥霍 · 冒险 · 失控'],['贫穷 · 困境 · 孤立','富足 · 顺利 · 联结'],['给予 · 接受 · 平衡','吝啬 · 贪婪 · 失衡'],['等待 · 收获 · 反思','急躁 · 错失收获 · 盲目行动'],['努力 · 专注 · 勤奋','懒惰 · 分心 · 敷衍'],['富足 · 独立 · 享受成果','匮乏 · 依赖 · 无法享受'],['财富 · 家庭 · 圆满','贫穷 · 家庭不和 · 遗憾'],['学习 · 务实 · 可靠','懒惰 · 虚浮 · 不可靠'],['务实 · 努力 · 可靠','虚浮 · 懒惰 · 不可靠'],['富足 · 滋养 · 稳定','匮乏 · 冷漠 · 不稳定'],['成功 · 财富 · 权威','失败 · 贫穷 · 无权威'],
]
const MAJOR=[{name:'愚者',symbol:'0',color:'#f5c518'},{name:'魔术师',symbol:'I',color:'#f5c518'},{name:'女祭司',symbol:'II',color:'#f5c518'},{name:'皇后',symbol:'III',color:'#f5c518'},{name:'皇帝',symbol:'IV',color:'#f5c518'},{name:'教皇',symbol:'V',color:'#f5c518'},{name:'恋人',symbol:'VI',color:'#f5c518'},{name:'战车',symbol:'VII',color:'#f5c518'},{name:'力量',symbol:'VIII',color:'#f5c518'},{name:'隐士',symbol:'IX',color:'#f5c518'},{name:'命运之轮',symbol:'X',color:'#f5c518'},{name:'正义',symbol:'XI',color:'#f5c518'},{name:'倒吊人',symbol:'XII',color:'#f5c518'},{name:'死神',symbol:'XIII',color:'#f5c518'},{name:'节制',symbol:'XIV',color:'#f5c518'},{name:'恶魔',symbol:'XV',color:'#f5c518'},{name:'塔',symbol:'XVI',color:'#f5c518'},{name:'星星',symbol:'XVII',color:'#f5c518'},{name:'月亮',symbol:'XVIII',color:'#f5c518'},{name:'太阳',symbol:'XIX',color:'#f5c518'},{name:'审判',symbol:'XX',color:'#f5c518'},{name:'世界',symbol:'XXI',color:'#f5c518'}]
const SUITS=[{suit:'权杖',color:'#f97316'},{suit:'圣杯',color:'#60a5fa'},{suit:'宝剑',color:'#8b5cf6'},{suit:'星币',color:'#10b981'}]
const RANKS=['一','二','三','四','五','六','七','八','九','十','侍从','骑士','王后','国王']
const SUIT_PREFIX=['w','c','s','p']
const TAROT_CARDS=[]
MAJOR.forEach((c,mi)=>TAROT_CARDS.push({name:c.name,symbol:c.symbol,color:c.color,type:'major',img:`./tarotcard/${mi}.jpeg`,origIdx:mi}))
SUITS.forEach((s,si)=>RANKS.forEach((rank,ri)=>TAROT_CARDS.push({name:s.suit+rank,symbol:rank,color:s.color,type:'minor',img:`./tarotcard/${SUIT_PREFIX[si]}${ri+1}.jpeg`,origIdx:22+si*14+ri})))

let shuffledDeck=[], shuffleTouchX=0, shuffleDir=0, shuffleGestureCounted=false
let shuffleCompleteTimer = null
let fanCtx=null, fanW=1, fanH=1, fanRect=null, fanOffset=0, fanVelocity=0, fanStartX=0, fanPrevX=0, fanTimerId=null
let pickedIndices=[], liftProgress={}, cardBackImg=null, dpr=2, fanRafPending=false, fanVibStep=0
function getCardSize(){const w=window.innerWidth;if(w>=1200)return{w:130,h:195};if(w>=768)return{w:105,h:157};return{w:70,h:105}}
let themeColor='#D4A853', themeGlow='rgba(212,168,83,0.75)', themeBorder='rgba(212,168,83,0.5)'

function initTheme(){
  const t=THEMES[store.themeKey||'jin'],r=parseInt(t.primary.slice(1,3),16),g=parseInt(t.primary.slice(3,5),16),b=parseInt(t.primary.slice(5,7),16)
  themeColor=t.primary;themeGlow=`rgba(${r},${g},${b},0.75)`;themeBorder=`rgba(${r},${g},${b},0.5)`
}
onMounted(()=>initTheme())

const cardBackSrc = computed(()=>store.getThemeCardBack())

function startShuffle(){
  if (shuffleCompleteTimer) {
    clearTimeout(shuffleCompleteTimer)
    shuffleCompleteTimer = null
  }
  shuffledDeck=[...TAROT_CARDS].sort(()=>Math.random()-0.5)
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
    shuffleCount.value = Math.min(shuffleCount.value + 1, 5)
    if (shuffleCount.value >= 3 && !shuffleCompleteTimer) {
      shuffleCompleteTimer = setTimeout(() => {
        shuffleCompleteTimer = null
        showSpread()
      }, 400)
    }
  }
  setTimeout(()=>{shuffleCards.value=shuffleCards.value.map((_,i)=>({x:(Math.random()-0.5)*15,y:(Math.random()-0.5)*10,rot:(Math.random()-0.5)*6,z:i}))},200)
}
function onShuffleEnd(){
  shuffleDir=0
  shuffleGestureCounted=false
  if (shuffleCount.value >= 3 && !shuffleCompleteTimer) {
    shuffleCompleteTimer = setTimeout(() => {
      shuffleCompleteTimer = null
      showSpread()
    }, 400)
  }
}

function scrollFanIntoView() {
  requestAnimationFrame(() => {
    if (!fanWrapRef.value || typeof fanWrapRef.value.scrollIntoView !== 'function') return

    // If users can already see the fan area (common on mobile), don't auto-scroll.
    const r = fanWrapRef.value.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight || 0
    const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0)
    const ratio = (visibleH > 0 && r.height > 0) ? (visibleH / r.height) : 0
    if (ratio >= 0.85) return

    fanWrapRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function showSpread(){
  if(!shuffledDeck.length)shuffledDeck=[...TAROT_CARDS].sort(()=>Math.random()-0.5)
  pickedIndices=[];pickedList.value=[];pendingResults.value=[];flipState.value=[];liftProgress={};fanOffset=0;fanVelocity=0;fanCtx=null
  pickedCount.value=0;phase.value='spread'
  setTimeout(()=>{
    initFanCanvas()
    scrollFanIntoView()
  },120)
}
function initFanCanvas(){
  initTheme()
  const cv=fanCanvasRef.value;if(!cv)return
  const rect=cv.getBoundingClientRect();dpr=window.devicePixelRatio||2
  cv.width=rect.width*dpr;cv.height=rect.height*dpr
  fanCtx=cv.getContext('2d');fanCtx.scale(dpr,dpr)
  fanW=rect.width;fanH=rect.height;fanRect=rect
  const img=new Image();img.crossOrigin='anonymous'
  img.onload=()=>{cardBackImg=img;drawFan()}
  img.onerror=()=>drawFan()
  img.src=cardBackSrc.value;drawFan()
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
  const total = TAROT_CARDS.length, cx = fanW / 2, cy = fanH + 400, R = 500, span = 3.4, { w: cw, h: ch } = getCardSize()
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
      fanOffset = Math.max(-1.7, Math.min(1.7, fanOffset))
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
    fanOffset += direction * 0.12
    fanOffset = Math.max(-1.7, Math.min(1.7, fanOffset))
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
  const total=TAROT_CARDS.length,cx=fanW/2,cy=fanH+400,R=500,span=3.4,{w:cw,h:ch}=getCardSize(),cr=5
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
  fanOffset-=dx*0.0038;fanOffset=Math.max(-1.7,Math.min(1.7,fanOffset))
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
function doFanMomentum(){
  let vel=fanVelocity
  function step(){vel*=0.92;fanOffset-=vel*0.0038;fanOffset=Math.max(-1.7,Math.min(1.7,fanOffset));drawFan();if(Math.abs(vel)>0.25)fanTimerId=setTimeout(step,16)}
  step()
}
function trySelectFanCard(clientX,clientY){
  const rect=fanCanvasRef.value?fanCanvasRef.value.getBoundingClientRect():fanRect;if(!rect)return
  const lx=clientX-rect.left,ly=clientY-rect.top
  const total=TAROT_CARDS.length,cx=fanW/2,cy=fanH+400,R=500,span=3.4,{w:cw,h:ch}=getCardSize()
  let bestIdx=-1
  for(let i=0;i<total;i++){const angle=-span/2+i*(span/(total-1))-fanOffset;if(Math.abs(angle)>span/2+0.1)continue;const x=cx+Math.sin(angle)*R,y=cy-Math.cos(angle)*R,dx=lx-x,dy=ly-y,cosA=Math.cos(angle),sinA=Math.sin(angle),lc_x=dx*cosA+dy*sinA,lc_y=-dx*sinA+dy*cosA;if(Math.abs(lc_x)<=cw/2+4&&Math.abs(lc_y)<=ch/2+4)bestIdx=i}
  if(bestIdx>=0)pickFanCard(bestIdx)
}
function pickFanCard(idx){
  if(pickedIndices.includes(idx))return;if(pickedIndices.length>=drawCount.value)return
  play('cardDraw');try{navigator.vibrate&&navigator.vibrate(45)}catch(e){};pickedIndices=[...pickedIndices,idx];pickedList.value=[...pickedIndices];liftProgress[idx]=0;animateLift(idx)
  pickedCount.value=pickedIndices.length
  if(pickedCount.value>=drawCount.value)setTimeout(()=>revealCards(),650)
}
function animateLift(idx){const TARGET=getCardSize().h*0.3,FRAMES=8;let frame=0;function step(){frame++;const t=frame/FRAMES;liftProgress[idx]=TARGET*(1-(1-t)*(1-t));drawFan();if(frame<FRAMES)setTimeout(step,16)};step()}
function revealCards(){
  const res=pickedIndices.map((cardIdx)=>{const card=shuffledDeck[cardIdx]||TAROT_CARDS[cardIdx],reversed=Math.random()<0.3,kw=TAROT_KEYWORDS[card.origIdx],meaning=kw?kw[reversed?1:0]:'';return{name:card.name,symbol:card.symbol,color:card.color,meaning,reversed,img:card.img}})
  pendingResults.value=res;flipState.value=res.map(()=>false);phase.value='flipping'
  res.forEach((_,i)=>{setTimeout(()=>{play('cardDraw');const s=[...flipState.value];s[i]=true;flipState.value=s},i*520+100)})
  setTimeout(()=>{
    let aiInterp=''
    if(res.length===3){const[past,present,future]=res;aiInterp=`过去：${past.name}${past.reversed?'(逆位)':''}，${past.meaning}\n现在：${present.name}${present.reversed?'(逆位)':''}，${present.meaning}\n未来：${future.name}${future.reversed?'(逆位)':''}，${future.meaning}`}
    play('cardReveal');results.value=res;aiInterpretation.value=aiInterp;phase.value='result'
    const desc=res.map(r=>r.name+'·'+(r.reversed?'逆位':'正位')).join(' - ')
    store.saveHistory('🃏 塔罗占卜',desc,question.value || '（用户未输入问题）')
  },res.length*520+900)
}
function reset(){if(fanTimerId){clearTimeout(fanTimerId);fanTimerId=null};fanCtx=null;pickedIndices=[];pickedList.value=[];pendingResults.value=[];flipState.value=[];liftProgress={};fanOffset=0;results.value=[];pickedCount.value=0;shuffleCount.value=0;aiInterpretation.value='';deckDisplay.value=Array.from({length:7},(_,i)=>({rot:(Math.random()-0.5)*10,ty:-i*2}));phase.value='choose'}
let fanMouseDown=false
function onFanMouseDown(e){fanMouseDown=true;onFanTouchStart({touches:[{clientX:e.clientX}]})}
function onFanMouseMove(e){if(!fanMouseDown)return;onFanTouchMove({touches:[{clientX:e.clientX}]})}
function onFanMouseUp(e){if(!fanMouseDown)return;fanMouseDown=false;onFanTouchEnd({changedTouches:[{clientX:e.clientX,clientY:e.clientY}]})}
let shuffleMouseDown=false
function onShuffleMouseDown(e){shuffleMouseDown=true;onShuffleStart({touches:[{clientX:e.clientX}]})}
function onShuffleMouseMove(e){if(!shuffleMouseDown)return;onShuffleMove({touches:[{clientX:e.clientX}]})}
function onShuffleMouseUp(){if(!shuffleMouseDown)return;shuffleMouseDown=false;onShuffleEnd()}

function getTarotResultData() {
  return results.value.map(r => ({
    name: r.name,
    orientation: r.reversed ? '逆位' : '正位',
    meaning: r.meaning
  }))
}
</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }
.draw-count-row { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
.draw-btn { padding: 8px 20px; border-radius: 15px; font-size: 14px; color: #999; background: #F5F5F7; border: 1px solid #EBEBEB; cursor: pointer; }
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
.fan-canvas { width: 100%; height: 250px; display: block; touch-action: pan-y; background: transparent; }
.result-cards { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
.tarot-result-card { flex: 1; min-width: 80px; max-width: 130px; text-align: center; }
.position-label { font-size: 11px; color: #999; margin-bottom: 4px; }
.tarot-card-img-wrap { width: 70px; height: 105px; border-radius: 5px; overflow: hidden; border: 1.5px solid var(--primary-shadow, rgba(212,168,83,0.25)); box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin: 0 auto 5px; padding: 3px; background: #fff; box-sizing: border-box; }
.tarot-card-img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: default; user-select: none; }
.tarot-orient { font-size: 11px; color: var(--primary); margin-bottom: 2px; }
.tarot-name { font-size: 12px; font-weight: bold; color: #444; }
.result-detail { background: #F9F9FB; border: 1px solid #EBEBEB; border-radius: 8px; padding: 14px; margin-top: 10px; text-align: center; }
.detail-title { font-size: 15px; font-weight: bold; color: var(--primary); margin-bottom: 5px; }
.detail-meaning { font-size: 13px; color: #555; line-height: 1.7; }
@media (min-width: 768px) {
  .deck-display { height: 300px; }
  .deck-card { width: 105px; height: 157px; margin-top: -78.5px; margin-left: -52.5px; }
  .shuffle-area { height: 300px; }
  .shuffle-card { width: 105px; height: 157px; margin-top: -78.5px; margin-left: -52.5px; }
  .picked-card { width: 105px; height: 157px; }
  .picked-card-empty { width: 105px; height: 157px; font-size: 22px; }
  .flip-card { width: 105px; height: 157px; }
  .tarot-card-img-wrap { width: 105px; height: 157px; }
  .fan-canvas { height: 300px; }
}
@media (min-width: 1200px) {
  .deck-display { height: 380px; }
  .deck-card { width: 130px; height: 195px; margin-top: -97.5px; margin-left: -65px; }
  .shuffle-area { height: 380px; }
  .shuffle-card { width: 130px; height: 195px; margin-top: -97.5px; margin-left: -65px; }
  .picked-card { width: 130px; height: 195px; }
  .picked-card-empty { width: 130px; height: 195px; font-size: 28px; }
  .flip-card { width: 130px; height: 195px; }
  .tarot-card-img-wrap { width: 130px; height: 195px; }
  .fan-canvas { height: 400px; }
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
