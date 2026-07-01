import{_ as ye,o as Te,a as Ae,b as Fe,c as Me,d as R,e as x,h as Re,w as Ce,g as Se,r as re,E as Ee}from"./index-8391uUwC.js";const ke={class:"tech-container"},xe={class:"header"},Ve=`
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
`,Le=`
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
`,Be={__name:"BoxBox",setup(Ue){const G=re(null),X=re(null);let b=null,z=null;const te=[];function le(e){b=e.getContext("2d");const t=()=>{e.width=window.innerWidth,e.height=window.innerHeight};t(),window.addEventListener("resize",t);for(let i=0;i<80;i++)te.push({x:Math.random()*e.width,y:Math.random()*e.height,r:Math.random()*1.5+.5,vy:Math.random()*.4+.1,vx:(Math.random()-.5)*.1,alpha:Math.random()*.5+.3});function n(){b.fillStyle="rgba(10, 10, 16, 0.2)",b.fillRect(0,0,e.width,e.height),b.strokeStyle="rgba(0, 255, 136, 0.03)",b.lineWidth=1;const i=40;for(let o=0;o<e.width;o+=i)b.beginPath(),b.moveTo(o,0),b.lineTo(o,e.height),b.stroke();for(let o=0;o<e.height;o+=i)b.beginPath(),b.moveTo(0,o),b.lineTo(e.width,o),b.stroke();for(const o of te)o.y+=o.vy,o.x+=o.vx,o.y>e.height&&(o.y=0,o.x=Math.random()*e.width),(o.x>e.width||o.x<0)&&(o.x=Math.random()*e.width),b.fillStyle=`rgba(0, 255, 136, ${o.alpha})`,b.beginPath(),b.arc(o.x,o.y,o.r,0,Math.PI*2),b.fill();z=requestAnimationFrame(n)}return n(),()=>{window.removeEventListener("resize",t)}}function ce(){const e=[],t=[],n=[],i=[[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]],o=[[1,0,0],[1,0,0],[1,0,0],[-1,0,0],[0,0,-1],[0,0,1]],f=[[0,0,1],[0,0,-1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],d=4e3;for(let c=0;c<6;c++){const u=i[c],s=o[c],v=f[c];for(let p=0;p<d;p++){const l=(Math.random()-.5)*2,g=(Math.random()-.5)*2,r=u[0]+l*s[0]+g*v[0],h=u[1]+l*s[1]+g*v[1],m=u[2]+l*s[2]+g*v[2];e.push(r,h,m),t.push(u[0],u[1],u[2]),n.push(c)}}return{pos:new Float32Array(e),nor:new Float32Array(t),face:new Float32Array(n),cnt:e.length/3}}function O(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function T(e,t){const n=new Float32Array(16);for(let i=0;i<4;i++)for(let o=0;o<4;o++){let f=0;for(let d=0;d<4;d++)f+=e[d*4+o]*t[i*4+d];n[i*4+o]=f}return n}function ne(e){const t=Math.cos(e),n=Math.sin(e);return new Float32Array([1,0,0,0,0,t,n,0,0,-n,t,0,0,0,0,1])}function oe(e){const t=Math.cos(e),n=Math.sin(e);return new Float32Array([t,0,-n,0,0,1,0,0,n,0,t,0,0,0,0,1])}function H(e,t,n){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,e,t,n,1])}function ae(e,t,n,i){const o=1/Math.tan(e*.5),f=1/(n-i);return new Float32Array([o/t,0,0,0,0,o,0,0,0,0,(n+i)*f,-1,0,0,2*i*n*f,0])}function ue(e){const t=new Float32Array(16),n=e[0],i=e[1],o=e[2],f=e[3],d=e[4],c=e[5],u=e[6],s=e[7],v=e[8],p=e[9],l=e[10],g=e[11],r=e[12],h=e[13],m=e[14],w=e[15],k=u*g*h-s*l*h+s*p*m-c*g*m-u*p*w+c*l*w,F=f*l*h-o*g*h-f*p*m+i*g*m+o*p*w-i*l*w,D=o*s*h-f*u*h+f*c*m-i*s*m-o*c*w+i*u*w,N=f*u*p-o*s*p-f*c*l+i*s*l+o*c*g-i*u*g,Y=n*k+d*F+v*D+r*N;if(Y===0)return O();const P=1/Y;return t[0]=k*P,t[1]=F*P,t[2]=D*P,t[3]=N*P,t[4]=(s*l*r-u*g*r-s*v*m+d*g*m+u*v*w-d*l*w)*P,t[5]=(o*g*r-f*l*r+f*v*m-n*g*m-o*v*w+n*l*w)*P,t[6]=(f*u*r-o*s*r-f*d*m+n*s*m+o*d*w-n*u*w)*P,t[7]=(o*s*v-f*u*v+f*d*l-n*s*l-o*d*g+n*u*g)*P,t[8]=(c*g*r-s*p*r+s*v*h-d*g*h-c*v*w+d*p*w)*P,t[9]=(f*p*r-i*g*r-f*v*h+n*g*h+i*v*w-n*p*w)*P,t[10]=(i*s*r-f*c*r+f*d*h-n*s*h-i*d*w+n*c*w)*P,t[11]=(f*c*v-i*s*v-f*d*p+n*s*p+i*d*g-n*c*g)*P,t[12]=(u*p*r-c*l*r-u*v*h+d*l*h+c*v*m-d*p*m)*P,t[13]=(i*l*r-o*p*r+o*v*h-n*l*h-i*v*m+n*p*m)*P,t[14]=(o*c*r-i*u*r-o*d*h+n*u*h+i*d*m-n*c*m)*P,t[15]=(i*u*v-o*c*v+o*d*p-n*u*p-i*d*l+n*c*l)*P,t}let a=null,y=null,V={},I=null,L=0,M=0;const fe=Date.now();let W=.5,_=-.6,B=0,U=0,q=window.innerWidth/2,j=window.innerHeight/2,K=1,Z=1;const A=new Float32Array([0,0,3]);let $=window.innerWidth/2,J=window.innerHeight/2;function de(){if(!a)return;$+=(q-$)*.12,J+=(j-J)*.12;const e=$/window.innerWidth*2-1,t=-(J/window.innerHeight)*2+1;let n=O();n=T(ne(W),n),n=T(oe(_),n),n=T(H(0,0,0),n);const i=H(0,0,-4.5),o=ae(Math.PI/4,K/Z,.1,100),f=T(i,n),d=T(o,f),c=ue(d),s=ie(c,[e,t,-1,1]),p=ie(c,[e,t,1,1]),l=[s[0]/s[3],s[1]/s[3],s[2]/s[3]],g=[p[0]/p[3],p[1]/p[3],p[2]/p[3]],r=[g[0]-l[0],g[1]-l[1],g[2]-l[2]],h=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]);h>1e-4&&(r[0]/=h,r[1]/=h,r[2]/=h);const m=l[0]+r[0]*3.5,w=l[1]+r[1]*3.5,k=l[2]+r[2]*3.5,F=.05;A[0]+=(m-A[0])*F,A[1]+=(w-A[1])*F,A[2]+=(k-A[2])*F}function ie(e,t){const n=[0,0,0,0];for(let i=0;i<4;i++)n[i]=e[i]*t[0]+e[4+i]*t[1]+e[8+i]*t[2]+e[12+i]*t[3];return n}function pe(e){if(a=e.getContext("webgl",{antialias:!0,alpha:!0}),!a){console.error("WebGL not available");return}const t=(c,u)=>{const s=a.createShader(c);return a.shaderSource(s,u),a.compileShader(s),a.getShaderParameter(s,a.COMPILE_STATUS)?s:(console.error("Shader compilation fail:",a.getShaderInfoLog(s)),null)},n=t(a.VERTEX_SHADER,Ve),i=t(a.FRAGMENT_SHADER,Le);if(!n||!i)return;if(y=a.createProgram(),a.attachShader(y,n),a.attachShader(y,i),a.linkProgram(y),!a.getProgramParameter(y,a.LINK_STATUS)){console.error("Shader linking failed");return}a.useProgram(y);const o=ce(),f=(c,u)=>{const s=a.createBuffer();return a.bindBuffer(u,s),a.bufferData(u,c,a.STATIC_DRAW),s};V={pos:f(o.pos,a.ARRAY_BUFFER),nor:f(o.nor,a.ARRAY_BUFFER),face:f(o.face,a.ARRAY_BUFFER),cnt:o.cnt},a.enable(a.BLEND),a.blendFunc(a.SRC_ALPHA,a.ONE),a.disable(a.DEPTH_TEST);function d(c){de();const u=window.devicePixelRatio||2,s=e.getBoundingClientRect(),v=Math.floor(s.width*u),p=Math.floor(s.height*u);(e.width!==v||e.height!==p)&&(e.width=v,e.height=p),K=s.width,Z=s.height,a.viewport(0,0,e.width,e.height),a.clear(a.COLOR_BUFFER_BIT),W+=B,_+=U,B*=.94,U*=.94,Math.abs(B)<.001&&Math.abs(U)<.001&&(_+=.004,W=.42+Math.sin(c*.0012)*.15),L<.999?L+=(1-L)*.05:L=1,M>0&&(M+=.03,M>1&&(M=0)),a.useProgram(y);let l=O();l=T(ne(W),l),l=T(oe(_),l);const g=H(0,0,-4.5),r=ae(Math.PI/4,K/Z,.1,100),h=T(r,T(g,l)),m=(P,Pe,be)=>{const ee=a.getAttribLocation(y,P);ee!==-1&&(a.bindBuffer(a.ARRAY_BUFFER,Pe),a.enableVertexAttribArray(ee),a.vertexAttribPointer(ee,be,a.FLOAT,!1,0,0))};m("aPos",V.pos,3),m("aFaceNormal",V.nor,3),m("aFace",V.face,1);const w=a.getUniformLocation(y,"uMVP"),k=a.getUniformLocation(y,"uEyePos"),F=a.getUniformLocation(y,"uTransition"),D=a.getUniformLocation(y,"uTime"),N=a.getUniformLocation(y,"uClickWave"),Y=(Date.now()-fe)/1e3;a.uniformMatrix4fv(w,!1,h),a.uniform3f(k,A[0],A[1],A[2]),a.uniform1f(F,L),a.uniform1f(D,Y),a.uniform1f(N,M),a.drawArrays(a.POINTS,0,V.cnt),I=requestAnimationFrame(d)}I=requestAnimationFrame(d)}let C=!1,S=0,E=0;function ge(e){C=!0,S=e.clientX,E=e.clientY,M=.01}function ve(e){if(q=e.clientX,j=e.clientY,!C)return;const t=e.clientX-S,n=e.clientY-E;U=t*.005,B=n*.005,S=e.clientX,E=e.clientY}function se(){C=!1}function he(e){const t=e.touches[0];C=!0,S=t.clientX,E=t.clientY,M=.01}function me(e){const t=e.touches[0];if(q=t.clientX,j=t.clientY,!C)return;const n=t.clientX-S,i=t.clientY-E;U=n*.006,B=i*.006,S=t.clientX,E=t.clientY}function we(){C=!1}let Q=null;return Te(()=>{X.value&&(Q=le(X.value)),G.value&&pe(G.value)}),Ae(()=>{Q&&Q(),z&&cancelAnimationFrame(z),I&&cancelAnimationFrame(I)}),(e,t)=>{const n=Ee("router-link");return Fe(),Me("div",ke,[R("canvas",{ref_key:"bgCanvasRef",ref:X,class:"bg-canvas"},null,512),t[7]||(t[7]=x()),R("div",xe,[Re(n,{to:"/",class:"back-btn"},{default:Ce(()=>[...t[0]||(t[0]=[x("← 返回首页",-1)])]),_:1}),t[1]||(t[1]=x()),t[2]||(t[2]=R("h1",{class:"title"},"GLOWING PARTICLES",-1)),t[3]||(t[3]=x()),t[4]||(t[4]=R("p",{class:"subtitle"},"3D 粒子星轨立方体 & 凝视写意魔瞳",-1))]),t[8]||(t[8]=x()),R("div",{class:"canvas-wrap",onMousedown:ge,onMousemove:ve,onMouseup:se,onMouseleave:se,onTouchstart:he,onTouchmove:me,onTouchend:we},[R("canvas",{ref_key:"canvasRef",ref:G,class:"cube-canvas"},null,512),t[5]||(t[5]=x()),t[6]||(t[6]=R("div",{class:"interaction-hint"},"← 拖拽鼠标旋转立方体，眼睛将锁定你的鼠标 →",-1))],32),t[9]||(t[9]=Se(' <div class="tech-spec" data-v-9433b26e><div class="spec-item" data-v-9433b26e><span class="spec-label" data-v-9433b26e>RENDERER:</span> WebGL 1.0 (GLSL ES 100)</div> <div class="spec-item" data-v-9433b26e><span class="spec-label" data-v-9433b26e>VERTICES:</span> 24,000 Particle Points</div> <div class="spec-item" data-v-9433b26e><span class="spec-label" data-v-9433b26e>MATRIX:</span> 4x4 Orthographic/Perspective Projection</div> <div class="spec-item" data-v-9433b26e><span class="spec-label" data-v-9433b26e>INTERACTION:</span> Euler Drag, Pointer Raycast Lock</div></div>',2))])}}},We=ye(Be,[["__scopeId","data-v-9433b26e"]]);export{We as default};
