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
            <span class="help-popup-content">六爻金钱卦，又称金钱卜、铜钱摇卦法，是源于《周易》八卦的一种算卦方式，属焦京易学派体系，传统以三枚外圆内方铜钱为工具，后世亦可用硬币替代。其法以铜钱正反面定阴阳，每掷三次铜钱得四象组合，按"阳卦多阴"原则记爻，六次成卦后依据动爻断吉凶，原为蓍草占卦的简便替代方法。

如何使用：
1.在占卜金钱卦时要专心一致，摒除杂念，静默一分钟，心念集中于你所测之事，如婚姻、事业、运途、流年、工作、财运等。
2.默念自己姓名，出生时辰，年龄，现在居住地址。
3.点击按钮或使用手指掷出金钱卦六次，查看结果。
4.【手势】：开启手势后，在镜头前【上下挥动手掌】，即可抛动铜钱。【握拳】可重新开始。

注意：占卜金钱卦时，同一事件短时间内第一次卜卦最准，多卜无益。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">六爻金钱卦</div>
      <div class="page-subtitle">摇钱排六爻，五行断吉凶</div>
      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />
      <div class="stage-area"
        @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
        @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
        style="cursor:grab">
        <canvas ref="canvasRef" class="stage-canvas"></canvas>
      </div>
      <button class="btn-gold" @click="throwCoins" :disabled="throwing">
        {{ throwing ? '铜钱飞旋中...' : yaoLines.length > 0 && yaoLines.length < 6 ? `掷第${yaoLines.length + 1}爻` : yaoLines.length >= 6 ? '重新起卦' : '掷铜钱' }}
      </button>
      <div v-if="tipText" class="hint-text"><span class="hint-icon">💡</span><span>{{ tipText }}</span></div>

      <div v-if="yaoLines.length > 0" class="yao-progress">
        <div v-for="(line, i) in [...yaoLines].reverse()" :key="i" class="yao-row" :class="{'yao-changing': line.changing}">
          <div class="yao-coins">
            <span v-for="(c, ci) in line.coins" :key="ci" class="yao-dot" :class="c ? 'dot-yang' : 'dot-yin'">{{ c ? '●' : '○' }}</span>
          </div>
          <div class="yao-line-wrap">
            <template v-if="line.yang">
              <div class="yang-bar"></div>
            </template>
            <template v-else>
              <div class="yin-bar-l"></div>
              <div class="yin-gap"></div>
              <div class="yin-bar-r"></div>
            </template>
          </div>
          <span class="yao-change-mark">{{ line.changing ? '×' : '' }}</span>
          <span class="yao-label">{{ line.label }}</span>
        </div>
      </div>

      <template v-if="showResult">
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
      <AiDialogue pageType="liuyao" :question="question" :resultData="getLiuyaoResultData()" :hasResult="showResult" />
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
import GUA_DATA from './64gua_module.js'

const themeStyle = computed(() => store.getThemeStyle())
const canvasRef = ref(null)
const showHelpPopup = ref(false)
const showResult = ref(false)
const throwing = ref(false)
const tipText = ref('向上滑动 / 点击按钮抛掷铜钱')
const question = ref('')
const yaoLines = ref([])
const activeTab = ref(0), changedActiveTab = ref(0)
const tabContents = ref([]), changedTabContents = ref([])
const guaDisplayTitle = ref(''), guaPoem = ref(''), guaJiyi = ref('')
const changedGuaDisplayTitle = ref(''), changedGuaPoem = ref(''), changedGuaJiyi = ref('')
const hasChanging = ref(false)

const GUA_MAP = {}
GUA_DATA.forEach(g => { GUA_MAP[g['卦象']] = g })
const BAGUA = ['坤','震','坎','兑','艮','离','巽','乾']

const VERT_SRC = `attribute vec3 aPos;attribute vec3 aNorm;attribute vec2 aUV;attribute float aFaceType;uniform mat4 uMVP;uniform mat3 uNM;varying vec3 vN;varying vec2 vUV;varying float vFT;void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNM*aNorm);vUV=aUV;vFT=aFaceType;}`
const FRAG_SRC = `precision highp float;varying vec3 vN;varying vec2 vUV;varying float vFT;uniform vec3 uLight;uniform vec3 uLight2;uniform sampler2D uYinTex;uniform sampler2D uYangTex;void main(){vec3 n=normalize(vN);vec3 ld=normalize(uLight);vec3 ld2=normalize(uLight2);vec3 viewDir=normalize(vec3(0.0,0.7,0.7));vec3 h=normalize(ld+viewDir);vec3 h2=normalize(ld2+viewDir);float diff=max(dot(n,ld),0.0);float diff2=max(dot(n,ld2),0.0)*0.45;float spec=pow(max(dot(n,h),0.0),80.0)*0.35;float spec2=pow(max(dot(n,h2),0.0),40.0)*0.20;vec3 col=vec3(0.0);if(vFT<0.5){vec3 sideBase=vec3(0.95,0.70,0.20);float litS=0.30+diff*0.60+diff2*0.60;col=sideBase*litS+vec3(1.0,0.9,0.45)*(spec+spec2);}else if(vFT<1.5){vec4 s=texture2D(uYinTex,vUV);vec3 base=mix(vec3(0.96,0.78,0.28),s.rgb,s.a);float lit=0.42+diff*0.58+diff2;col=base*lit+vec3(1.0)*(spec*0.25+spec2*0.20);}else{vec4 s=texture2D(uYangTex,vUV);vec3 base=mix(vec3(0.96,0.78,0.28),s.rgb,s.a);float lit=0.42+diff*0.58+diff2;col=base*lit+vec3(1.0)*(spec*0.25+spec2*0.20);}gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}`

function mat4identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) }
function mat4mul(A,B){ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C }
function mat4rotY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]) }
function mat4rotX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]) }
function mat4trans(x,y,z){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]) }
function mat4scale(s){ return new Float32Array([s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1]) }
function mat4perspective(fovy,asp,n,f){ const ft=1/Math.tan(fovy*0.5),nf=1/(n-f); return new Float32Array([ft/asp,0,0,0,0,ft,0,0,0,0,(n+f)*nf,-1,0,0,2*f*n*nf,0]) }
function mat3fromMat4(m){ return new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]) }

function buildCoinMesh(R,halfH,segs){
  const pos=[],nor=[],uv=[],ft=[],idx=[];let base=0
  pos.push(0,halfH,0);nor.push(0,1,0);uv.push(0.5,0.5);ft.push(1)
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,x=Math.cos(a)*R,z=Math.sin(a)*R;pos.push(x,halfH,z);nor.push(0,1,0);uv.push(0.5+Math.cos(a)*0.5,0.5+Math.sin(a)*0.5);ft.push(1)}
  for(let i=0;i<segs;i++) idx.push(base,base+1+i,base+2+i);base+=segs+2
  pos.push(0,-halfH,0);nor.push(0,-1,0);uv.push(0.5,0.5);ft.push(2)
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,x=Math.cos(a)*R,z=Math.sin(a)*R;pos.push(x,-halfH,z);nor.push(0,-1,0);uv.push(0.5+Math.cos(a)*0.5,0.5-Math.sin(a)*0.5);ft.push(2)}
  for(let i=0;i<segs;i++) idx.push(base,base+1+i,base+2+i);base+=segs+2
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,x=Math.cos(a)*R,z=Math.sin(a)*R;pos.push(x,halfH,z);nor.push(Math.cos(a),0,Math.sin(a));uv.push(i/segs,1);ft.push(0);pos.push(x,-halfH,z);nor.push(Math.cos(a),0,Math.sin(a));uv.push(i/segs,0);ft.push(0)}
  for(let i=0;i<segs;i++){const b=base+i*2;idx.push(b,b+1,b+2,b+1,b+3,b+2)}
  return{pos:new Float32Array(pos),nor:new Float32Array(nor),uv:new Float32Array(uv),ft:new Float32Array(ft),idx:new Uint16Array(idx),cnt:idx.length}
}

let gl=null,prog=null,buf=null,yinTex=null,yangTex=null,raf=null,prevTime=null,idleT=0
let W=1,H=1
const coins=[
  {ox:-3.5,ax:0.12,ay:0.2,vax:0,vay:0,posY:0,velY:0,bounces:0,isYang:true,_done:false},
  {ox:0,ax:0.12,ay:0.8,vax:0,vay:0,posY:0,velY:0,bounces:0,isYang:false,_done:false},
  {ox:3.5,ax:0.12,ay:1.5,vax:0,vay:0,posY:0,velY:0,bounces:0,isYang:true,_done:false},
]
let glPhase='idle'
let tsStart=null,tsLast=null,tsTime=0

function loadTex(glCtx,src,flip){
  return new Promise(resolve=>{
    const tex=glCtx.createTexture();glCtx.bindTexture(glCtx.TEXTURE_2D,tex)
    glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_MIN_FILTER,glCtx.LINEAR)
    glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_MAG_FILTER,glCtx.LINEAR)
    glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_WRAP_S,glCtx.CLAMP_TO_EDGE)
    glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_WRAP_T,glCtx.CLAMP_TO_EDGE)
    glCtx.texImage2D(glCtx.TEXTURE_2D,0,glCtx.RGBA,1,1,0,glCtx.RGBA,glCtx.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]))
    const img=new Image();img.crossOrigin='anonymous'
    img.onload=()=>{glCtx.bindTexture(glCtx.TEXTURE_2D,tex);if(flip)try{glCtx.pixelStorei(glCtx.UNPACK_FLIP_Y_WEBGL,1)}catch(e){}; glCtx.texImage2D(glCtx.TEXTURE_2D,0,glCtx.RGBA,glCtx.RGBA,glCtx.UNSIGNED_BYTE,img);resolve(tex)}
    img.onerror=()=>resolve(tex);img.src=src
  })
}

function handleGesture(e) {
  if (e.detail.type === 'swipe-up') {
    if (yaoLines.value.length >= 6) return
    throwCoins()
  }
}

function handleGestureClick(e) {
  if (yaoLines.value.length >= 6 && e.detail.state === 'fist') {
    reset()
  }
}

onMounted(async()=>{
  document.addEventListener('gesture-trigger', handleGesture)
  document.addEventListener('gesture-click', handleGestureClick)
  const cv=canvasRef.value;const rect=cv.getBoundingClientRect();const dpr=window.devicePixelRatio||2
  cv.width=rect.width*dpr;cv.height=rect.height*dpr;W=cv.width;H=cv.height
  gl=cv.getContext('webgl',{antialias:true,alpha: true,depth:true});if(!gl)return
  const mkS=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
  const vs=mkS(gl.VERTEX_SHADER,VERT_SRC),fs=mkS(gl.FRAGMENT_SHADER,FRAG_SRC)
  prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);gl.useProgram(prog)
  const mkBuf=(d,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,d,gl.STATIC_DRAW);return b}
  const geo=buildCoinMesh(1.3,0.10,40)
  buf={pos:mkBuf(geo.pos,gl.ARRAY_BUFFER),nor:mkBuf(geo.nor,gl.ARRAY_BUFFER),uv:mkBuf(geo.uv,gl.ARRAY_BUFFER),ft:mkBuf(geo.ft,gl.ARRAY_BUFFER),idx:mkBuf(geo.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:geo.cnt}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0.0, 0.0, 0.0, 0.0)
  ;[yinTex,yangTex]=await Promise.all([loadTex(gl,'./images/yin.png',true),loadTex(gl,'./images/yang.png',true)])
  function frame(ts){const dt=prevTime?Math.min((ts-prevTime)/1000,0.05):1/60;prevTime=ts;update(dt);render();raf=requestAnimationFrame(frame)}
  raf=requestAnimationFrame(frame)
})
onUnmounted(()=>{
  document.removeEventListener('gesture-trigger', handleGesture)
  document.removeEventListener('gesture-click', handleGestureClick)
  if(raf)cancelAnimationFrame(raf)
})

function render(){
  if(!gl||!prog||!buf)return
  gl.viewport(0,0,W,H);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
  const asp=W/H,P=mat4perspective(Math.PI/3.5,asp,0.1,50),V=mat4trans(0,0,-10)
  const ul=n=>gl.getUniformLocation(prog,n)
  gl.uniform3f(ul('uLight'),0.5,1.0,0.8);gl.uniform3f(ul('uLight2'),-0.4,0.3,0.6)
  if(yinTex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,yinTex);gl.uniform1i(ul('uYinTex'),0)}
  if(yangTex){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,yangTex);gl.uniform1i(ul('uYangTex'),1)}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf.idx)
  coins.forEach(coin=>{
    let M=mat4identity();M=mat4mul(mat4scale(0.95),M);M=mat4mul(mat4rotY(coin.ay),M);M=mat4mul(mat4rotX(coin.ax),M);M=mat4mul(mat4trans(coin.ox,coin.posY,0),M)
    const MVP=mat4mul(P,mat4mul(V,M)),NM=mat3fromMat4(M)
    const ba=(name,b,sz)=>{const loc=gl.getAttribLocation(prog,name);if(loc===-1)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0)}
    ba('aPos',buf.pos,3);ba('aNorm',buf.nor,3);ba('aUV',buf.uv,2);ba('aFaceType',buf.ft,1)
    gl.uniformMatrix4fv(ul('uMVP'),false,MVP);gl.uniformMatrix3fv(ul('uNM'),false,NM)
    gl.drawElements(gl.TRIANGLES,buf.cnt,gl.UNSIGNED_SHORT,0)
  })
}
function update(dt){
  if(glPhase==='idle'){idleT+=dt;coins.forEach((c,i)=>{c.ax=Math.PI/2+Math.sin(idleT*0.7+i)*0.08;c.ay+=0.007+i*0.002;c.posY=0});return}
  if(glPhase==='done'){idleT+=dt;coins.forEach((c,i)=>{c.ay+=Math.sin(idleT*0.3+i)*0.001});return}
  let allSettled=true
  coins.forEach(c=>{
    if(c._done)return
    c.ax+=c.vax*dt;c.ay+=c.vay*dt;c.velY-=18*dt;c.posY+=c.velY*dt
    if(c.posY<=0){c.posY=0;c.velY=Math.abs(c.velY)*0.32;c.vax*=0.42;c.vay*=0.42;c.bounces++
      if(c.velY<0.8){c.vax*=0.75;c.vay*=0.75;if(Math.abs(c.vax)<0.03&&Math.abs(c.vay)<0.03){c._done=true;c.isYang=Math.random()<0.5;c.ax=c.isYang?-Math.PI/2:Math.PI/2;c.ay=(Math.random()-0.5)*0.3;c.vax=0;c.vay=0;c.posY=0}}}
    if(!c._done)allSettled=false
  })
  if(allSettled){glPhase='done';onAllDone()}
}

function onTouchStart(e){const t=e.touches[0];tsStart={x:t.clientX,y:t.clientY};tsLast={x:t.clientX,y:t.clientY};tsTime=Date.now()}
function onTouchMove(e){if(!tsLast)return;const t=e.touches[0];if(glPhase==='idle'||glPhase==='done'){coins.forEach(c=>{c.ay+=(t.clientX-tsLast.x)*0.015;c.ax+=(t.clientY-tsLast.y)*0.015})};tsLast={x:t.clientX,y:t.clientY}}
function onTouchEnd(e){if(!tsStart)return;const t=e.changedTouches[0];const dy=tsStart.y-t.clientY;const elapsed=Math.max((Date.now()-tsTime)/1000,0.03);if(dy>20&&dy/elapsed>150)doThrow();tsStart=null;tsLast=null}
let _md=false
function onMouseDown(e){_md=true;e.preventDefault();onTouchStart({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseMove(e){if(!_md)return;onTouchMove({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseUp(e){if(!_md)return;_md=false;onTouchEnd({changedTouches:[{clientX:e.clientX,clientY:e.clientY}]})}

function throwCoins(){
  if(yaoLines.value.length>=6){reset();return}
  doThrow()
}


function doThrow(){
  if(glPhase!=='idle'&&glPhase!=='done')return
  play('coinFlip')
  if(yaoLines.value.length>=6){reset();return}
  coins.forEach(c=>{c.posY=0;c.velY=7.0+Math.random()*3.0;c.ax=Math.random()*Math.PI*2;c.ay=Math.random()*Math.PI*2;c.vax=(Math.random()<0.5?1:-1)*(12+Math.random()*10);c.vay=(Math.random()-0.5)*6;c.bounces=0;c._done=false})
  glPhase='throw';throwing.value=true;showResult.value=false;tipText.value=''
}

function onAllDone(){
  play('coinLand')
  const coinStates=coins.map(c=>c.isYang)
  const yangCount=coinStates.filter(Boolean).length
  let yaoType,yaoVal
  if(yangCount===3){yaoType='yang';yaoVal=9}
  else if(yangCount===2){yaoType='yin';yaoVal=8}
  else if(yangCount===1){yaoType='yang';yaoVal=7}
  else{yaoType='yin';yaoVal=6}
  const changing=yaoVal===9||yaoVal===6
  const yaoNames={9:'老阳',8:'少阴',7:'少阳',6:'老阴'}
  const labels=['初爻','二爻','三爻','四爻','五爻','上爻']
  const lines=[...yaoLines.value]
  const idx=lines.length
  lines.push({yang:yaoType==='yang',type:yaoType,changing,yaoVal,label:`${labels[idx]}（${yaoNames[yaoVal]}）`,coins:coinStates})

  if(lines.length===6){
    const lower=lines.slice(0,3).map(l=>l.yang?1:0),upper=lines.slice(3,6).map(l=>l.yang?1:0)
    const lIdx=lower[2]*4+lower[1]*2+lower[0],uIdx=upper[2]*4+upper[1]*2+upper[0]
    const guaKey='上'+BAGUA[uIdx]+'下'+BAGUA[lIdx],guaEntry=GUA_MAP[guaKey]
    const hexName=guaEntry?guaEntry['卦全称']:(BAGUA[uIdx]+BAGUA[lIdx])
    tabContents.value=guaEntry?['事业','经商','求名','外出','婚恋','决策'].map(k=>guaEntry[k]||'暂无相关内容。'):Array(6).fill('暂无相关内容。')
    guaDisplayTitle.value=guaEntry?(guaEntry['卦全称']+' · '+guaEntry['卦吉凶等级']):hexName
    guaPoem.value=guaEntry?(guaEntry['象曰歌谣']||''):''
    guaJiyi.value=guaEntry?(guaEntry['卦释义']||''):''
    showResult.value=true
    const hasC=lines.some(l=>l.changing);hasChanging.value=hasC
    if(hasC){
      const cL=lines.map(l=>({...l,yang:l.changing?!l.yang:l.yang,type:l.changing?(l.yang?'yin':'yang'):l.type}))
      const cLower=cL.slice(0,3).map(l=>l.yang?1:0),cUpper=cL.slice(3,6).map(l=>l.yang?1:0)
      const cLIdx=cLower[2]*4+cLower[1]*2+cLower[0],cUIdx=cUpper[2]*4+cUpper[1]*2+cUpper[0]
      const cKey='上'+BAGUA[cUIdx]+'下'+BAGUA[cLIdx],cEntry=GUA_MAP[cKey]
      const cName=cEntry?cEntry['卦全称']:(BAGUA[cUIdx]+BAGUA[cLIdx])
      changedTabContents.value=cEntry?['事业','经商','求名','外出','婚恋','决策'].map(k=>cEntry[k]||'暂无相关内容。'):Array(6).fill('暂无相关内容。')
      changedGuaDisplayTitle.value=cEntry?(cEntry['卦全称']+' · '+cEntry['卦吉凶等级']):cName
      changedGuaPoem.value=cEntry?(cEntry['象曰歌谣']||''):''
      changedGuaJiyi.value=cEntry?(cEntry['卦释义']||''):''
    }
    const liuyaoMain=guaEntry?guaEntry['卦全称']:hexName
    const liuyaoChanged=hasC&&changedGuaDisplayTitle.value?changedGuaDisplayTitle.value.split(' · ')[0]:''
    store.saveHistory('☯ 六爻金钱卦',liuyaoChanged?`本卦：${liuyaoMain}→变卦：${liuyaoChanged}`:`本卦：${liuyaoMain}`,question.value || '（用户未输入问题）')
    tipText.value='卦象已成，可重新起卦'
  } else {
    tipText.value=`已摇${lines.length}爻，还需${6-lines.length}爻`
  }
  coins.forEach(c=>{c._done=false})
  yaoLines.value=lines;throwing.value=false;glPhase='done'
}

function reset(){
  yaoLines.value=[];showResult.value=false;throwing.value=false;glPhase='idle'
  guaDisplayTitle.value='';guaPoem.value='';guaJiyi.value=''
  changedGuaDisplayTitle.value='';changedGuaPoem.value='';changedGuaJiyi.value=''
  tabContents.value=[];changedTabContents.value=[];hasChanging.value=false
  tipText.value='向上滑动或点击按钮抛掷铜钱';activeTab.value=0;changedActiveTab.value=0
  coins.forEach(c=>{c._done=false})
}
function getLiuyaoResultData() {
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
</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }
.yao-progress { background: #F5F5F7; border-radius: 8px; padding: 10px 14px; margin-top: 10px; }
.yao-row { display: flex; align-items: center; gap: 6px; height: 24px; margin-bottom: 5px; }
.yao-row:last-child { margin-bottom: 0; }
.yao-coins { display: flex; gap: 3px; flex-shrink: 0; width: 46px; }
.yao-dot { font-size: 12px; line-height: 1; }
.dot-yang { color: var(--primary); }
.dot-yin { color: var(--primary); }
.yao-line-wrap { display: flex; align-items: center; flex: 1; height: 10px; }
.yang-bar { width: 100%; height: 6px; background: var(--primary); border-radius: 2px; }
.yin-bar-l,.yin-bar-r { height: 6px; background: var(--primary); border-radius: 2px; width: 44%; }
.yin-gap { flex: 1; }
.yao-change-mark { width: 16px; font-size: 12px; color: var(--primary); font-weight: bold; text-align: center; flex-shrink: 0; }
.yao-label { font-size: 11px; color: #666; width: 74px; flex-shrink: 0; text-align: right; }
.gua-changed-label { text-align: center; font-size: 12px; color: var(--primary); margin-bottom: 8px; letter-spacing: 2px; }

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
