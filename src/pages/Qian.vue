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
            <span class="help-popup-content">观音灵签是民间流传的，在佛前占卦的一种求签签种，是佛教文化与本土文化相融合，用佛学的智慧来解释卦象。观音灵签每支签都有其特殊的意义，有三十签、六十签等，流行版本的观音灵签为100签，签文流传至今，各地签文略有不同，但结果大同小异。该签种起源可追溯至宋代佛教寺庙，明清时期形成系统签名和解签方式，逐渐发展为民间占卜工具。

如何使用：
1.抽签前要专心一致，先合手默念"救苦救难观音菩萨"三遍。
2.默念自己姓名、出生日期，年龄、现在居住地址。
3.请求指点的事情。如婚姻、事业、运程、流年、工作、财运...等。
4.抽签：点上面的签筒抽签按钮，或用手指摇晃签筒，抽出观音灵签。
5.掷杯确认：前去圣杯投掷界面，默念"如果您愿意解答疑惑，请给我三个圣杯"，若连续获得三个圣杯（一正一反），可得此灵签。
6.【手势】：开启手势后，在镜头前【左右挥动手掌】，即可晃动签筒抽签。【握拳】可重新开始。
答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">观音灵签</div>
      <div class="page-subtitle">观音垂慈示，一签解千愁</div>
      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />
      <div class="stage-area"
        @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
        @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
        style="cursor:grab">
        <canvas ref="canvasRef" class="stage-canvas"></canvas>
      </div>
      <button class="btn-gold" @click="shake" :disabled="phase === 'shake' || phase === 'fall'">
        {{ (phase === 'shake' || phase === 'fall') ? '签在飞落中...' : '摇签' }}
      </button>
      <div v-if="tipText" class="hint-text"><span class="hint-icon">💡</span><span>{{ tipText }}</span></div>
      <div v-if="showResult" class="qian-result fade-in">
        <div class="qian-title">{{ qianDisplayTitle }}</div>
        <div class="qian-poem">{{ qianPoem }}</div>
        <div class="qian-divider"></div>
        <div class="qian-meta">诗意：{{ qianShiyi }}</div>
        <div class="qian-meta">解曰：{{ qianJieyue }}</div>
        <div class="qian-meta qian-essence">本签精髓：{{ qianEssence }}</div>
        <div class="q-tabs">
          <div v-for="(label,i) in TAB_LABELS" :key="i"
            class="q-tab" :class="{'q-tab-on': activeTab === i}"
            @click="switchTab(i)">{{ label }}</div>
        </div>
        <div class="q-tab-content">
          <span class="q-content-text">{{ tabContents[activeTab] }}</span>
        </div>
      </div>
      <AiDialogue pageType="qian" :question="question" :resultData="getQianResultData()" :hasResult="showResult" />
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
import QIAN_DATA from './qian_data_module.js'

const themeStyle = computed(() => store.getThemeStyle())
const canvasRef = ref(null)
const showHelpPopup = ref(false)
const showResult = ref(false)
const tipText = ref('左右滑动 / 点击按钮摇动签筒')
const question = ref('')
const phase = ref('idle')
const qianDisplayTitle = ref(''), qianPoem = ref(''), qianShiyi = ref(''), qianJieyue = ref(''), qianEssence = ref('')
const activeTab = ref(0)
const tabContents = ref([])
const TAB_LABELS = ['整体', '凡事', '家庭', '事业', '其他']

const VERT_SRC = `attribute vec3 aPos;attribute vec3 aNorm;uniform mat4 uMVP;uniform mat3 uNM;varying vec3 vN;varying vec3 vPos;void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNM*aNorm);vPos=aPos;}`
const FRAG_SRC = `precision highp float;varying vec3 vN;varying vec3 vPos;uniform vec3 uLight;uniform vec3 uLight2;uniform vec3 uColor;void main(){vec3 n=normalize(vN);vec3 ld=normalize(uLight);vec3 ld2=normalize(uLight2);vec3 viewDir=normalize(vec3(0.0,0.5,1.0));vec3 h=normalize(ld+viewDir);vec3 h2=normalize(ld2+viewDir);float diff=max(dot(n,ld),0.0);float diff2=max(dot(n,ld2),0.0)*0.4;float spec=pow(max(dot(n,h),0.0),12.0);float spec2=pow(max(dot(n,h2),0.0),8.0)*0.5;float fresnel=pow(1.0-max(dot(n,viewDir),0.0),2.0)*0.15;float lit=0.40+diff*0.55+diff2+fresnel;float grain1=sin(vPos.y*20.0+vPos.x*4.0+vPos.z*6.0)*0.04;float grain2=sin(vPos.y*35.0-vPos.x*8.0+sin(vPos.z*5.0)*2.0)*0.02;float grain3=sin(vPos.z*18.0+vPos.y*5.0)*0.015;float ring=sin(length(vPos.xz)*12.0+vPos.y*5.0)*0.02;float grain=grain1+grain2+grain3+ring;vec3 col=uColor*(1.0+grain);col=col*lit+vec3(1.0,0.9,0.75)*(spec*0.65+spec2*0.2);gl_FragColor=vec4(col,1.0);}`

function mat4identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) }
function mat4mul(A,B){ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C }
function mat4rotX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]) }
function mat4rotY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]) }
function mat4rotZ(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]) }
function mat4trans(x,y,z){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]) }
function mat4scale(sx,sy,sz){ return new Float32Array([sx,0,0,0,0,sy,0,0,0,0,sz,0,0,0,0,1]) }
function mat4perspective(fovy,asp,n,f){ const ft=1/Math.tan(fovy*0.5),nf=1/(n-f); return new Float32Array([ft/asp,0,0,0,0,ft,0,0,0,0,(n+f)*nf,-1,0,0,2*f*n*nf,0]) }
function mat3fromMat4(m){ return new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]) }

function buildCylinderMesh(radius,height,segs){
  const pos=[],nor=[],idx=[];let base=0;const halfH=height/2
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,x=Math.cos(a)*radius,z=Math.sin(a)*radius,nx=Math.cos(a),nz=Math.sin(a);pos.push(x,halfH,z);nor.push(nx,0,nz);pos.push(x,-halfH,z);nor.push(nx,0,nz)}
  for(let i=0;i<segs;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,b,c,b,d,c)}
  base=(segs+1)*2;pos.push(0,halfH,0);nor.push(0,1,0)
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2;pos.push(Math.cos(a)*radius,halfH,Math.sin(a)*radius);nor.push(0,1,0)}
  for(let i=0;i<segs;i++) idx.push(base,base+1+i,base+2+i);base+=segs+2
  pos.push(0,-halfH,0);nor.push(0,-1,0)
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2;pos.push(Math.cos(a)*radius,-halfH,Math.sin(a)*radius);nor.push(0,-1,0)}
  for(let i=0;i<segs;i++) idx.push(base,base+2+i,base+1+i)
  return{pos:new Float32Array(pos),nor:new Float32Array(nor),idx:new Uint16Array(idx),cnt:idx.length}
}
function buildStickMesh(){
  const wx2=0.12,wz=0.02,h=2.5,hx=wx2/2,hz=wz/2,pos=[],nor=[],idx=[]
  const faces=[{n:[0,0,1],verts:[[-hx,-h/2,hz],[hx,-h/2,hz],[hx,h/2,hz],[-hx,h/2,hz]]},{n:[0,0,-1],verts:[[hx,-h/2,-hz],[-hx,-h/2,-hz],[-hx,h/2,-hz],[hx,h/2,-hz]]},{n:[1,0,0],verts:[[hx,-h/2,hz],[hx,-h/2,-hz],[hx,h/2,-hz],[hx,h/2,hz]]},{n:[-1,0,0],verts:[[-hx,-h/2,-hz],[-hx,-h/2,hz],[-hx,h/2,hz],[-hx,h/2,-hz]]}]
  let base=0;faces.forEach(f=>{f.verts.forEach(v=>{pos.push(...v);nor.push(...f.n)});idx.push(base,base+1,base+2,base,base+2,base+3);base+=4})
  const tipY=h/2+0.18,tipVerts=[[hx,h/2,hz],[-hx,h/2,hz],[-hx,h/2,-hz],[hx,h/2,-hz]],tipTop=[0,tipY,0]
  for(let i=0;i<4;i++){const a=tipVerts[i],b=tipVerts[(i+1)%4],nx=(a[0]+b[0])/2,nz=(a[2]+b[2])/2,len=Math.sqrt(nx*nx+1+nz*nz)||1;pos.push(...a);nor.push(nx/len,0.5/len,nz/len);pos.push(...b);nor.push(nx/len,0.5/len,nz/len);pos.push(...tipTop);nor.push(nx/len,0.5/len,nz/len);idx.push(base,base+1,base+2);base+=3}
  return{pos:new Float32Array(pos),nor:new Float32Array(nor),idx:new Uint16Array(idx),cnt:idx.length}
}

let gl=null,prog=null,tubeBuf=null,stickBuf=null,ringBuf=null,raf=null,prevTime=null
let W=1,H=1
let sticks=[],shakeT=0,shakeIntensity=0,tiltX=0,tiltTarget=0,tiltVel=0,fallingStick=null,chosenQian=0
let moveAccum=0,velocity={x:0,y:0},tsStart=null

function initSticks(){
  sticks=Array.from({length:20},(_,i)=>{const a=(i/20)*Math.PI*2+(Math.random()-0.5)*0.3,r=0.08+Math.random()*(0.42-0.14);return{offX:Math.cos(a)*r,offZ:Math.sin(a)*r,height:0.25+Math.random()*0.2,dX:0,dZ:0,vx:0,vz:0}})
}

function _drawMesh(glCtx,prg,bfr,M,V,P,color){
  const ba=(name,b,sz)=>{const loc=glCtx.getAttribLocation(prg,name);if(loc===-1)return;glCtx.bindBuffer(glCtx.ARRAY_BUFFER,b);glCtx.enableVertexAttribArray(loc);glCtx.vertexAttribPointer(loc,sz,glCtx.FLOAT,false,0,0)}
  ba('aPos',bfr.pos,3);ba('aNorm',bfr.nor,3)
  const MVP=mat4mul(P,mat4mul(V,M)),NM=mat3fromMat4(M)
  const ul=n=>glCtx.getUniformLocation(prg,n)
  glCtx.uniformMatrix4fv(ul('uMVP'),false,MVP);glCtx.uniformMatrix3fv(ul('uNM'),false,NM)
  glCtx.uniform3f(ul('uColor'),color[0],color[1],color[2])
  glCtx.bindBuffer(glCtx.ELEMENT_ARRAY_BUFFER,bfr.idx);glCtx.drawElements(glCtx.TRIANGLES,bfr.cnt,glCtx.UNSIGNED_SHORT,0)
}

function reset() {
  showResult.value = false
  phase.value = 'idle'
  tipText.value = '左右滑动 / 点击按钮摇动签筒'
  initSticks()
}

function handleGesture(e) {
  if (e.detail.type === 'horizontal-swipe') {
    if (showResult.value) return
    shake()
  }
}

function handleGestureClick(e) {
  if (showResult.value && e.detail.state === 'fist' && phase.value !== 'shake' && phase.value !== 'fall') {
    reset()
  }
}

onMounted(()=>{
  document.addEventListener('gesture-trigger', handleGesture)
  document.addEventListener('gesture-click', handleGestureClick)
  initSticks()
  const cv=canvasRef.value;const rect=cv.getBoundingClientRect();const dpr=window.devicePixelRatio||2
  cv.width=rect.width*dpr;cv.height=rect.height*dpr;W=cv.width;H=cv.height
  gl=cv.getContext('webgl',{antialias:true,alpha: true,depth:true});if(!gl)return
  const mkS=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
  const vs=mkS(gl.VERTEX_SHADER,VERT_SRC),fs=mkS(gl.FRAGMENT_SHADER,FRAG_SRC)
  prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);gl.useProgram(prog)
  const mkBuf=(d,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,d,gl.STATIC_DRAW);return b}
  const tube=buildCylinderMesh(0.6,3.0,32);tubeBuf={pos:mkBuf(tube.pos,gl.ARRAY_BUFFER),nor:mkBuf(tube.nor,gl.ARRAY_BUFFER),idx:mkBuf(tube.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:tube.cnt}
  const stick=buildStickMesh();stickBuf={pos:mkBuf(stick.pos,gl.ARRAY_BUFFER),nor:mkBuf(stick.nor,gl.ARRAY_BUFFER),idx:mkBuf(stick.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:stick.cnt}
  const ring=buildCylinderMesh(0.64,0.08,32);ringBuf={pos:mkBuf(ring.pos,gl.ARRAY_BUFFER),nor:mkBuf(ring.nor,gl.ARRAY_BUFFER),idx:mkBuf(ring.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:ring.cnt}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0.0, 0.0, 0.0, 0.0)
  function frame(ts){const dt=prevTime?Math.min((ts-prevTime)/1000,0.05):1/60;prevTime=ts;update(dt);render();raf=requestAnimationFrame(frame)}
  raf=requestAnimationFrame(frame)
})
onUnmounted(()=>{
  document.removeEventListener('gesture-trigger', handleGesture)
  document.removeEventListener('gesture-click', handleGestureClick)
  if(raf)cancelAnimationFrame(raf)
})

function render(){
  if(!gl||!prog)return
  gl.viewport(0,0,W,H);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
  const asp=W/H,P=mat4perspective(Math.PI/4,asp,0.1,50)
  let V=mat4trans(0,0,-7);V=mat4mul(V,mat4rotX(-0.3));V=mat4mul(V,mat4trans(0,-0.5,0))
  const ul=n=>gl.getUniformLocation(prog,n)
  gl.uniform3f(ul('uLight'),1.0,0.5,1.0);gl.uniform3f(ul('uLight2'),-0.6,0.4,0.5)
  const shakeAngle=phase.value==='shake'?Math.sin(shakeT*8)*shakeIntensity*0.12:0
  const tiltAngle=tiltX+shakeAngle,tubeOffsetX=-1.5
  let sceneM=mat4identity();sceneM=mat4mul(mat4trans(0,-1.5,0),sceneM);sceneM=mat4mul(mat4rotZ(tiltAngle),sceneM);sceneM=mat4mul(mat4trans(0,1.5,0),sceneM);sceneM=mat4mul(mat4trans(tubeOffsetX,0,0),sceneM)
  _drawMesh(gl,prog,tubeBuf,sceneM,V,P,[0.65,0.38,0.18])
  const ringPositions=[-1.2,-0.8,0.8,1.2];ringPositions.forEach(ry=>{const rM=mat4mul(sceneM,mat4trans(0,ry,0));_drawMesh(gl,prog,ringBuf,rM,V,P,[0.45,0.25,0.15])})
  const tubeTopY=1.5
  sticks.forEach((stick,i)=>{
    if(fallingStick&&fallingStick.index===i&&fallingStick.progress>0.8)return
    const extraOut=(phase.value==='shake'||phase.value==='fall')&&fallingStick&&fallingStick.index===i?fallingStick.progress*1.0:0
    const stickY=tubeTopY+stick.height+extraOut
    const sM=mat4mul(sceneM,mat4trans(stick.offX+stick.dX,stickY,stick.offZ+stick.dZ))
    _drawMesh(gl,prog,stickBuf,sM,V,P,[0.60,0.30,0.25])
  })
  if(fallingStick&&fallingStick.progress>0.8){
    const f=fallingStick,ease=1-Math.pow(1-Math.min(f.progress,1.0),3)
    let fM=mat4identity();fM=mat4mul(mat4rotZ(1.3),fM);fM=mat4mul(mat4trans((tubeOffsetX+2.8)*ease,-0.5-0.6*ease,0.6*ease),fM)
    _drawMesh(gl,prog,stickBuf,fM,V,P,[0.60,0.30,0.30])
  }
}

function update(dt){
  if(phase.value==='fall'||phase.value==='done'){const force=-7.0*tiltX-3.8*tiltVel;tiltVel+=force*dt;tiltX+=tiltVel*dt}
  else{tiltX+=(tiltTarget-tiltX)*0.15;if(Math.abs(tiltTarget)<0.001)tiltX*=0.9}
  if(phase.value==='shake'){
    shakeT+=dt;shakeIntensity=Math.min(shakeT*3,1.0)*Math.max(0,1-(shakeT-1.2)/0.8)
    const intensity=shakeIntensity,shakeAccX=Math.sin(shakeT*9.0)*intensity*2.5,shakeAccZ=Math.cos(shakeT*7.0)*intensity*1.2,tubeWall=0.38,stickR=0.07,minDist=stickR*2
    sticks.forEach(s=>{s.vx+=(shakeAccX+(Math.random()-0.5)*intensity*1.2)*dt*6;s.vz+=(shakeAccZ+(Math.random()-0.5)*intensity*0.8)*dt*4;const damp=1-dt*8;s.vx*=damp;s.vz*=damp;s.dX+=s.vx*dt;s.dZ+=s.vz*dt;const cx=s.offX+s.dX,cz=s.offZ+s.dZ,dist=Math.sqrt(cx*cx+cz*cz);if(dist>tubeWall){const nx=cx/dist,nz=cz/dist;s.dX=nx*tubeWall-s.offX;s.dZ=nz*tubeWall-s.offZ;const vn=s.vx*nx+s.vz*nz;s.vx-=1.5*vn*nx;s.vz-=1.5*vn*nz}})
    for(let i=0;i<sticks.length;i++) for(let j=i+1;j<sticks.length;j++){const si=sticks[i],sj=sticks[j],dx=(si.offX+si.dX)-(sj.offX+sj.dX),dz=(si.offZ+si.dZ)-(sj.offZ+sj.dZ),d=Math.sqrt(dx*dx+dz*dz);if(d<minDist&&d>0.001){const nx=dx/d,nz=dz/d,overlap=(minDist-d)*0.5;si.dX+=nx*overlap;si.dZ+=nz*overlap;sj.dX-=nx*overlap;sj.dZ-=nz*overlap;const dvx=si.vx-sj.vx,dvz=si.vz-sj.vz,dvn=dvx*nx+dvz*nz;if(dvn<0){const imp=dvn*0.7;si.vx-=imp*nx;si.vz-=imp*nz;sj.vx+=imp*nx;sj.vz+=imp*nz}}}
    if(shakeT>1.0&&!fallingStick){const idx=Math.floor(Math.random()*sticks.length);fallingStick={index:idx,progress:0}}
    if(fallingStick)fallingStick.progress+=dt*0.7
    if(shakeT>2.5)phase.value='fall'
  } else {sticks.forEach(s=>{s.vx*=0.88;s.vz*=0.88;s.dX*=0.90;s.dZ*=0.90})}
  if(phase.value==='fall'){
    if(fallingStick){fallingStick.progress+=dt*2;if(fallingStick.progress>=1.0){fallingStick.progress=1.0;phase.value='done';finishShake()}}
  }
}

function shake() {
  if (phase.value === 'shake' || phase.value === 'fall') return
  play('stickShake')
  phase.value = 'shake'
  shakeT = 0
  shakeIntensity = 0
  fallingStick = null
  chosenQian = Math.floor(Math.random() * QIAN_DATA.length)
  showResult.value = false
  initSticks()
}

function shakeTube(){
  shake()
}


function onTouchStart(e){tsStart={x:e.touches[0].clientX,y:e.touches[0].clientY};velocity={x:0,y:0};moveAccum=0}
function onTouchMove(e){if(!tsStart)return;const dx=e.touches[0].clientX-tsStart.x;velocity={x:dx,y:e.touches[0].clientY-tsStart.y};tsStart={x:e.touches[0].clientX,y:e.touches[0].clientY};tiltTarget=dx*0.008;moveAccum+=Math.abs(dx)+Math.abs(velocity.y);if(moveAccum>60&&phase.value!=='shake'&&phase.value!=='fall')shake()}
let _md=false
function onMouseDown(e){_md=true;e.preventDefault();onTouchStart({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseMove(e){if(!_md)return;onTouchMove({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseUp(e){if(!_md)return;_md=false}
function onTouchEnd(){tiltTarget=0;const speed=Math.abs(velocity.x)+Math.abs(velocity.y);if(speed>5&&phase.value!=='shake'&&phase.value!=='fall')shake();tsStart=null}

function _buildJiating(e){const parts=[];if(e['爱情婚姻'])parts.push('【爱情婚姻】\n'+e['爱情婚姻']);if(e['求孕求子'])parts.push('【求孕求子】\n'+e['求孕求子']);return parts.join('\n\n')||'暂无相关内容。'}
function _buildShiye(e){const keys=[['工作求职创业事业',e['工作求职创业事业']],['考试竞赛升迁竞选',e['考试竞赛升迁竞选']],['投资理财',e['投资理财']],['经商生意',e['经商生意']],['房地交易',e['房地交易']]];return keys.filter(([,v])=>v).map(([k,v])=>'【'+k+'】\n'+v).join('\n\n')||'暂无相关内容。'}
function _buildQita(e){const keys=[['治病健康',e['治病健康']],['转换变更',e['转换变更']],['官司诉讼',e['官司诉讼']],['寻人寻物',e['寻人寻物']],['远行出国',e['远行出国']]];return keys.filter(([,v])=>v).map(([k,v])=>'【'+k+'】\n'+v).join('\n\n')||'暂无相关内容。'}

function switchTab(i){activeTab.value=i}
function finishShake(){
  const idx=chosenQian%QIAN_DATA.length,e=QIAN_DATA[idx]
  tabContents.value=[e['整体解释']||'暂无相关内容。',e['凡事做事']||'暂无相关内容。',_buildJiating(e),_buildShiye(e),_buildQita(e)]
  qianDisplayTitle.value=e['灵签'].replace(/\)$/,' · '+e['宫位']+')')
  qianPoem.value=e['灵签诗文'];qianShiyi.value=e['诗意'];qianJieyue.value=e['解曰'];qianEssence.value=e['本签精髓']
  showResult.value=true;tipText.value='再次摇动求签';activeTab.value=0;play('stickLand')
  store.saveHistory('🛕 观音灵签',qianDisplayTitle.value,question.value || '（用户未输入问题）')
}
function getQianResultData() {
  return {
    title: qianDisplayTitle.value,
    poem: qianPoem.value,
    shiyi: qianShiyi.value,
    jieyue: qianJieyue.value,
    essence: qianEssence.value,
    tabContent: tabContents.value[activeTab.value] || '',
    activeTabLabel: TAB_LABELS[activeTab.value] || ''
  }
}
</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }
.qian-result { background: #F9F9FB; border: 1px solid #EBEBEB; border-radius: 8px; padding: 14px; margin-top: 10px; }
.qian-title { text-align: center; font-size: 17px; font-weight: bold; color: #1A1A2E; margin-bottom: 10px; }
.qian-poem { font-size: 14px; color: #333; line-height: 2; text-align: center; white-space: pre-wrap; }
.qian-divider { height: 1px; background: #EBEBEB; margin: 10px 0; }
.qian-meta { font-size: 12px; color: #666; line-height: 1.7; }
.qian-essence { margin-top: 5px; font-size: 11px; color: #999; white-space: pre-wrap; }
.q-tabs { display: flex; border-top: 1px solid #EBEBEB; margin-top: 10px; }
.q-tab { flex: 1; text-align: center; font-size: 11px; padding: 10px 0; color: #999; cursor: pointer; }
.q-tab-on { color: var(--primary); font-weight: bold; border-bottom: 2px solid var(--primary); }
.q-tab-content { padding: 12px 0 14px; min-height: 80px; }
.q-content-text { font-size: 13px; color: #555; line-height: 1.9; white-space: pre-wrap; }

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
