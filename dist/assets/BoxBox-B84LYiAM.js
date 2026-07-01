import{_ as pt,o as vt,a as wt,b as Pt,c as mt,d as R,e as x,h as bt,w as yt,g as Ft,r as at,E as At}from"./index-BkdHK9Cl.js";const Mt={class:"tech-container"},Rt={class:"header"},Et=`
attribute vec3 aPos;
attribute vec3 aFaceNormal;
attribute float aFace; // 0 to 5 for each cube face
uniform mat4 uMVP;
uniform vec3 uEyePos; // Raycast locked eye look-at position in local cube space
varying float vGlow;
varying float vIsPupil;

void main() {
  vec3 p = aPos;

  // Let's calculate the eye pupil lock!
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
    } else {
      // Sclera (whites)
      glow = 0.28;
    }
  } else {
    // Outside the eye (outer cube borders and particle star dust)
    // Make outer edges glow slightly
    float distToCenter = sqrt(u*u + v*v);
    glow = clamp((distToCenter - 0.5) * 0.42, 0.1, 0.65);
  }

  // Slightly jitter the particles vertically or outward to make them look like "cyber space dust"
  float time = uEyePos.x * 2.1 + aPos.y * 3.5; // using uEyePos as a general moving uniform
  p += aFaceNormal * (sin(time) * 0.015);

  gl_Position = uMVP * vec4(p, 1.0);
  gl_PointSize = (eyeVal < 1.0 && isPupil < 0.5) ? 4.5 : 2.5;

  vGlow = glow;
  vIsPupil = isPupil;
}
`,Tt=`
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
`,St={__name:"BoxBox",setup(Vt){const X=at(null),G=at(null);let m=null,D=null;const J=[];function it(t){m=t.getContext("2d");const e=()=>{t.width=window.innerWidth,t.height=window.innerHeight};e(),window.addEventListener("resize",e);for(let a=0;a<80;a++)J.push({x:Math.random()*t.width,y:Math.random()*t.height,r:Math.random()*1.5+.5,vy:Math.random()*.4+.1,vx:(Math.random()-.5)*.1,alpha:Math.random()*.5+.3});function n(){m.fillStyle="rgba(10, 10, 16, 0.2)",m.fillRect(0,0,t.width,t.height),m.strokeStyle="rgba(0, 255, 136, 0.03)",m.lineWidth=1;const a=40;for(let o=0;o<t.width;o+=a)m.beginPath(),m.moveTo(o,0),m.lineTo(o,t.height),m.stroke();for(let o=0;o<t.height;o+=a)m.beginPath(),m.moveTo(0,o),m.lineTo(t.width,o),m.stroke();for(const o of J)o.y+=o.vy,o.x+=o.vx,o.y>t.height&&(o.y=0,o.x=Math.random()*t.width),(o.x>t.width||o.x<0)&&(o.x=Math.random()*t.width),m.fillStyle=`rgba(0, 255, 136, ${o.alpha})`,m.beginPath(),m.arc(o.x,o.y,o.r,0,Math.PI*2),m.fill();D=requestAnimationFrame(n)}return n(),()=>{window.removeEventListener("resize",e)}}function st(){const t=[],e=[],n=[],a=[[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]],o=[[1,0,0],[1,0,0],[1,0,0],[-1,0,0],[0,0,-1],[0,0,1]],f=[[0,0,1],[0,0,-1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],d=4e3;for(let c=0;c<6;c++){const u=a[c],s=o[c],p=f[c];for(let h=0;h<d;h++){const l=(Math.random()-.5)*2,g=(Math.random()-.5)*2,r=u[0]+l*s[0]+g*p[0],v=u[1]+l*s[1]+g*p[1],w=u[2]+l*s[2]+g*p[2];t.push(r,v,w),e.push(u[0],u[1],u[2]),n.push(c)}}return{pos:new Float32Array(t),nor:new Float32Array(e),face:new Float32Array(n),cnt:t.length/3}}function W(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function F(t,e){const n=new Float32Array(16);for(let a=0;a<4;a++)for(let o=0;o<4;o++){let f=0;for(let d=0;d<4;d++)f+=t[d*4+o]*e[a*4+d];n[a*4+o]=f}return n}function Q(t){const e=Math.cos(t),n=Math.sin(t);return new Float32Array([1,0,0,0,0,e,n,0,0,-n,e,0,0,0,0,1])}function tt(t){const e=Math.cos(t),n=Math.sin(t);return new Float32Array([e,0,-n,0,0,1,0,0,n,0,e,0,0,0,0,1])}function O(t,e,n){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,t,e,n,1])}function et(t,e,n,a){const o=1/Math.tan(t*.5),f=1/(n-a);return new Float32Array([o/e,0,0,0,0,o,0,0,0,0,(n+a)*f,-1,0,0,2*a*n*f,0])}function rt(t){const e=new Float32Array(16),n=t[0],a=t[1],o=t[2],f=t[3],d=t[4],c=t[5],u=t[6],s=t[7],p=t[8],h=t[9],l=t[10],g=t[11],r=t[12],v=t[13],w=t[14],P=t[15],V=u*g*v-s*l*v+s*h*w-c*g*w-u*h*P+c*l*P,M=f*l*v-o*g*v-f*h*w+a*g*w+o*h*P-a*l*P,N=o*s*v-f*u*v+f*c*w-a*s*w-o*c*P+a*u*P,Y=f*u*h-o*s*h-f*c*l+a*s*l+o*c*g-a*u*g,C=n*V+d*M+p*N+r*Y;if(C===0)return W();const b=1/C;return e[0]=V*b,e[1]=M*b,e[2]=N*b,e[3]=Y*b,e[4]=(s*l*r-u*g*r-s*p*w+d*g*w+u*p*P-d*l*P)*b,e[5]=(o*g*r-f*l*r+f*p*w-n*g*w-o*p*P+n*l*P)*b,e[6]=(f*u*r-o*s*r-f*d*w+n*s*w+o*d*P-n*u*P)*b,e[7]=(o*s*p-f*u*p+f*d*l-n*s*l-o*d*g+n*u*g)*b,e[8]=(c*g*r-s*h*r+s*p*v-d*g*v-c*p*P+d*h*P)*b,e[9]=(f*h*r-a*g*r-f*p*v+n*g*v+a*p*P-n*h*P)*b,e[10]=(a*s*r-f*c*r+f*d*v-n*s*v-a*d*P+n*c*P)*b,e[11]=(f*c*p-a*s*p-f*d*h+n*s*h+a*d*g-n*c*g)*b,e[12]=(u*h*r-c*l*r-u*p*v+d*l*v+c*p*w-d*h*w)*b,e[13]=(a*l*r-o*h*r+o*p*v-n*l*v-a*p*w+n*h*w)*b,e[14]=(o*c*r-a*u*r-o*d*v+n*u*v+a*d*w-n*c*w)*b,e[15]=(a*u*p-o*c*p+o*d*h-n*u*h-a*d*l+n*c*l)*b,e}let i=null,y=null,k={},I=null,U=.5,_=-.6,L=0,B=0,H=window.innerWidth/2,q=window.innerHeight/2,z=1,j=1;const A=new Float32Array([0,0,3]);let K=window.innerWidth/2,Z=window.innerHeight/2;function lt(){if(!i)return;K+=(H-K)*.12,Z+=(q-Z)*.12;const t=K/window.innerWidth*2-1,e=-(Z/window.innerHeight)*2+1;let n=W();n=F(Q(U),n),n=F(tt(_),n),n=F(O(0,0,0),n);const a=O(0,0,-4.5),o=et(Math.PI/4,z/j,.1,100),f=F(a,n),d=F(o,f),c=rt(d),s=nt(c,[t,e,-1,1]),h=nt(c,[t,e,1,1]),l=[s[0]/s[3],s[1]/s[3],s[2]/s[3]],g=[h[0]/h[3],h[1]/h[3],h[2]/h[3]],r=[g[0]-l[0],g[1]-l[1],g[2]-l[2]],v=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]);v>1e-4&&(r[0]/=v,r[1]/=v,r[2]/=v);const w=l[0]+r[0]*3.5,P=l[1]+r[1]*3.5,V=l[2]+r[2]*3.5,M=.05;A[0]+=(w-A[0])*M,A[1]+=(P-A[1])*M,A[2]+=(V-A[2])*M}function nt(t,e){const n=[0,0,0,0];for(let a=0;a<4;a++)n[a]=t[a]*e[0]+t[4+a]*e[1]+t[8+a]*e[2]+t[12+a]*e[3];return n}function ct(t){if(i=t.getContext("webgl",{antialias:!0,alpha:!0}),!i){console.error("WebGL not available");return}const e=(c,u)=>{const s=i.createShader(c);return i.shaderSource(s,u),i.compileShader(s),i.getShaderParameter(s,i.COMPILE_STATUS)?s:(console.error("Shader compilation fail:",i.getShaderInfoLog(s)),null)},n=e(i.VERTEX_SHADER,Et),a=e(i.FRAGMENT_SHADER,Tt);if(!n||!a)return;if(y=i.createProgram(),i.attachShader(y,n),i.attachShader(y,a),i.linkProgram(y),!i.getProgramParameter(y,i.LINK_STATUS)){console.error("Shader linking failed");return}i.useProgram(y);const o=st(),f=(c,u)=>{const s=i.createBuffer();return i.bindBuffer(u,s),i.bufferData(u,c,i.STATIC_DRAW),s};k={pos:f(o.pos,i.ARRAY_BUFFER),nor:f(o.nor,i.ARRAY_BUFFER),face:f(o.face,i.ARRAY_BUFFER),cnt:o.cnt},i.enable(i.BLEND),i.blendFunc(i.SRC_ALPHA,i.ONE),i.disable(i.DEPTH_TEST);function d(c){lt();const u=window.devicePixelRatio||2,s=t.getBoundingClientRect(),p=Math.floor(s.width*u),h=Math.floor(s.height*u);(t.width!==p||t.height!==h)&&(t.width=p,t.height=h),z=s.width,j=s.height,i.viewport(0,0,t.width,t.height),i.clear(i.COLOR_BUFFER_BIT),U+=L,_+=B,L*=.94,B*=.94,Math.abs(L)<.001&&Math.abs(B)<.001&&(_+=.004,U=.42+Math.sin(c*.0012)*.15),i.useProgram(y);let l=W();l=F(Q(U),l),l=F(tt(_),l);const g=O(0,0,-4.5),r=et(Math.PI/4,z/j,.1,100),v=F(r,F(g,l)),w=(M,N,Y)=>{const C=i.getAttribLocation(y,M);C!==-1&&(i.bindBuffer(i.ARRAY_BUFFER,N),i.enableVertexAttribArray(C),i.vertexAttribPointer(C,Y,i.FLOAT,!1,0,0))};w("aPos",k.pos,3),w("aFaceNormal",k.nor,3),w("aFace",k.face,1);const P=i.getUniformLocation(y,"uMVP"),V=i.getUniformLocation(y,"uEyePos");i.uniformMatrix4fv(P,!1,v),i.uniform3f(V,A[0],A[1],A[2]),i.drawArrays(i.POINTS,0,k.cnt),I=requestAnimationFrame(d)}I=requestAnimationFrame(d)}let E=!1,T=0,S=0;function ut(t){E=!0,T=t.clientX,S=t.clientY}function ft(t){if(H=t.clientX,q=t.clientY,!E)return;const e=t.clientX-T,n=t.clientY-S;B=e*.005,L=n*.005,T=t.clientX,S=t.clientY}function ot(){E=!1}function dt(t){const e=t.touches[0];E=!0,T=e.clientX,S=e.clientY}function ht(t){const e=t.touches[0];if(H=e.clientX,q=e.clientY,!E)return;const n=e.clientX-T,a=e.clientY-S;B=n*.006,L=a*.006,T=e.clientX,S=e.clientY}function gt(){E=!1}let $=null;return vt(()=>{G.value&&($=it(G.value)),X.value&&ct(X.value)}),wt(()=>{$&&$(),D&&cancelAnimationFrame(D),I&&cancelAnimationFrame(I)}),(t,e)=>{const n=At("router-link");return Pt(),mt("div",Mt,[R("canvas",{ref_key:"bgCanvasRef",ref:G,class:"bg-canvas"},null,512),e[7]||(e[7]=x()),R("div",Rt,[bt(n,{to:"/",class:"back-btn"},{default:yt(()=>[...e[0]||(e[0]=[x("← 返回首页",-1)])]),_:1}),e[1]||(e[1]=x()),e[2]||(e[2]=R("h1",{class:"title"},"GLOWING PARTICLES",-1)),e[3]||(e[3]=x()),e[4]||(e[4]=R("p",{class:"subtitle"},"3D 粒子星轨立方体 & 凝视写意魔瞳",-1))]),e[8]||(e[8]=x()),R("div",{class:"canvas-wrap",onMousedown:ut,onMousemove:ft,onMouseup:ot,onMouseleave:ot,onTouchstart:dt,onTouchmove:ht,onTouchend:gt},[R("canvas",{ref_key:"canvasRef",ref:X,class:"cube-canvas"},null,512),e[5]||(e[5]=x()),e[6]||(e[6]=R("div",{class:"interaction-hint"},"← 拖拽鼠标旋转立方体，眼睛将锁定你的鼠标 →",-1))],32),e[9]||(e[9]=Ft(' <div class="tech-spec" data-v-b046425f><div class="spec-item" data-v-b046425f><span class="spec-label" data-v-b046425f>RENDERER:</span> WebGL 1.0 (GLSL ES 100)</div> <div class="spec-item" data-v-b046425f><span class="spec-label" data-v-b046425f>VERTICES:</span> 24,000 Particle Points</div> <div class="spec-item" data-v-b046425f><span class="spec-label" data-v-b046425f>MATRIX:</span> 4x4 Orthographic/Perspective Projection</div> <div class="spec-item" data-v-b046425f><span class="spec-label" data-v-b046425f>INTERACTION:</span> Euler Drag, Pointer Raycast Lock</div></div>',2))])}}},xt=pt(St,[["__scopeId","data-v-b046425f"]]);export{xt as default};
