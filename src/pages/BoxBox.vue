<template>
  <div class="tech-container">
    <!-- Starfield/Matrix style dark futuristic background -->
    <canvas ref="bgCanvasRef" class="bg-canvas"></canvas>

    <div class="header">
      <router-link to="/" class="back-btn">← 返回首页</router-link>
      <h1 class="title">GLOWING PARTICLES</h1>
      <p class="subtitle">3D 粒子星轨立方体 & 凝视写意魔瞳</p>
    </div>

    <!-- Main webgl canvas container -->
    <div class="canvas-wrap"
         @mousedown="onMouseDown"
         @mousemove="onMouseMove"
         @mouseup="onMouseUp"
         @mouseleave="onMouseUp"
         @touchstart="onTouchStart"
         @touchmove="onTouchMove"
         @touchend="onTouchEnd">
      <canvas ref="canvasRef" class="cube-canvas"></canvas>
      <div class="interaction-hint">← 拖拽鼠标旋转立方体，眼睛将锁定你的鼠标 →</div>
    </div>

    <!-- Tech specs overlay -->
    <div class="tech-spec">
      <div class="spec-item"><span class="spec-label">RENDERER:</span> WebGL 1.0 (GLSL ES 100)</div>
      <div class="spec-item"><span class="spec-label">VERTICES:</span> 24,000 Particle Points</div>
      <div class="spec-item"><span class="spec-label">MATRIX:</span> 4x4 Orthographic/Perspective Projection</div>
      <div class="spec-item"><span class="spec-label">INTERACTION:</span> Euler Drag, Pointer Raycast Lock</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const bgCanvasRef = ref(null)

// --- Background Matrix/Starfield Animation ---
let bgCtx = null
let bgRaf = null
const bgStars = []

function initBg(cv) {
  bgCtx = cv.getContext('2d')
  const resize = () => {
    cv.width = window.innerWidth
    cv.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // generate stars
  for (let i = 0; i < 80; i++) {
    bgStars.push({
      x: Math.random() * cv.width,
      y: Math.random() * cv.height,
      r: Math.random() * 1.5 + 0.5,
      vy: Math.random() * 0.4 + 0.1,
      vx: (Math.random() - 0.5) * 0.1,
      alpha: Math.random() * 0.5 + 0.3
    })
  }

  function loop() {
    bgCtx.fillStyle = 'rgba(10, 10, 16, 0.2)'
    bgCtx.fillRect(0, 0, cv.width, cv.height)

    // Draw tech background grids
    bgCtx.strokeStyle = 'rgba(0, 255, 136, 0.03)'
    bgCtx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < cv.width; x += gridSize) {
      bgCtx.beginPath(); bgCtx.moveTo(x, 0); bgCtx.lineTo(x, cv.height); bgCtx.stroke()
    }
    for (let y = 0; y < cv.height; y += gridSize) {
      bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(cv.width, y); bgCtx.stroke()
    }

    // Stars
    for (const s of bgStars) {
      s.y += s.vy
      s.x += s.vx
      if (s.y > cv.height) { s.y = 0; s.x = Math.random() * cv.width }
      if (s.x > cv.width || s.x < 0) { s.x = Math.random() * cv.width }
      bgCtx.fillStyle = `rgba(0, 255, 136, ${s.alpha})`
      bgCtx.beginPath()
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      bgCtx.fill()
    }
    bgRaf = requestAnimationFrame(loop)
  }
  loop()

  return () => {
    window.removeEventListener('resize', resize)
  }
}

// ===== WebGL 3D Particle Eye-Cube Logic =====

// --- Shader source ---
const VERT_SRC = `
attribute vec3 aPos;
attribute vec3 aFaceNormal;
attribute float aFace; // 0 to 5 for each cube face
uniform mat4 uMVP;
uniform vec3 uEyePos; // Raycast locked eye look-at position in local cube space
uniform float uTransition; // Entrance animation progress (0.0 to 1.0)
uniform float uTime; // Animation running time in seconds
uniform float uClickWave; // Click impulse shockwave progress (0.0 to 1.0)

varying float vGlow;
varying float vIsPupil;

void main() {
  vec3 p = aPos;

  // 1. Entrance Assembly Animation
  // Particles fly in from a dispersed cosmic cloud of stardust!
  if (uTransition < 0.99) {
    // Generate deterministic pseudo-random direction based on position
    vec3 disperseDir = normalize(aPos + vec3(sin(aPos.x*12.0), cos(aPos.y*17.0), sin(aPos.z*19.0)));
    float disperseDist = 5.0 * (1.0 - uTransition);
    p += disperseDir * disperseDist;
  }

  // Each face of the cube has an "eye" in its center.
  // The center is in local coordinates:
  vec3 faceCenter = vec3(0.0);
  if (aFace < 0.5) faceCenter = vec3(0.0, 1.0, 0.0); // Top
  else if (aFace < 1.5) faceCenter = vec3(0.0, -1.0, 0.0); // Bottom
  else if (aFace < 2.5) faceCenter = vec3(0.0, 0.0, 1.0); // Front
  else if (aFace < 3.5) faceCenter = vec3(0.0, 0.0, -1.0); // Back
  else if (aFace < 4.5) faceCenter = vec3(1.0, 0.0, 0.0); // Right
  else faceCenter = vec3(-1.0, 0.0, 0.0); // Left

  // Local tangent coordinates
  vec3 tangentU = vec3(0.0);
  vec3 tangentV = vec3(0.0);
  if (aFace < 0.5) { tangentU = vec3(1.0,0.0,0.0); tangentV = vec3(0.0,0.0,1.0); }
  else if (aFace < 1.5) { tangentU = vec3(1.0,0.0,0.0); tangentV = vec3(0.0,0.0,-1.0); }
  else if (aFace < 2.5) { tangentU = vec3(1.0,0.0,0.0); tangentV = vec3(0.0,1.0,0.0); }
  else if (aFace < 3.5) { tangentU = vec3(-1.0,0.0,0.0); tangentV = vec3(0.0,1.0,0.0); }
  else if (aFace < 4.5) { tangentU = vec3(0.0,0.0,-1.0); tangentV = vec3(0.0,1.0,0.0); }
  else { tangentU = vec3(0.0,0.0,1.0); tangentV = vec3(0.0,1.0,0.0); }

  // Vector from face center to current point
  vec3 toPoint = p - faceCenter;
  float u = dot(toPoint, tangentU);
  float v = dot(toPoint, tangentV);

  // We want to draw an "eye" outline (almond shape) + look-at pupil.
  // Pupil center in tangent coords is projection of uEyePos onto this tangent plane
  vec3 toEye = uEyePos - faceCenter;
  float pupilU = clamp(dot(toEye, tangentU) * 0.35, -0.32, 0.32);
  float pupilV = clamp(dot(toEye, tangentV) * 0.35, -0.32, 0.32);

  // Almond-shaped sclera bounds: u^2 / a^2 + v^2 / b^2 < 1
  float scleraRadius = 0.58;
  float scleraA = scleraRadius * 1.35;
  float scleraB = scleraRadius * 0.85;
  float eyeVal = (u*u)/(scleraA*scleraA) + (v*v)/(scleraB*scleraB);

  // Pupil and iris circles relative to the shifted look-at pupil position!
  float du = u - pupilU;
  float dv = v - pupilV;
  float distToPupil = sqrt(du*du + dv*dv);

  float isPupil = 0.0;
  float isIris = 0.0;
  float glow = 0.0;

  if (eyeVal < 1.0) {
    // Inside the eye almond!
    if (distToPupil < 0.16) {
      // Core Pupil (absolutely black, hollow)
      isPupil = 1.0;
    } else if (distToPupil < 0.34) {
      // Glowing iris rings!
      isIris = 1.0;
      glow = 1.0 - (distToPupil - 0.16) / 0.18;

      // Let the iris breathe gently over time
      glow += sin(uTime * 4.0 + aPos.x * 2.0) * 0.12;
    } else {
      // Sclera (whites)
      glow = 0.28 + sin(uTime * 2.0) * 0.05;
    }
  } else {
    // Outside the eye (outer cube borders and particle star dust)
    // Make outer edges glow slightly
    float distToCenter = sqrt(u*u + v*v);
    glow = clamp((distToCenter - 0.5) * 0.42, 0.1, 0.65);

    // Add wave pulsing toouter borders
    glow += sin(distToCenter * 8.0 - uTime * 6.0) * 0.06;
  }

  // 2. Click Shockwave Particle Ripple
  // Displace particles slightly outward based on the expanding wave front
  if (uClickWave > 0.0 && uClickWave < 0.99) {
    float waveDist = uClickWave * 2.2; // wave expands up to 2.2 radius
    float distToWave = abs(length(p) - waveDist);
    if (distToWave < 0.25) {
      float force = (1.0 - distToWave / 0.25) * 0.12 * (1.0 - uClickWave);
      p += normalize(p) * force;
      glow += force * 3.0; // Make the wave front glow intensely!
    }
  }

  // Slightly jitter the particles vertically or outward to make them look like "cyber space dust"
  float jitterTime = uTime * 3.0 + aPos.y * 5.0;
  p += aFaceNormal * (sin(jitterTime) * 0.012);

  gl_Position = uMVP * vec4(p, 1.0);

  // Calculate size
  float baseSize = (eyeVal < 1.0 && isPupil < 0.5) ? 4.5 : 2.5;
  if (uTransition < 0.99) {
    baseSize *= uTransition; // expand sizes on entry
  }
  gl_PointSize = baseSize;

  vGlow = glow;
  vIsPupil = isPupil;
}
`

const FRAG_SRC = `
precision highp float;
varying float vGlow;
varying float vIsPupil;

void main() {
  if (vIsPupil > 0.5) {
    // Pupil is a black hollow void!
    gl_FragColor = vec4(0.04, 0.04, 0.08, 0.95);
  } else {
    // Super vibrant, luminous cyan/green digital glow
    vec3 glowColor = mix(vec3(0.0, 0.95, 1.0), vec3(0.0, 1.0, 0.45), vGlow);
    gl_FragColor = vec4(glowColor * vGlow * 1.5, vGlow * 0.82);
  }
}
`

// --- 3D Particle Generation ---
function buildParticleCube() {
  const positions = []
  const normals = []
  const faces = []

  const faceNormals = [
    [0,1,0],  // Top
    [0,-1,0], // Bottom
    [0,0,1],  // Front
    [0,0,-1], // Back
    [1,0,0],  // Right
    [-1,0,0]  // Left
  ]

  const faceTangentsU = [
    [1,0,0], [1,0,0], [1,0,0], [-1,0,0], [0,0,-1], [0,0,1]
  ]
  const faceTangentsV = [
    [0,0,1], [0,0,-1], [0,1,0], [0,1,0], [0,1,0], [0,1,0]
  ]

  // Generate 4000 particles per face = 24,000 total vertices!
  const particlesPerFace = 4000
  for (let f = 0; f < 6; f++) {
    const fn = faceNormals[f]
    const tu = faceTangentsU[f]
    const tv = faceTangentsV[f]

    for (let i = 0; i < particlesPerFace; i++) {
      // Fibonnaci spiral or uniform random distribution on a 2x2 plane
      const u = (Math.random() - 0.5) * 2.0
      const v = (Math.random() - 0.5) * 2.0

      // Compute local position: center + u*tangentU + v*tangentV
      const px = fn[0] + u * tu[0] + v * tv[0]
      const py = fn[1] + u * tu[1] + v * tv[1]
      const pz = fn[2] + u * tu[2] + v * tv[2]

      positions.push(px, py, pz)
      normals.push(fn[0], fn[1], fn[2])
      faces.push(f)
    }
  }

  return {
    pos: new Float32Array(positions),
    nor: new Float32Array(normals),
    face: new Float32Array(faces),
    cnt: positions.length / 3
  }
}

// --- Matrix Library ---
function mat4identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) }
function mat4mul(A,B){ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C }
function mat4rotX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]) }
function mat4rotY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]) }
function mat4trans(tx,ty,tz){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,tx,ty,tz,1]) }
function mat4perspective(fovy,aspect,near,far){ const f=1/Math.tan(fovy*0.5),nf=1/(near-far); return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(near+far)*nf,-1,0,0,2*far*near*nf,0]) }
function mat4inverse(m) {
  const out = new Float32Array(16)
  const n11 = m[0], n12 = m[1], n13 = m[2], n14 = m[3],
        n21 = m[4], n22 = m[5], n23 = m[6], n24 = m[7],
        n31 = m[8], n32 = m[9], n33 = m[10], n34 = m[11],
        n41 = m[12], n42 = m[13], n43 = m[14], n44 = m[15]
  const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44
  const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44
  const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44
  const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34
  const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14
  if (det === 0) return mat4identity()
  const idet = 1 / det
  out[0] = t11 * idet
  out[1] = t12 * idet
  out[2] = t13 * idet
  out[3] = t14 * idet
  out[4] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * idet
  out[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * idet
  out[6] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * idet
  out[7] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * idet
  out[8] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * idet
  out[9] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * idet
  out[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * idet
  out[11] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * idet
  out[12] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * idet
  out[13] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * idet
  out[14] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * idet
  out[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * idet
  return out
}

// --- WebGL Runtime State ---
let gl = null
let prog = null
let buf = {}
let glRaf = null

// Cosmic entrance animation progress
let transitionProgress = 0.0
let clickWaveProgress = 0.0
const animationStartTime = Date.now()

// Cube rotation angle
let ax = 0.5, ay = -0.6
let dax = 0, day = 0
let pointerX = window.innerWidth / 2, pointerY = window.innerHeight / 2
let w = 1, h = 1

// Interpolated smooth look-at target in local space
const curEyeLocal = new Float32Array([0, 0, 3])

// Smooth pointer interpolation variables to cancel any jitter
let smoothPointerX = window.innerWidth / 2
let smoothPointerY = window.innerHeight / 2

// --- Raycast Pointer to Local Cube Space Look-at Vector ---
function updateLookAtVector() {
  if (!gl) return

  // Smooth out pointer coordinates before matrix math projection
  smoothPointerX += (pointerX - smoothPointerX) * 0.12
  smoothPointerY += (pointerY - smoothPointerY) * 0.12

  // 1. Get Normalized Device Coordinates (NDC) of the smooth pointer
  const ndcX = (smoothPointerX / window.innerWidth) * 2 - 1
  const ndcY = -(smoothPointerY / window.innerHeight) * 2 + 1

  // 2. Build MVP matrix
  let M = mat4identity()
  M = mat4mul(mat4rotX(ax), M)
  M = mat4mul(mat4rotY(ay), M)
  M = mat4mul(mat4trans(0, 0, 0), M)

  const V = mat4trans(0, 0, -4.5)
  const P = mat4perspective(Math.PI / 4, w / h, 0.1, 100)
  const MV = mat4mul(V, M)
  const MVP = mat4mul(P, MV)

  // 3. Raycast unproject from NDC back to Cube local space!
  const invMVP = mat4inverse(MVP)

  // Near plane point
  const nearPtNdc = [ndcX, ndcY, -1.0, 1.0]
  const nearPtLocal = mulMat4Vec4(invMVP, nearPtNdc)

  // Far plane point
  const farPtNdc = [ndcX, ndcY, 1.0, 1.0]
  const farPtLocal = mulMat4Vec4(invMVP, farPtNdc)

  // Ray origin and ray direction in local cube coordinates
  const rO = [nearPtLocal[0]/nearPtLocal[3], nearPtLocal[1]/nearPtLocal[3], nearPtLocal[2]/nearPtLocal[3]]
  const rF = [farPtLocal[0]/farPtLocal[3], farPtLocal[1]/farPtLocal[3], farPtLocal[2]/farPtLocal[3]]
  const rD = [rF[0] - rO[0], rF[1] - rO[1], rF[2] - rO[2]]
  const rLen = Math.sqrt(rD[0]*rD[0] + rD[1]*rD[1] + rD[2]*rD[2])
  if (rLen > 0.0001) {
    rD[0]/=rLen; rD[1]/=rLen; rD[2]/=rLen;
  }

  // Let's set a lock target that represents the cursor "look-at" vector
  // We want to lock the look-at target ~3 units away in the cursor direction!
  const targetX = rO[0] + rD[0] * 3.5
  const targetY = rO[1] + rD[1] * 3.5
  const targetZ = rO[2] + rD[2] * 3.5

  // Smoothly lerp towards target with stable ease factor
  const ease = 0.05
  curEyeLocal[0] += (targetX - curEyeLocal[0]) * ease
  curEyeLocal[1] += (targetY - curEyeLocal[1]) * ease
  curEyeLocal[2] += (targetZ - curEyeLocal[2]) * ease
}

function mulMat4Vec4(M, v) {
  const out = [0,0,0,0]
  for (let r = 0; r < 4; r++) {
    out[r] = M[r]*v[0] + M[4+r]*v[1] + M[8+r]*v[2] + M[12+r]*v[3]
  }
  return out
}

function initWebGL(cv) {
  gl = cv.getContext('webgl', { antialias: true, alpha: true })
  if (!gl) { console.error('WebGL not available'); return }

  const mkShader = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compilation fail:', gl.getShaderInfoLog(s))
      return null
    }
    return s
  }

  const vs = mkShader(gl.VERTEX_SHADER, VERT_SRC)
  const fs = mkShader(gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vs || !fs) return

  prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Shader linking failed')
    return
  }

  gl.useProgram(prog)

  // Generate eye-cube particles
  const mesh = buildParticleCube()
  const mkBuf = (data, target) => {
    const b = gl.createBuffer()
    gl.bindBuffer(target, b)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    return b
  }

  buf = {
    pos: mkBuf(mesh.pos, gl.ARRAY_BUFFER),
    nor: mkBuf(mesh.nor, gl.ARRAY_BUFFER),
    face: mkBuf(mesh.face, gl.ARRAY_BUFFER),
    cnt: mesh.cnt
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE) // Luminous additive blending!
  gl.disable(gl.DEPTH_TEST) // Hollow particles look much cooler without depth clamping

  // Render loop
  function loop(time) {
    updateLookAtVector()

    const dpr = window.devicePixelRatio || 2
    const rect = cv.getBoundingClientRect()
    const targetW = Math.floor(rect.width * dpr)
    const targetH = Math.floor(rect.height * dpr)
    if (cv.width !== targetW || cv.height !== targetH) {
      cv.width = targetW
      cv.height = targetH
    }
    w = rect.width; h = rect.height

    gl.viewport(0, 0, cv.width, cv.height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Euler inertia physics
    ax += dax; ay += day
    dax *= 0.94; day *= 0.94

    // Gentle auto-float if user is idle
    if (Math.abs(dax) < 0.001 && Math.abs(day) < 0.001) {
      ay += 0.004
      ax = 0.42 + Math.sin(time * 0.0012) * 0.15
    }

    // 1. Update Entrance Assembly Interpolation
    if (transitionProgress < 0.999) {
      transitionProgress += (1.0 - transitionProgress) * 0.05
    } else {
      transitionProgress = 1.0
    }

    // 2. Update Click Gravity Ripple
    if (clickWaveProgress > 0.0) {
      clickWaveProgress += 0.03
      if (clickWaveProgress > 1.0) {
        clickWaveProgress = 0.0
      }
    }

    // Bind shaders & buffers
    gl.useProgram(prog)

    let M = mat4identity()
    M = mat4mul(mat4rotX(ax), M)
    M = mat4mul(mat4rotY(ay), M)

    const V = mat4trans(0, 0, -4.5)
    const P = mat4perspective(Math.PI / 4, w / h, 0.1, 100)
    const MVP = mat4mul(P, mat4mul(V, M))

    const bindAttr = (name, b, sz) => {
      const loc = gl.getAttribLocation(prog, name)
      if (loc === -1) return
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0)
    }

    bindAttr('aPos', buf.pos, 3)
    bindAttr('aFaceNormal', buf.nor, 3)
    bindAttr('aFace', buf.face, 1)

    const uMVP = gl.getUniformLocation(prog, 'uMVP')
    const uEyePos = gl.getUniformLocation(prog, 'uEyePos')
    const uTransition = gl.getUniformLocation(prog, 'uTransition')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uClickWave = gl.getUniformLocation(prog, 'uClickWave')

    // Calc total running seconds
    const elapsedSeconds = (Date.now() - animationStartTime) / 1000.0

    gl.uniformMatrix4fv(uMVP, false, MVP)
    gl.uniform3f(uEyePos, curEyeLocal[0], curEyeLocal[1], curEyeLocal[2])
    gl.uniform1f(uTransition, transitionProgress)
    gl.uniform1f(uTime, elapsedSeconds)
    gl.uniform1f(uClickWave, clickWaveProgress)

    gl.drawArrays(gl.POINTS, 0, buf.cnt)

    glRaf = requestAnimationFrame(loop)
  }
  glRaf = requestAnimationFrame(loop)
}

// --- Drag & Drop Rotation Events ---
let isDragging = false
let lastMouseX = 0, lastMouseY = 0

function onMouseDown(e) {
  isDragging = true
  lastMouseX = e.clientX
  lastMouseY = e.clientY

  // Trigger particle shockwave
  clickWaveProgress = 0.01
}

function onMouseMove(e) {
  pointerX = e.clientX
  pointerY = e.clientY
  if (!isDragging) return
  const dx = e.clientX - lastMouseX
  const dy = e.clientY - lastMouseY
  day = dx * 0.005
  dax = dy * 0.005
  lastMouseX = e.clientX
  lastMouseY = e.clientY
}

function onMouseUp() {
  isDragging = false
}

// Mobile Touches
function onTouchStart(e) {
  const t = e.touches[0]
  isDragging = true
  lastMouseX = t.clientX
  lastMouseY = t.clientY

  // Trigger particle shockwave
  clickWaveProgress = 0.01
}

function onTouchMove(e) {
  const t = e.touches[0]
  pointerX = t.clientX
  pointerY = t.clientY
  if (!isDragging) return
  const dx = t.clientX - lastMouseX
  const dy = t.clientY - lastMouseY
  day = dx * 0.006
  dax = dy * 0.006
  lastMouseX = t.clientX
  lastMouseY = t.clientY
}

function onTouchEnd() {
  isDragging = false
}

// Lifecycle Hooks
let cleanupBg = null
onMounted(() => {
  if (bgCanvasRef.value) {
    cleanupBg = initBg(bgCanvasRef.value)
  }
  if (canvasRef.value) {
    initWebGL(canvasRef.value)
  }
})

onUnmounted(() => {
  if (cleanupBg) cleanupBg()
  if (bgRaf) cancelAnimationFrame(bgRaf)
  if (glRaf) cancelAnimationFrame(glRaf)
})
</script>

<style scoped>
.tech-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: #05050a;
  overflow: hidden;
  font-family: 'Courier New', Courier, monospace;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.header {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
  pointer-events: auto;
}

.back-btn {
  display: inline-block;
  color: #00ff88;
  text-decoration: none;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1px;
  margin-bottom: 12px;
  padding: 6px 14px;
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 4px;
  background: rgba(0, 255, 136, 0.05);
  transition: background 0.2s, transform 0.2s;
}
.back-btn:hover {
  background: rgba(0, 255, 136, 0.15);
  transform: translateX(-4px);
}

.title {
  color: #ffffff;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 4px;
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.subtitle {
  color: #8888aa;
  font-size: 12px;
  letter-spacing: 2px;
  margin: 6px 0 0;
}

/* Canvas Wrap centering */
.canvas-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: auto;
}

.cube-canvas {
  width: min(84vw, 420px);
  height: min(84vw, 420px);
  cursor: grab;
}
.cube-canvas:active {
  cursor: grabbing;
}

.interaction-hint {
  color: #00ff88;
  font-size: 11px;
  letter-spacing: 1px;
  margin-top: 16px;
  opacity: 0.8;
  text-align: center;
  text-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
}

/* Tech Specs overlay style */
.tech-spec {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.spec-item {
  color: #8888aa;
  font-size: 10.5px;
  letter-spacing: 1.2px;
}
.spec-label {
  color: #00ff88;
  font-weight: bold;
}

/* Media Queries for Desktop layout scaling */
@media (min-width: 768px) {
  .title { font-size: 36px; }
  .cube-canvas {
    width: 500px;
    height: 500px;
  }
  .tech-spec {
    left: auto;
    right: 24px;
    text-align: right;
  }
}
</style>