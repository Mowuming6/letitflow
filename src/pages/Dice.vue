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
            <span class="help-popup-content">相信骰子之神，投就完了！

一种用于麻将等游戏或赌博的用具，用骨头、木头、塑料等制成的立方体，六个面分别刻一二三四五六点。目前已知最早的骰子实物出土于中东，可追溯至公元前24世纪，中国境内目前发现最早的骰子出土于山东青州的战国墓中，距今已有2300余年历史。

如何使用：
可点击按钮或用手指投掷。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">骰子之神</div>
      <div class="page-subtitle">轻摇方寸骰，万事定分明</div>

      <input class="input-field" placeholder="输入所问之事（可选）" v-model="optionText" />

      <div class="stage-area"
        @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
        @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
        style="cursor:grab">
        <canvas ref="canvasRef" class="stage-canvas"></canvas>
      </div>

      <button class="btn-gold" @click="rollDice" :disabled="rolling">
        {{ rolling ? '骰子飞出中...' : '抛掷骰子' }}
      </button>

      <div v-if="tipText" class="hint-text">
        <span class="hint-icon">💡</span><span>{{ tipText }}</span>
      </div>

      <Transition name="slide-fade">
        <div v-if="showResult" class="result-box">
          <div class="result-title">骰子结果：{{ diceNum }} 点</div>
          <div class="result-text">{{ diceAdvice }}</div>
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
import { play, playBounce } from '../sound.js'

const themeStyle = computed(() => store.getThemeStyle())
const canvasRef = ref(null)
const showHelpPopup = ref(false)
const rolling = ref(false)
const showResult = ref(false)
const diceNum = ref(1)
const diceAdvice = ref('')
const optionText = ref('')
const resultOption = ref('')
const tipText = ref('向上滑动抛出 / 点击按钮投掷')

const DICE_ADVICE = [
  '',
  '🌟 一点突破，专注当下，行动就是答案！',
  '✌️ 两全其美，两条路都值得尝试！',
  '🔺 三角稳固，此刻是最佳时机！',
  '🍀 四叶草运气，好事即将发生！',
  '⭐ 五星好评，你的选择没有错！',
  '🎯 六六大顺，全力以赴吧！',
]

// ===== GLSL =====
const VERT_SRC = `
attribute vec3 aPos;attribute vec3 aNorm;attribute vec2 aUV;attribute float aFace;
uniform mat4 uMVP;uniform mat3 uNM;
varying vec3 vN;varying vec2 vUV;varying float vFace;
void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNM*aNorm);vUV=aUV;vFace=aFace;}`

const FRAG_SRC = `
precision highp float;
varying vec3 vN;varying vec2 vUV;varying float vFace;
uniform vec3 uLight;uniform vec3 uLight2;
uniform int uN0,uN1,uN2,uN3,uN4,uN5;
__CIRC__
float dots(vec2 uv,int n){
  float d=0.0;float r=0.070;
  if(n==1){d+=circ(uv,vec2(.50,.50),r);}
  else if(n==2){d+=circ(uv,vec2(.32,.32),r);d+=circ(uv,vec2(.68,.68),r);}
  else if(n==3){d+=circ(uv,vec2(.28,.28),r);d+=circ(uv,vec2(.50,.50),r);d+=circ(uv,vec2(.72,.72),r);}
  else if(n==4){d+=circ(uv,vec2(.30,.30),r);d+=circ(uv,vec2(.70,.30),r);d+=circ(uv,vec2(.30,.70),r);d+=circ(uv,vec2(.70,.70),r);}
  else if(n==5){d+=circ(uv,vec2(.28,.28),r);d+=circ(uv,vec2(.72,.28),r);d+=circ(uv,vec2(.50,.50),r);d+=circ(uv,vec2(.28,.72),r);d+=circ(uv,vec2(.72,.72),r);}
  else if(n==6){d+=circ(uv,vec2(.30,.20),r);d+=circ(uv,vec2(.70,.20),r);d+=circ(uv,vec2(.30,.50),r);d+=circ(uv,vec2(.70,.50),r);d+=circ(uv,vec2(.30,.80),r);d+=circ(uv,vec2(.70,.80),r);}
  return clamp(d,0.0,1.0);
}
int faceNum(int f){if(f==0)return uN0;else if(f==1)return uN1;else if(f==2)return uN2;else if(f==3)return uN3;else if(f==4)return uN4;else return uN5;}
void main(){
  vec3 n=normalize(vN);vec3 ld=normalize(uLight);vec3 ld2=normalize(uLight2);
  float diff=max(dot(n,ld),0.0);float diff2=max(dot(n,ld2),0.0)*0.4;
  vec3 h=normalize(ld+vec3(0,0.1,1));float spec=pow(max(dot(n,h),0.0),60.0)*0.18;
  float lit=0.38+diff*0.62+diff2+spec;vec3 base=vec3(0.98,0.96,0.90)*lit;
  int fi=int(vFace+0.5);int fn=faceNum(fi);float d=dots(vUV,fn);
  vec3 dotC=(fn==1)?vec3(0.82,0.06,0.06):vec3(0.12,0.08,0.06);
  vec3 col=mix(base,dotC*(0.25+diff*0.55),d);
  gl_FragColor=vec4(col,1.0);
}`

// ===== Matrix lib (verbatim from miniprogram) =====
function mat4identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) }
function mat4mul(A,B){ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C }
function mat4rotX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]) }
function mat4rotY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]) }
function mat4rotZ(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]) }
function mat4trans(tx,ty,tz){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,tx,ty,tz,1]) }
function mat4perspective(fovy,aspect,near,far){ const f=1/Math.tan(fovy*0.5),nf=1/(near-far); return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(near+far)*nf,-1,0,0,2*far*near*nf,0]) }
function mat3fromMat4(m){ return new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]) }

const FACE_DOTS   = [1,6,2,5,3,4]
const FACE_NORMALS= [[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]]

function buildDiceMesh(){
  const R=0.18,S=1.0-R,SEG=8
  const faces=[
    {n:[0,1,0],u:[1,0,0],v:[0,0,1],fid:0},{n:[0,-1,0],u:[1,0,0],v:[0,0,-1],fid:1},
    {n:[0,0,1],u:[1,0,0],v:[0,1,0],fid:2},{n:[0,0,-1],u:[-1,0,0],v:[0,1,0],fid:3},
    {n:[1,0,0],u:[0,0,-1],v:[0,1,0],fid:4},{n:[-1,0,0],u:[0,0,1],v:[0,1,0],fid:5},
  ]
  function proj(x,y,z){ const cx=Math.max(-S,Math.min(S,x)),cy=Math.max(-S,Math.min(S,y)),cz=Math.max(-S,Math.min(S,z)); let dx=x-cx,dy=y-cy,dz=z-cz; const len=Math.sqrt(dx*dx+dy*dy+dz*dz); if(len>0.0001){dx/=len;dy/=len;dz/=len}else{const ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);if(ax>=ay&&ax>=az){dx=x>0?1:-1;dy=0;dz=0}else if(ay>=ax&&ay>=az){dx=0;dy=y>0?1:-1;dz=0}else{dx=0;dy=0;dz=z>0?1:-1}} return{px:cx+dx*R,py:cy+dy*R,pz:cz+dz*R,nx:dx,ny:dy,nz:dz} }
  const pos=[],nor=[],uv=[],fid=[],idx=[];let base=0;const N=SEG+1
  faces.forEach(face=>{ const[fnx,fny,fnz]=face.n,[ux,uy,uz]=face.u,[vx,vy,vz]=face.v,f=face.fid
    for(let j=0;j<=N;j++) for(let i=0;i<=N;i++){ const s=(i/N)*2-1,t=(j/N)*2-1; const p=proj(fnx+ux*s+vx*t,fny+uy*s+vy*t,fnz+uz*s+vz*t); pos.push(p.px,p.py,p.pz);nor.push(p.nx,p.ny,p.nz);uv.push((s+1)*0.5,(t+1)*0.5);fid.push(f) }
    for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const a=base+j*(N+1)+i,b=a+1,c=a+(N+1),d=c+1; idx.push(a,b,d,a,d,c) }
    base+=(N+1)*(N+1)
  })
  return{pos:new Float32Array(pos),nor:new Float32Array(nor),uv:new Float32Array(uv),fid:new Float32Array(fid),idx:new Uint16Array(idx),cnt:idx.length}
}

function getFrontFace(ax,ay,az){ let M=mat4identity();M=mat4mul(mat4rotX(ax),M);M=mat4mul(mat4rotY(ay),M);M=mat4mul(mat4rotZ(az),M);let best=0,bestZ=-Infinity;FACE_NORMALS.forEach((n,i)=>{ const wz=M[2]*n[0]+M[6]*n[1]+M[10]*n[2];if(wz>bestZ){bestZ=wz;best=i} });return FACE_DOTS[best] }

const FACE_SNAP={1:[Math.PI/2,0,0],6:[-Math.PI/2,0,0],2:[0,0,0],5:[0,Math.PI,0],3:[0,-Math.PI/2,0],4:[0,Math.PI/2,0]}

// ===== Runtime state =====
let gl=null,prog=null,buf=null,raf=null
let W=1,H=1,dpr=2
let ax=0.5,ay=-0.3,az=0.0,vax=0,vay=0,vaz=0
let posY=0,velY=0,phase='idle',idleT=0
let tsStart=null,tsLast=null,tsTime=0
let snapResult=0,snapStart=null,snapTarget=null,snapT=0
let prevTime=null

function reset() {
  phase = 'idle'
  rolling.value = false
  showResult.value = false
  tipText.value = '向上滑动抛出 / 点击按钮投掷'
}

function handleGesture(e) {
  if (e.detail.type === 'swipe-up') {
    if (showResult.value) return
    rollDice()
  }
}

function handleGestureClick(e) {
  if (showResult.value && e.detail.state === 'fist' && !rolling.value) {
    reset()
  }
}

onMounted(() => {
  document.addEventListener('gesture-trigger', handleGesture)
  document.addEventListener('gesture-click', handleGestureClick)
  dpr = window.devicePixelRatio || 2
  const cv = canvasRef.value
  const rect = cv.getBoundingClientRect()
  cv.width = rect.width * dpr
  cv.height = rect.height * dpr
  W = cv.width; H = cv.height
  initGL(cv)
})

onUnmounted(() => {
  document.removeEventListener('gesture-trigger', handleGesture)
  document.removeEventListener('gesture-click', handleGestureClick)
  if (raf) cancelAnimationFrame(raf)
})

function initGL(cv){
  gl = cv.getContext('webgl', { antialias: true, alpha: true, depth: true })
  if (!gl) { console.error('WebGL N/A'); return }
  const extD = gl.getExtension('OES_standard_derivatives')
  const circFn = extD
    ? 'float circ(vec2 uv,vec2 c,float r){float d=length(uv-c);float fw=fwidth(d)*0.5;return 1.0-smoothstep(r-fw,r+fw,d);}'
    : 'float circ(vec2 uv,vec2 c,float r){return 1.0-smoothstep(r-0.006,r+0.006,length(uv-c));}'
  const finalFrag = (extD ? '#extension GL_OES_standard_derivatives : enable\n' : '') + FRAG_SRC.replace('__CIRC__', circFn)
  const mkShader=(type,src)=>{ const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('shader',gl.getShaderInfoLog(s));return null}return s }
  const vs=mkShader(gl.VERTEX_SHADER,VERT_SRC),fs=mkShader(gl.FRAGMENT_SHADER,finalFrag)
  if(!vs||!fs)return
  prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog)
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){console.error('link',gl.getProgramInfoLog(prog));return}
  gl.useProgram(prog)
  const geo=buildDiceMesh()
  const mkBuf=(data,target)=>{ const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b }
  buf={ pos:mkBuf(geo.pos,gl.ARRAY_BUFFER),nor:mkBuf(geo.nor,gl.ARRAY_BUFFER),uv:mkBuf(geo.uv,gl.ARRAY_BUFFER),fid:mkBuf(geo.fid,gl.ARRAY_BUFFER),idx:mkBuf(geo.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:geo.cnt }
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0.0, 0.0, 0.0, 0.0)
  loop()
}

function render(){
  if(!gl||!prog||!buf)return
  gl.viewport(0,0,W,H);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
  let M=mat4identity();M=mat4mul(mat4rotX(ax),M);M=mat4mul(mat4rotY(ay),M);M=mat4mul(mat4rotZ(az),M);M=mat4mul(mat4trans(0,posY,0),M)
  const V=mat4trans(0,0,-6),P=mat4perspective(Math.PI/3.5,W/H,0.1,50),MVP=mat4mul(P,mat4mul(V,M)),NM=mat3fromMat4(M)
  const bindAttr=(name,b,sz)=>{ const loc=gl.getAttribLocation(prog,name);if(loc===-1)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0) }
  bindAttr('aPos',buf.pos,3);bindAttr('aNorm',buf.nor,3);bindAttr('aUV',buf.uv,2);bindAttr('aFace',buf.fid,1)
  const ul=n=>gl.getUniformLocation(prog,n)
  gl.uniformMatrix4fv(ul('uMVP'),false,MVP);gl.uniformMatrix3fv(ul('uNM'),false,NM)
  gl.uniform3f(ul('uLight'),0.5,1.0,0.7);gl.uniform3f(ul('uLight2'),-0.4,0.3,0.5)
  gl.uniform1i(ul('uN0'),FACE_DOTS[0]);gl.uniform1i(ul('uN1'),FACE_DOTS[1]);gl.uniform1i(ul('uN2'),FACE_DOTS[2])
  gl.uniform1i(ul('uN3'),FACE_DOTS[3]);gl.uniform1i(ul('uN4'),FACE_DOTS[4]);gl.uniform1i(ul('uN5'),FACE_DOTS[5])
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf.idx);gl.drawElements(gl.TRIANGLES,buf.cnt,gl.UNSIGNED_SHORT,0)
}

function loop(){
  function frame(ts){
    const dt = prevTime ? Math.min((ts - prevTime) / 1000, 0.05) : 1/60
    prevTime = ts
    update(dt);render()
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
}

function update(dt){
  if(phase==='idle'){
    idleT+=dt;ay+=0.010;ax=0.42+Math.sin(idleT*0.7)*0.15;az=Math.sin(idleT*0.4)*0.05;posY=0
  } else if(phase==='throw'||phase==='bounce'){
    ax+=vax*dt;ay+=vay*dt;az+=vaz*dt;velY-=20*dt;posY+=velY*dt
    if(posY<=0){ const iv=Math.abs(velY);posY=0;velY=iv*0.38;vax*=0.5;vay*=0.5;vaz*=0.5; if(iv>1.5)setTimeout(()=>playBounce(iv),0); if(velY<1.2)phase='settle' }
  } else if(phase==='settle'){
    vax*=0.82;vay*=0.82;vaz*=0.82;ax+=vax*dt;ay+=vay*dt;az+=vaz*dt;posY*=0.85
    if(Math.abs(vax)<0.015&&Math.abs(vay)<0.015&&Math.abs(vaz)<0.015){
      phase='snap';snapResult=getFrontFace(ax,ay,az)
      const snap=FACE_SNAP[snapResult]||[0,0,0]
      const near=(cur,tgt)=>{ const PI2=Math.PI*2;let t=((tgt%PI2)+PI2)%PI2;const diff=cur-t;t+=Math.round(diff/PI2)*PI2;return t }
      snapStart={ax,ay,az,posY};snapTarget={ax:near(ax,snap[0]),ay:near(ay,snap[1]),az:near(az,snap[2])};snapT=0
    }
  } else if(phase==='snap'){
    snapT+=dt*3.0;const t=Math.min(snapT,1),ease=t<0.5?2*t*t:(1-Math.pow(-2*t+2,2)/2)
    ax=snapStart.ax+(snapTarget.ax-snapStart.ax)*ease;ay=snapStart.ay+(snapTarget.ay-snapStart.ay)*ease;az=snapStart.az+(snapTarget.az-snapStart.az)*ease
    posY=snapStart.posY*(1-ease)
    if(t>=1){ ax=snapTarget.ax;ay=snapTarget.ay;az=snapTarget.az;posY=0;phase='done';onDone(snapResult) }
  }
}

function onTouchStart(e){ const t=e.touches[0];tsStart={x:t.clientX,y:t.clientY};tsLast={x:t.clientX,y:t.clientY};tsTime=Date.now() }
function onTouchMove(e){ if(!tsLast)return;const t=e.touches[0];const dx=t.clientX-tsLast.x,dy=t.clientY-tsLast.y;if(phase==='idle'||phase==='done'){ay+=dx*0.015;ax+=dy*0.015}tsLast={x:t.clientX,y:t.clientY} }
function onTouchEnd(e){ if(!tsStart)return;const t=e.changedTouches[0];const totalDy=tsStart.y-t.clientY;const elapsed=Math.max((Date.now()-tsTime)/1000,0.03);const speedY=totalDy/elapsed;if(totalDy>20&&speedY>150)throwDice(Math.min(speedY,1200));tsStart=null;tsLast=null }
let _md=false
function onMouseDown(e){_md=true;e.preventDefault();onTouchStart({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseMove(e){if(!_md)return;onTouchMove({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseUp(e){if(!_md)return;_md=false;onTouchEnd({changedTouches:[{clientX:e.clientX,clientY:e.clientY}]})}

function throwDice(upSpeed){
  if(phase!=='idle'&&phase!=='done')return
  play('diceRoll');const force=Math.min(upSpeed/600,3.0)
  velY=5.5*force+3.5;posY=0;vax=(Math.random()-0.5)*20;vay=(Math.random()-0.5)*20+9;vaz=(Math.random()-0.5)*10
  phase='throw';rolling.value=true;showResult.value=false;tipText.value=''
}

function rollDice(){ throwDice(450+Math.random()*350) }



function onDone(n){
  vax=vay=vaz=0;posY=0
  setTimeout(()=>play('stickLand'),0)
  const opts=optionText.value?optionText.value.split(/[,，、\s]+/).map(s=>s.trim()).filter(Boolean):[]
  const opt=opts.length>0?opts[(n-1)%opts.length]:''
  diceNum.value=n;rolling.value=false;showResult.value=true
  diceAdvice.value=DICE_ADVICE[n];resultOption.value=opt
  tipText.value='再次向上滑动投掷'
  store.saveHistory('🎲 骰子之神',`投出 ${n} 点`,optionText.value || '（用户未输入问题）')
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: var(--page-bg, #F8F8FA);
  padding-bottom: 10px;
}

/* ── 1. 结果框的高端宣纸双线仪式感设计与 Vue 动画 ── */
.result-box {
  background: var(--bg-color-2); /* 使用主题对应的 bgColor2 颜色 */
  background-image: radial-gradient(rgba(var(--primary-rgb), 0.03) 1px, transparent 0); /* 极淡的底纹 */
  background-size: 8px 8px;
  border: 1px dashed var(--primary); /* 内圈虚线 */
  outline: 4px solid rgba(var(--primary-rgb), 0.06); /* 外圈微衬 */
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
  margin-bottom: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(var(--primary-rgb), 0.05);
  position: relative;
  overflow: hidden;
}

/* 古风结果角饰 */
.result-box::before, .result-box::after {
  content: "";
  position: absolute;
  width: 6px;
  height: 6px;
  border: 1px solid var(--primary);
}
.result-box::before { top: 4px; left: 4px; border-right: none; border-bottom: none; }
.result-box::after { bottom: 4px; right: 4px; border-left: none; border-top: none; }

.result-title {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #1A1A2E;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.result-text {
  font-size: 13px;
  color: #555;
  text-align: center;
  line-height: 1.6;
}

.highlight {
  color: #E24C4C; /* 朱砂红 */
  font-weight: bold;
  background: rgba(226, 76, 76, 0.06);
  padding: 2px 8px;
  border-radius: 12px;
  border: 0.5px solid rgba(226, 76, 76, 0.15);
  margin-left: 2px;
}

/* Vue 3 Transition 结果框渐显滑落效果 */
.slide-fade-enter-active {
  transition: all 0.65s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.7, 0, 0.84, 0);
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.97);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}


/* ── 2. 输入框美化：恢复原框，加点击变粗效果 ── */
.input-field {
  transition: border-width 0.2s, border-color 0.25s, box-shadow 0.25s;
}

/* 占位符古风感 */
.input-field::placeholder {
  color: #9E9EAA;
  font-style: italic;
  font-size: 13px;
  letter-spacing: 0.5px;
}

/* 获取焦点时：输入框边框变粗，颜色变为主主题色 */
.input-field:focus {
  border-width: 2px !important;
  border-color: var(--primary) !important;
  box-shadow: 0 4px 12px var(--primary-shadow);
  outline: none;
}


/* ── 3. 按钮金流光与弹性触感美化 ── */
.btn-gold {
  position: relative;
  overflow: hidden; /* 为斜向流光做裁剪罩 */
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 1.5px;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--primary-shadow);
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  user-select: none;
}

/* 按钮悬停微起悬浮 */
.btn-gold:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--primary-shadow);
  filter: brightness(1.04);
}

/* 完美的 Haptic 按压回弹物理微动 */
.btn-gold:active:not(:disabled) {
  transform: translateY(1.5px) scale(0.965);
  box-shadow: 0 2px 6px var(--primary-shadow);
  transition: transform 0.08s ease-out; /* 按下去极快 */
}

/* 禁用状态 */
.btn-gold:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: #D5D5DA;
  box-shadow: none;
}
</style>
