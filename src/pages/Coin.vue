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
            <span class="help-popup-content">经典的二选一场景，选择困难症必用！

抛硬币是一种通过投掷硬币正反面结果辅助决策的行为，常被视为公平的随机选择方式，广泛用于日常决策与概率研究。但实验显示初始面朝上的结果概率约为51%，与抛掷方式和旋转轴等因素相关。（咱们的电子硬币是50%）

如何使用：
拖动硬币可旋转查看，点击按钮抛掷。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">命运硬币</div>
      <div class="page-subtitle">硬币翻空转，正反皆天意</div>
      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />
      <div class="stage-area"
        @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
        @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
        style="cursor:grab">
        <canvas ref="canvasRef" class="stage-canvas"></canvas>
      </div>
      <div class="coin-stats" v-if="headCount > 0 || tailCount > 0">
        <span class="stat-item">正面: {{ headCount }}</span>
        <span class="stat-sep">|</span>
        <span class="stat-item">反面: {{ tailCount }}</span>
      </div>
      <button class="btn-gold" @click="flipCoin" :disabled="phase !== 'idle' && phase !== 'done'">
        {{ (phase === 'throw' || phase === 'settle') ? '硬币飞旋中...' : '抛掷硬币' }}
      </button>
      <div v-if="tipText" class="hint-text"><span class="hint-icon">💡</span><span>{{ tipText }}</span></div>
      <Transition name="slide-fade">
        <div v-if="showResult" class="result-box">
          <div class="result-title">{{ result }}</div>
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
const showResult = ref(false)
const result = ref('')
const tipText = ref('向上滑动抛出 / 点击按钮抛掷')
const question = ref('')
const headCount = ref(0), tailCount = ref(0)
const phase = ref('idle')

const VERT_SRC = `attribute vec3 aPos;attribute vec3 aNorm;attribute vec2 aUV;attribute float aFaceType;uniform mat4 uMVP;uniform mat3 uNM;varying vec3 vN;varying vec3 vPos;varying vec2 vUV;varying float vFT;void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNM*aNorm);vPos=aPos;vUV=aUV;vFT=aFaceType;}`
const FRAG_SRC = `precision highp float;varying vec3 vN;varying vec3 vPos;varying vec2 vUV;varying float vFT;uniform vec3 uLight;uniform vec3 uLight2;uniform sampler2D uTextTex;void main(){vec3 n=normalize(vN);vec3 ld=normalize(uLight);vec3 ld2=normalize(uLight2);vec3 viewDir=normalize(vec3(0.0,0.4,1.0));vec3 h=normalize(ld+viewDir);vec3 h2=normalize(ld2+viewDir);float diff=max(dot(n,ld),0.0);float diff2=max(dot(n,ld2),0.0)*0.50;float spec=pow(max(dot(n,h),0.0),20.0);float spec2=pow(max(dot(n,h2),0.0),12.0)*0.5;float fresnel=pow(1.0-max(dot(n,viewDir),0.0),2.5)*0.30;float r=length(vPos.xz);float scratch=sin(r*28.0)*0.018+sin(r*14.0+vPos.x*4.0)*0.012;vec3 col=vec3(0.0);vec3 sideBase=vec3(0.78,0.68,0.38);vec3 faceBase=vec3(0.96,0.78,0.28);vec3 backBase=vec3(0.82,0.84,0.88);vec3 specColor=vec3(1.0,0.97,0.88);vec3 specColorBack=vec3(0.90,0.94,1.00);vec3 inkColor=vec3(0.10,0.06,0.01);vec2 tUVFace=vec2(vUV.x*0.5,vUV.y);vec2 tUVBack=vec2(vUV.x*0.5+0.5,vUV.y);vec4 tFace=texture2D(uTextTex,tUVFace);vec4 tBack=texture2D(uTextTex,tUVBack);vec3 specAdd=specColor*(spec*0.70+spec2);vec3 specAddBack=specColorBack*(spec*0.70+spec2);float litDiff=diff*0.72+diff2+fresnel;float litSide=0.32+litDiff;float litFace=0.36+litDiff*0.88+scratch;float litBack=0.30+litDiff*0.88+scratch;if(vFT<0.5){col=sideBase*litSide+specAdd;}else if(vFT<1.5){col=mix(faceBase*litFace+specAdd,inkColor,tFace.a*0.88);}else{col=mix(backBase*litBack+specAddBack,inkColor,tBack.a*0.88);}gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}`

function mat4identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) }
function mat4mul(A,B){ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C }
function mat4rotX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]) }
function mat4rotY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]) }
function mat4trans(tx,ty,tz){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,tx,ty,tz,1]) }
function mat4perspective(fovy,asp,n,f){ const ft=1/Math.tan(fovy*0.5),nf=1/(n-f); return new Float32Array([ft/asp,0,0,0,0,ft,0,0,0,0,(n+f)*nf,-1,0,0,2*f*n*nf,0]) }
function mat3fromMat4(m){ return new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]) }

function buildCoinMesh(R,halfH,segs){
  const pos=[],nor=[],uv=[],ft=[],idx=[];let base=0
  const rimW=0.07,rimH=0.022,innerR=R-rimW,rimLen=Math.sqrt(rimW*rimW+rimH*rimH),rimNY=rimW/rimLen,rimNR=-rimH/rimLen
  pos.push(0,halfH,0);nor.push(0,1,0);uv.push(0.5,0.5);ft.push(1)
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a);pos.push(cx*innerR,halfH,cz*innerR);nor.push(0,1,0);uv.push(0.5+cx*0.5*(innerR/R),0.5+cz*0.5*(innerR/R));ft.push(1)}
  for(let i=0;i<segs;i++) idx.push(base,base+1+i,base+2+i);base+=segs+2
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a);pos.push(cx*innerR,halfH,cz*innerR);nor.push(cx*rimNR,rimNY,cz*rimNR);uv.push(0,0);ft.push(1);pos.push(cx*R,halfH+rimH,cz*R);nor.push(cx*rimNR,rimNY,cz*rimNR);uv.push(0,0);ft.push(1)}
  for(let i=0;i<segs;i++){const a=base+i*2;idx.push(a,a+1,a+3,a,a+3,a+2)}base+=(segs+1)*2
  pos.push(0,-halfH,0);nor.push(0,-1,0);uv.push(0.5,0.5);ft.push(2)
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a);pos.push(cx*innerR,-halfH,cz*innerR);nor.push(0,-1,0);uv.push(0.5+cx*0.5*(innerR/R),0.5-cz*0.5*(innerR/R));ft.push(2)}
  for(let i=0;i<segs;i++) idx.push(base,base+1+i,base+2+i);base+=segs+2
  for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a);pos.push(cx*innerR,-halfH,cz*innerR);nor.push(cx*rimNR,-rimNY,cz*rimNR);uv.push(0,0);ft.push(2);pos.push(cx*R,-halfH-rimH,cz*R);nor.push(cx*rimNR,-rimNY,cz*rimNR);uv.push(0,0);ft.push(2)}
  for(let i=0;i<segs;i++){const a=base+i*2;idx.push(a,a+1,a+3,a,a+3,a+2)}base+=(segs+1)*2
  const topY=halfH+rimH,botY=-halfH-rimH,rings=3
  for(let ri=0;ri<=rings;ri++){const t=ri/rings,y=botY+t*(topY-botY);for(let i=0;i<=segs;i++){const a=(i/segs)*Math.PI*2,x=Math.cos(a)*R,z=Math.sin(a)*R,chamf=Math.max(0,(Math.abs(t-0.5)-0.35)*6),nx2=Math.cos(a),nz2=Math.sin(a),ny2=t>0.5?chamf:-chamf,nl=Math.sqrt(nx2*nx2+ny2*ny2+nz2*nz2)||1;pos.push(x,y,z);nor.push(nx2/nl,ny2/nl,nz2/nl);uv.push(i/segs,t);ft.push(0)}}
  for(let ri=0;ri<rings;ri++) for(let i=0;i<segs;i++){const a=base+ri*(segs+1)+i,b=a+1,c=a+(segs+1),d=c+1;idx.push(a,b,d,a,d,c)}
  return{pos:new Float32Array(pos),nor:new Float32Array(nor),uv:new Float32Array(uv),ft:new Float32Array(ft),idx:new Uint16Array(idx),cnt:idx.length}
}

let gl=null,prog=null,buf=null,textTex=null,raf=null,prevTime=null
let ax=Math.PI*0.10,ay=0.3,vax=0,vay=0,posY=0,velY=0,idleT=0,isHead=true
let tsStart=null,tsLast=null,tsTime=0
let W=1,H=1

function createTextTexture(glCtx){
  const offscreen=document.createElement('canvas');offscreen.width=512;offscreen.height=256
  const ctx=offscreen.getContext('2d');ctx.clearRect(0,0,512,256)
  ctx.font='150px "Songti SC","SimSun","宋体",serif';ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillStyle='#000000';ctx.fillText('正',128,128);ctx.fillText('反',384,128)
  const tex=glCtx.createTexture();glCtx.bindTexture(glCtx.TEXTURE_2D,tex)
  glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_MIN_FILTER,glCtx.LINEAR)
  glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_MAG_FILTER,glCtx.LINEAR)
  glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_WRAP_S,glCtx.CLAMP_TO_EDGE)
  glCtx.texParameteri(glCtx.TEXTURE_2D,glCtx.TEXTURE_WRAP_T,glCtx.CLAMP_TO_EDGE)
  try{const imgData=ctx.getImageData(0,0,512,256);glCtx.texImage2D(glCtx.TEXTURE_2D,0,glCtx.RGBA,512,256,0,glCtx.RGBA,glCtx.UNSIGNED_BYTE,new Uint8Array(imgData.data.buffer))}
  catch(e){glCtx.texImage2D(glCtx.TEXTURE_2D,0,glCtx.RGBA,1,1,0,glCtx.RGBA,glCtx.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]))}
  return tex
}

function reset() {
  phase.value = 'idle'
  showResult.value = false
  tipText.value = '向上滑动抛出 / 点击按钮抛掷'
}

function handleGesture(e) {
  if (e.detail.type === 'swipe-up') {
    if (showResult.value) return
    flipCoin()
  }
}

function handleGestureClick(e) {
  if (showResult.value && e.detail.state === 'fist' && phase.value === 'done') {
    reset()
  }
}

onMounted(()=>{
  document.addEventListener('gesture-trigger', handleGesture)
  document.addEventListener('gesture-click', handleGestureClick)
  const cv=canvasRef.value;const rect=cv.getBoundingClientRect();const dpr=window.devicePixelRatio||2
  cv.width=rect.width*dpr;cv.height=rect.height*dpr;W=cv.width;H=cv.height
  gl=cv.getContext('webgl',{antialias:true,alpha: true,depth:true});if(!gl)return
  const mkS=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
  const vs=mkS(gl.VERTEX_SHADER,VERT_SRC),fs=mkS(gl.FRAGMENT_SHADER,FRAG_SRC)
  prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);gl.useProgram(prog)
  textTex=createTextTexture(gl)
  const geo=buildCoinMesh(1.0,0.055,56)
  const mkBuf=(d,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,d,gl.STATIC_DRAW);return b}
  buf={pos:mkBuf(geo.pos,gl.ARRAY_BUFFER),nor:mkBuf(geo.nor,gl.ARRAY_BUFFER),uv:mkBuf(geo.uv,gl.ARRAY_BUFFER),ft:mkBuf(geo.ft,gl.ARRAY_BUFFER),idx:mkBuf(geo.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:geo.cnt}
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
  if(!gl||!prog||!buf)return
  gl.viewport(0,0,W,H);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
  let M=mat4identity();M=mat4mul(mat4rotY(ay),M);M=mat4mul(mat4rotX(ax),M);M=mat4mul(mat4trans(0,posY,0),M)
  const V=mat4trans(0,0,-5),P=mat4perspective(Math.PI/3.2,W/H,0.1,50)
  const MVP=mat4mul(P,mat4mul(V,M)),NM=mat3fromMat4(M)
  const ba=(name,b,sz)=>{const loc=gl.getAttribLocation(prog,name);if(loc===-1)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0)}
  ba('aPos',buf.pos,3);ba('aNorm',buf.nor,3);ba('aUV',buf.uv,2);ba('aFaceType',buf.ft,1)
  const ul=n=>gl.getUniformLocation(prog,n)
  gl.uniformMatrix4fv(ul('uMVP'),false,MVP);gl.uniformMatrix3fv(ul('uNM'),false,NM)
  gl.uniform3f(ul('uLight'),1.1,0.5,0.8);gl.uniform3f(ul('uLight2'),-0.8,0.3,0.5)
  if(textTex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textTex);gl.uniform1i(ul('uTextTex'),0)}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf.idx);gl.drawElements(gl.TRIANGLES,buf.cnt,gl.UNSIGNED_SHORT,0)
}

function update(dt){
  const p=phase.value
  if(p==='idle'){idleT+=dt;ax=Math.PI/2+Math.sin(idleT*0.7)*0.08;ay+=0.010;posY=0}
  else if(p==='done'){idleT+=dt;const tgt=isHead?Math.PI/2:-Math.PI/2;ax=tgt+Math.sin(idleT*0.7)*0.08;ay+=0.010}
  else if(p==='throw'){
    ax+=vax*dt;ay+=vay*dt;velY-=18*dt;posY+=velY*dt
    if(posY<=0){const iv=Math.abs(velY);posY=0;velY=iv*0.35;vax*=0.45;vay*=0.45;if(iv>1.5)setTimeout(()=>playBounce(iv),0);if(velY<1.0)phase.value='settle'}
  }
  else if(p==='settle'){
    vax*=0.80;vay*=0.80;ax+=vax*dt;ay+=vay*dt;posY*=0.82
    if(Math.abs(vax)<0.02&&Math.abs(vay)<0.02){phase.value='done';onDone()}
  }
}

function onDone(){
  play('coinLand')
  let a=ax%(Math.PI*2);if(a>Math.PI)a-=Math.PI*2;if(a<-Math.PI)a+=Math.PI*2
  const head=Math.sin(a)>0;isHead=head
  const tgt=head?Math.PI/2:-Math.PI/2;let delta=tgt-a
  if(delta>Math.PI)delta-=Math.PI*2;if(delta<-Math.PI)delta+=Math.PI*2
  const startAx=a;const steps=15;let step=0
  function easeOut(){step++;const t=step/steps,e=1-Math.pow(1-t,5);ax=startAx+delta*e;if(step<steps)setTimeout(easeOut,16);else{ax=tgt;vax=0;vay=0;posY=0}}
  easeOut()
  const resultText=head?'正面（正）':'反面（反）'
  if(head)headCount.value++;else tailCount.value++
  result.value=resultText;showResult.value=true;tipText.value='再次向上滑动抛掷'
  store.saveHistory('🪙 命运硬币',`结果：${resultText}`,question.value || '（用户未输入问题）')
  phase.value='done'
}

function onTouchStart(e){const t=e.touches[0];tsStart={x:t.clientX,y:t.clientY};tsLast={x:t.clientX,y:t.clientY};tsTime=Date.now()}
function onTouchMove(e){if(!tsLast)return;const t=e.touches[0];if(phase.value==='idle'||phase.value==='done'){ay+=(t.clientX-tsLast.x)*0.018;ax+=(t.clientY-tsLast.y)*0.018};tsLast={x:t.clientX,y:t.clientY}}
function onTouchEnd(e){if(!tsStart)return;const t=e.changedTouches[0];const dy=tsStart.y-t.clientY;const elapsed=Math.max((Date.now()-tsTime)/1000,0.03);if(dy>20&&dy/elapsed>150)_throw(Math.min(dy/elapsed,1200));tsStart=null;tsLast=null}
let _md=false
function onMouseDown(e){_md=true;e.preventDefault();onTouchStart({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseMove(e){if(!_md)return;onTouchMove({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseUp(e){if(!_md)return;_md=false;onTouchEnd({changedTouches:[{clientX:e.clientX,clientY:e.clientY}]})}

function _throw(upSpeed){
  if(phase.value!=='idle'&&phase.value!=='done')return
  play('coinFlip');const force=Math.min(upSpeed/500,3.0)
  velY=5.0*force+3.0;posY=0;vax=(Math.random()<0.5?1:-1)*(15+Math.random()*8);vay=(Math.random()-0.5)*6
  phase.value='throw';showResult.value=false;tipText.value=''
}
function flipCoin(){_throw(400+Math.random()*300)}


</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }
.coin-stats { display: flex; justify-content: center; gap: 12px; font-size: 13px; color: #999; margin-bottom: 6px; }
.stat-sep { color: #ddd; }

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
