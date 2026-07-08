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
            <span class="help-popup-content">圣杯在民间信仰中通常指掷杯筊，掷杯筊是中国传统占卜方式，又称"掷珓""掷碑珓"，在闽南、潮汕及台湾地区也被称为"信杯"或"卦杯"，主要用于人与神灵的沟通请示。
一平一凸为"圣杯"表示许可，两平为"笑杯"需重掷，两凸为"阴杯"表示否定。
连续三次圣杯为神明明确示意标准。

如何使用：
1.选择安静的环境，保持心神专一，不可在酒后或心怀戏谑时进行，清晰报上姓名、年龄、住址，说明想请示的事情，一次只问一件事。
2.禀报完毕后，等约10秒钟，给神明"思考"的时间。
3.点击按钮或使用手指投掷出圣杯，根据落地后的形态判断神明的回应。

答案仅供参考，最终决定永远由你自己做出。</span>
        </div>
      </div>
      </Transition>
      <div class="page-title">掷圣杯</div>
      <div class="page-subtitle">三掷辨征兆，诚心问所求</div>
      <input class="input-field" placeholder="输入所问之事（可选）" v-model="question" />
      <div class="stage-area"
        @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
        @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp"
        style="cursor:grab">
        <canvas ref="canvasRef" class="stage-canvas"></canvas>
      </div>
      <button class="btn-gold" @click="throwJiao" :disabled="phase !== 'idle' && phase !== 'done'">
        {{ (phase === 'throw' || phase === 'bounce' || phase === 'settle' || phase === 'snap') ? '圣杯飞旋中...' : '掷圣杯' }}
      </button>
      <div v-if="tipText" class="hint-text"><span class="hint-icon">💡</span><span>{{ tipText }}</span></div>
      <Transition name="slide-fade">
        <div v-if="showResult" class="result-box">
          <div class="result-title" style="font-size:32px">{{ resultEmoji }}</div>
          <div class="result-title">{{ resultTitle }}</div>
          <div class="result-text">{{ resultDesc }}</div>
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
const resultEmoji = ref(''), resultTitle = ref(''), resultDesc = ref('')
const tipText = ref('向上滑动 / 点击按钮掷圣杯')
const question = ref('')
const phase = ref('idle')

const VERT_SRC = `attribute vec3 aPos;attribute vec3 aNorm;uniform mat4 uMVP;uniform mat3 uNM;varying vec3 vN;varying vec3 vPos;void main(){gl_Position=uMVP*vec4(aPos,1.0);vN=normalize(uNM*aNorm);vPos=aPos;}`
const FRAG_SRC = `precision highp float;varying vec3 vN;varying vec3 vPos;uniform vec3 uLight;uniform vec3 uLight2;uniform float uIsFlat;void main(){vec3 n=normalize(vN);vec3 ld=normalize(uLight);vec3 ld2=normalize(uLight2);vec3 vd=normalize(vec3(0.,0.3,1.));vec3 h=normalize(ld+vd),h2=normalize(ld2+vd);float diff=max(dot(n,ld),0.),diff2=max(dot(n,ld2),0.)*.4,spec=pow(max(dot(n,h),0.),40.)*.2,spec2=pow(max(dot(n,h2),0.),20.)*.1,fresnel=pow(1.-max(dot(n,vd),0.),2.)*.15;float lit=.40+diff*.55+diff2+spec+spec2+fresnel;float g1=sin(vPos.x*15.+vPos.z*8.+vPos.y*3.)*.04,g2=sin(vPos.x*25.-vPos.z*12.+sin(vPos.y*6.)*3.)*.02,g3=sin(vPos.z*18.+vPos.x*5.+cos(vPos.y*4.)*2.)*.015,ring=sin(length(vPos.xz)*12.+vPos.y*5.)*.02;float grain=g1+g2+g3;vec3 wb=vec3(.72,.42,.22),wd=vec3(.55,.30,.15),wl=vec3(.85,.55,.32);vec3 col=wb+wl*grain*2.+wd*ring;float fg=sin(vPos.x*20.+vPos.z*15.)*.03;if(uIsFlat>.5){col*=.85;col+=vec3(.1,.05,.02)*fg;}col=col*lit+vec3(.9,.7,.4)*spec*.3;gl_FragColor=vec4(col,1.);}`

function mat4identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) }
function mat4mul(A,B){ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C }
function mat4rotX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]) }
function mat4rotY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]) }
function mat4rotZ(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]) }
function mat4trans(x,y,z){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]) }
function mat4perspective(fovy,asp,n,f){ const ft=1/Math.tan(fovy*0.5),nf=1/(n-f); return new Float32Array([ft/asp,0,0,0,0,ft,0,0,0,0,(n+f)*nf,-1,0,0,2*f*n*nf,0]) }
function mat3fromMat4(m){ return new Float32Array([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]]) }
function nearAngle(cur,tgt){ const PI2=Math.PI*2;let t=((tgt%PI2)+PI2)%PI2;const d=cur-t;t+=Math.round(d/PI2)*PI2;return t }

function _cupConvexH(u,T){ return Math.sqrt(Math.max(0,1-u*u))*T }
function buildCupMesh(){
  const pos=[],nor=[],idx=[]
  const RING_SEG=16,ARC_SEG=64,R=1.5,W=0.6,K=0.25,T=1.00
  let base=0
  for(let ring=0;ring<=RING_SEG;ring++){ const t=ring/RING_SEG; for(let arc=0;arc<=ARC_SEG;arc++){ const phi=(arc/ARC_SEG)*Math.PI*2,x0=R*t*Math.cos(phi),y0=W*t*Math.sin(phi),x=x0,y=y0-K*(R*R-x0*x0),z=0; pos.push(x,y,z);nor.push(0,0,1) } }
  for(let r=0;r<RING_SEG;r++) for(let a=0;a<ARC_SEG;a++){ const A=base+r*(ARC_SEG+1)+a,B=A+1,C=A+(ARC_SEG+1),D=C+1;idx.push(A,B,D,A,D,C) }
  base+=(RING_SEG+1)*(ARC_SEG+1)
  for(let ring=0;ring<=RING_SEG;ring++){ const t=ring/RING_SEG; for(let arc=0;arc<=ARC_SEG;arc++){ const phi=(arc/ARC_SEG)*Math.PI*2,x0=R*t*Math.cos(phi),y0=W*t*Math.sin(phi),x=x0,y=y0-K*(R*R-x0*x0),z=-T*(1-t*t); pos.push(x,y,z); const dx_dt=R*Math.cos(phi),dy_dt=W*Math.sin(phi)+2*K*R*R*t*Math.cos(phi)*Math.cos(phi),dz_dt=2*T*t,dx_dphi=-R*t*Math.sin(phi),dy_dphi=W*t*Math.cos(phi)-2*K*R*R*t*t*Math.cos(phi)*Math.sin(phi),dz_dphi=0; const nx=dy_dphi*dz_dt,ny=-dx_dphi*dz_dt,nz=dx_dphi*dy_dt-dy_dphi*dx_dt,nl=Math.sqrt(nx*nx+ny*ny+nz*nz); if(nl>0.0001){nor.push(nx/nl,ny/nl,nz/nl)}else{nor.push(0,0,-1)} } }
  for(let r=0;r<RING_SEG;r++) for(let a=0;a<ARC_SEG;a++){ const A=base+r*(ARC_SEG+1)+a,B=A+1,C=A+(ARC_SEG+1),D=C+1;idx.push(A,D,B,A,C,D) }
  return{pos:new Float32Array(pos),nor:new Float32Array(nor),idx:new Uint16Array(idx),cnt:idx.length}
}

function getCupFace(ax,ay){ return Math.cos(ax)*Math.cos(ay)>=0?'yang':'yin' }

let gl=null,prog=null,buf=null,raf=null
let W=1,H=1,dpr=2,idleT=0
let snapT=0,snapStart=null,snapTarget=null,snapResult=null
let prevTime=null
const cups = [
  {ox:-0.85,side:1,ax:0,ay:0,az:-Math.PI/2,vax:0,vay:0,vaz:0,posY:0,velY:0,bounces:0,isUp:true},
  {ox:0.85,side:-1,ax:0,ay:0,az:Math.PI/2,vax:0,vay:0,vaz:0,posY:0,velY:0,bounces:0,isUp:true},
]
let tsStart=null,tsLast=null,tsTime=0

function reset() {
  phase.value = 'idle'
  showResult.value = false
  tipText.value = '向上滑动 / 点击按钮掷圣杯'
}

function handleGesture(e) {
  if (e.detail.type === 'swipe-up') {
    if (showResult.value) return
    throwJiao()
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
  dpr=window.devicePixelRatio||2
  const cv=canvasRef.value;const rect=cv.getBoundingClientRect()
  cv.width=rect.width*dpr;cv.height=rect.height*dpr;W=cv.width;H=cv.height
  gl=cv.getContext('webgl',{antialias:true,alpha: true,depth:true});if(!gl)return
  const mkS=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
  const vs=mkS(gl.VERTEX_SHADER,VERT_SRC),fs=mkS(gl.FRAGMENT_SHADER,FRAG_SRC)
  prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);gl.useProgram(prog)
  const geo=buildCupMesh()
  const mkBuf=(d,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,d,gl.STATIC_DRAW);return b}
  buf={pos:mkBuf(geo.pos,gl.ARRAY_BUFFER),nor:mkBuf(geo.nor,gl.ARRAY_BUFFER),idx:mkBuf(geo.idx,gl.ELEMENT_ARRAY_BUFFER),cnt:geo.cnt}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0.0, 0.0, 0.0, 0.0)
  function frame(ts){ const dt=prevTime?Math.min((ts-prevTime)/1000,0.05):1/60;prevTime=ts;update(dt);render();raf=requestAnimationFrame(frame) }
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
  const asp=W/H,P=mat4perspective(Math.PI/3.5,asp,0.1,50)
  let V=mat4trans(0,0,-6.5);V=mat4mul(V,mat4rotX(-0.18))
  const ba=(name,b,sz)=>{const loc=gl.getAttribLocation(prog,name);if(loc===-1)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0)}
  ba('aPos',buf.pos,3);ba('aNorm',buf.nor,3)
  const ul=n=>gl.getUniformLocation(prog,n)
  gl.uniform3f(ul('uLight'),0.6,1.0,0.8);gl.uniform3f(ul('uLight2'),-0.4,0.5,0.6)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buf.idx)
  cups.forEach(cup=>{
    let M=mat4identity();M=mat4mul(mat4rotX(cup.ax),M);M=mat4mul(mat4rotY(cup.ay),M);M=mat4mul(mat4rotZ(cup.az),M);M=mat4mul(mat4trans(cup.ox,cup.posY,0),M)
    gl.uniformMatrix4fv(ul('uMVP'),false,mat4mul(P,mat4mul(V,M)));gl.uniformMatrix3fv(ul('uNM'),false,mat3fromMat4(M))
    gl.uniform1f(ul('uIsFlat'),cup.isUp?1.0:0.0)
    gl.drawElements(gl.TRIANGLES,buf.cnt,gl.UNSIGNED_SHORT,0)
  })
}

function update(dt){
  const p=phase.value
  if(p==='idle'){ idleT+=dt;cups.forEach((cup,i)=>{ cup.az=cup.side>0?-Math.PI/2:Math.PI/2;cup.ay=0;cup.ax=Math.sin(idleT*0.35+i*1.5)*0.05;cup.posY=0 }) }
  else if(p==='done'){ idleT+=dt;cups.forEach((cup,i)=>{ cup.ax=Math.sin(idleT*0.2+i)*0.02 }) }
  else if(p==='throw'||p==='bounce'){
    let allDone=true
    cups.forEach(cup=>{ cup.ax+=cup.vax*dt;cup.ay+=cup.vay*dt;cup.az+=cup.vaz*dt;cup.velY-=18*dt;cup.posY+=cup.velY*dt
      if(cup.posY<=0){ const iv=Math.abs(cup.velY);cup.posY=0;cup.velY=iv*0.35;cup.vax*=0.45;cup.vay*=0.45;cup.vaz*=0.45;cup.bounces++;if(iv>1.5)setTimeout(()=>playBounce(iv),0);if(cup.velY<1.0)phase.value='settle' }
      if(cup.velY>0.5||Math.abs(cup.vax)>0.1)allDone=false
    })
    if(allDone&&p==='throw')phase.value='settle'
  } else if(p==='settle'){
    let allDone=true
    cups.forEach(cup=>{ cup.vax*=0.82;cup.vay*=0.82;cup.vaz*=0.82;cup.ax+=cup.vax*dt;cup.ay+=cup.vay*dt;cup.az+=cup.vaz*dt;cup.posY*=0.85
      if(Math.abs(cup.vax)>=0.02||Math.abs(cup.vay)>=0.02)allDone=false
    })
    if(allDone){ phase.value='snap';startSnap() }
  } else if(p==='snap'){
    snapT+=dt*2.0;const t=Math.min(snapT,1),ease=t<0.5?2*t*t:(1-Math.pow(-2*t+2,2)/2)
    cups.forEach((cup,i)=>{ cup.ax=snapStart.ax[i]+(snapTarget.ax[i]-snapStart.ax[i])*ease;cup.ay=snapStart.ay[i]+(snapTarget.ay[i]-snapStart.ay[i])*ease;cup.az=snapStart.az[i]+(snapTarget.az[i]-snapStart.az[i])*ease;cup.posY=snapStart.posY[i]*(1-ease) })
    if(t>=1){ cups.forEach((cup,i)=>{ cup.ax=snapTarget.ax[i];cup.ay=snapTarget.ay[i];cup.az=snapTarget.az[i];cup.posY=0;cup.vax=cup.vay=cup.vaz=0 });phase.value='done';onDone(snapResult) }
  }
}

function startSnap(){
  const faces=cups.map(cup=>getCupFace(cup.ax,cup.ay));snapResult=faces
  snapStart={ax:cups.map(c=>c.ax),ay:cups.map(c=>c.ay),az:cups.map(c=>c.az),posY:cups.map(c=>c.posY)}
  snapTarget={ax:[0,0],ay:cups.map((cup,i)=>nearAngle(cup.ay,faces[i]==='yang'?0:Math.PI)),az:cups.map(cup=>nearAngle(cup.az,cup.side>0?-Math.PI/2:Math.PI/2))}
  snapT=0
}

function onTouchStart(e){ const t=e.touches[0];tsStart={x:t.clientX,y:t.clientY};tsLast={x:t.clientX,y:t.clientY};tsTime=Date.now() }
function onTouchMove(e){ if(!tsLast)return;tsLast={x:e.touches[0].clientX,y:e.touches[0].clientY} }
function onTouchEnd(e){ if(!tsStart)return;const t=e.changedTouches[0];const dy=tsStart.y-t.clientY;const elapsed=Math.max((Date.now()-tsTime)/1000,0.03);if(dy>20&&dy/elapsed>150)_throw(dy/elapsed*0.5);tsStart=null;tsLast=null }
let _md=false
function onMouseDown(e){_md=true;e.preventDefault();onTouchStart({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseMove(e){if(!_md)return;onTouchMove({touches:[{clientX:e.clientX,clientY:e.clientY}]})}
function onMouseUp(e){if(!_md)return;_md=false;onTouchEnd({changedTouches:[{clientX:e.clientX,clientY:e.clientY}]})}

function _throw(upSpeed){
  if(phase.value!=='idle'&&phase.value!=='done')return
  play('diceRoll');const force=Math.max(0.8,Math.min(upSpeed/400,2.5))
  cups.forEach(cup=>{ cup.posY=0;cup.velY=(4+Math.random()*1.5)*force;cup.vax=(Math.random()-0.5)*18*force;cup.vay=(Math.random()-0.5)*12*force;cup.vaz=(Math.random()-0.5)*8*force;cup.bounces=0 })
  phase.value='throw';showResult.value=false;tipText.value=''
}
function throwJiao(){ _throw(350+Math.random()*300) }



function onDone(faces){
  play('stickLand')
  const c0y=faces[0]==='yang',c1y=faces[1]==='yang'
  let res
  if(c0y&&c1y) res={emoji:'😊',title:'笑杯（两阳）',desc:'神明没想好，代表问题没说清或时机未到，需要重新请示'}
  else if(!c0y&&!c1y) res={emoji:'😔',title:'阴杯（两阴）',desc:'神明摇头，代表事情不可行、不同意或凶多吉少，建议暂停或反思。'}
  else res={emoji:'✅',title:'圣杯（一阴一阳）',desc:'神明点头，代表事情可行、同意或吉利，是最想看到的结果。'}
  cups[0].isUp=c0y;cups[1].isUp=c1y
  resultEmoji.value=res.emoji;resultTitle.value=res.title;resultDesc.value=res.desc;showResult.value=true
  tipText.value='再次滑动掷杯'
  store.saveHistory('🙏 掷圣杯',res.title,question.value || '（用户未输入问题）')
}
</script>

<style scoped>
.container { min-height: 100vh; background: var(--page-bg, #F8F8FA); padding-bottom: 10px; }

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
