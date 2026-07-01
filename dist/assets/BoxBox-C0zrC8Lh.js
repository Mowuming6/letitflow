import{_ as pt,o as gt,a as ht,b as vt,c as Pt,d as R,e as x,h as mt,w as wt,g as bt,r as nt,E as yt}from"./index-DerIPlPc.js";const Ft={class:"tech-container"},At={class:"header"},Mt=`
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
`,Rt=`
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
`,Et={__name:"BoxBox",setup(Tt){const N=nt(null),Y=nt(null);let w=null,G=null;const j=[];function ot(e){w=e.getContext("2d");const t=()=>{e.width=window.innerWidth,e.height=window.innerHeight};t(),window.addEventListener("resize",t);for(let a=0;a<80;a++)j.push({x:Math.random()*e.width,y:Math.random()*e.height,r:Math.random()*1.5+.5,vy:Math.random()*.4+.1,vx:(Math.random()-.5)*.1,alpha:Math.random()*.5+.3});function n(){w.fillStyle="rgba(10, 10, 16, 0.2)",w.fillRect(0,0,e.width,e.height),w.strokeStyle="rgba(0, 255, 136, 0.03)",w.lineWidth=1;const a=40;for(let o=0;o<e.width;o+=a)w.beginPath(),w.moveTo(o,0),w.lineTo(o,e.height),w.stroke();for(let o=0;o<e.height;o+=a)w.beginPath(),w.moveTo(0,o),w.lineTo(e.width,o),w.stroke();for(const o of j)o.y+=o.vy,o.x+=o.vx,o.y>e.height&&(o.y=0,o.x=Math.random()*e.width),(o.x>e.width||o.x<0)&&(o.x=Math.random()*e.width),w.fillStyle=`rgba(0, 255, 136, ${o.alpha})`,w.beginPath(),w.arc(o.x,o.y,o.r,0,Math.PI*2),w.fill();G=requestAnimationFrame(n)}return n(),()=>{window.removeEventListener("resize",t)}}function at(){const e=[],t=[],n=[],a=[[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]],o=[[1,0,0],[1,0,0],[1,0,0],[-1,0,0],[0,0,-1],[0,0,1]],u=[[0,0,1],[0,0,-1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],f=4e3;for(let l=0;l<6;l++){const c=a[l],s=o[l],p=u[l];for(let g=0;g<f;g++){const d=(Math.random()-.5)*2,h=(Math.random()-.5)*2,r=c[0]+d*s[0]+h*p[0],v=c[1]+d*s[1]+h*p[1],P=c[2]+d*s[2]+h*p[2];e.push(r,v,P),t.push(c[0],c[1],c[2]),n.push(l)}}return{pos:new Float32Array(e),nor:new Float32Array(t),face:new Float32Array(n),cnt:e.length/3}}function X(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function F(e,t){const n=new Float32Array(16);for(let a=0;a<4;a++)for(let o=0;o<4;o++){let u=0;for(let f=0;f<4;f++)u+=e[f*4+o]*t[a*4+f];n[a*4+o]=u}return n}function K(e){const t=Math.cos(e),n=Math.sin(e);return new Float32Array([1,0,0,0,0,t,n,0,0,-n,t,0,0,0,0,1])}function Z(e){const t=Math.cos(e),n=Math.sin(e);return new Float32Array([t,0,-n,0,0,1,0,0,n,0,t,0,0,0,0,1])}function D(e,t,n){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,e,t,n,1])}function $(e,t,n,a){const o=1/Math.tan(e*.5),u=1/(n-a);return new Float32Array([o/t,0,0,0,0,o,0,0,0,0,(n+a)*u,-1,0,0,2*a*n*u,0])}function it(e){const t=new Float32Array(16),n=e[0],a=e[1],o=e[2],u=e[3],f=e[4],l=e[5],c=e[6],s=e[7],p=e[8],g=e[9],d=e[10],h=e[11],r=e[12],v=e[13],P=e[14],m=e[15],V=c*h*v-s*d*v+s*g*P-l*h*P-c*g*m+l*d*m,M=u*d*v-o*h*v-u*g*P+a*h*P+o*g*m-a*d*m,C=o*s*v-u*c*v+u*l*P-a*s*P-o*l*m+a*c*m,tt=u*c*g-o*s*g-u*l*d+a*s*d+o*l*h-a*c*h,et=n*V+f*M+p*C+r*tt;if(et===0)return X();const b=1/et;return t[0]=V*b,t[1]=M*b,t[2]=C*b,t[3]=tt*b,t[4]=(s*d*r-c*h*r-s*p*P+f*h*P+c*p*m-f*d*m)*b,t[5]=(o*h*r-u*d*r+u*p*P-n*h*P-o*p*m+n*d*m)*b,t[6]=(u*c*r-o*s*r-u*f*P+n*s*P+o*f*m-n*c*m)*b,t[7]=(o*s*p-u*c*p+u*f*d-n*s*d-o*f*h+n*c*h)*b,t[8]=(l*h*r-s*g*r+s*p*v-f*h*v-l*p*m+f*g*m)*b,t[9]=(u*g*r-a*h*r-u*p*v+n*h*v+a*p*m-n*g*m)*b,t[10]=(a*s*r-u*l*r+u*f*v-n*s*v-a*f*m+n*l*m)*b,t[11]=(u*l*p-a*s*p-u*f*g+n*s*g+a*f*h-n*l*h)*b,t[12]=(c*g*r-l*d*r-c*p*v+f*d*v+l*p*P-f*g*P)*b,t[13]=(a*d*r-o*g*r+o*p*v-n*d*v-a*p*P+n*g*P)*b,t[14]=(o*l*r-a*c*r-o*f*v+n*c*v+a*f*P-n*l*P)*b,t[15]=(a*c*p-o*l*p+o*f*g-n*c*g-a*f*d+n*l*d)*b,t}let i=null,y=null,k={},I=null,U=.5,_=-.6,L=0,B=0,O=window.innerWidth/2,W=window.innerHeight/2,H=1,q=1;const A=new Float32Array([0,0,3]);function st(){if(!i)return;const e=O/window.innerWidth*2-1,t=-(W/window.innerHeight)*2+1;let n=X();n=F(K(U),n),n=F(Z(_),n),n=F(D(0,0,0),n);const a=D(0,0,-4.5),o=$(Math.PI/4,H/q,.1,100),u=F(a,n),f=F(o,u),l=it(f),s=J(l,[e,t,-1,1]),g=J(l,[e,t,1,1]),d=[s[0]/s[3],s[1]/s[3],s[2]/s[3]],h=[g[0]/g[3],g[1]/g[3],g[2]/g[3]],r=[h[0]-d[0],h[1]-d[1],h[2]-d[2]],v=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]);r[0]/=v,r[1]/=v,r[2]/=v;const P=d[0]+r[0]*3.5,m=d[1]+r[1]*3.5,V=d[2]+r[2]*3.5,M=.08;A[0]+=(P-A[0])*M,A[1]+=(m-A[1])*M,A[2]+=(V-A[2])*M}function J(e,t){const n=[0,0,0,0];for(let a=0;a<4;a++)n[a]=e[a]*t[0]+e[4+a]*t[1]+e[8+a]*t[2]+e[12+a]*t[3];return n}function rt(e){if(i=e.getContext("webgl",{antialias:!0,alpha:!0}),!i){console.error("WebGL not available");return}const t=(l,c)=>{const s=i.createShader(l);return i.shaderSource(s,c),i.compileShader(s),i.getShaderParameter(s,i.COMPILE_STATUS)?s:(console.error("Shader compilation fail:",i.getShaderInfoLog(s)),null)},n=t(i.VERTEX_SHADER,Mt),a=t(i.FRAGMENT_SHADER,Rt);if(!n||!a)return;if(y=i.createProgram(),i.attachShader(y,n),i.attachShader(y,a),i.linkProgram(y),!i.getProgramParameter(y,i.LINK_STATUS)){console.error("Shader linking failed");return}i.useProgram(y);const o=at(),u=(l,c)=>{const s=i.createBuffer();return i.bindBuffer(c,s),i.bufferData(c,l,i.STATIC_DRAW),s};k={pos:u(o.pos,i.ARRAY_BUFFER),nor:u(o.nor,i.ARRAY_BUFFER),face:u(o.face,i.ARRAY_BUFFER),cnt:o.cnt},i.enable(i.BLEND),i.blendFunc(i.SRC_ALPHA,i.ONE),i.disable(i.DEPTH_TEST);function f(l){st();const c=window.devicePixelRatio||2,s=e.getBoundingClientRect();e.width=s.width*c,e.height=s.height*c,H=s.width,q=s.height,i.viewport(0,0,e.width,e.height),i.clear(i.COLOR_BUFFER_BIT),U+=L,_+=B,L*=.94,B*=.94,Math.abs(L)<.001&&Math.abs(B)<.001&&(_+=.004,U=.42+Math.sin(l*.0012)*.15),i.useProgram(y);let p=X();p=F(K(U),p),p=F(Z(_),p);const g=D(0,0,-4.5),d=$(Math.PI/4,H/q,.1,100),h=F(d,F(g,p)),r=(m,V,M)=>{const C=i.getAttribLocation(y,m);C!==-1&&(i.bindBuffer(i.ARRAY_BUFFER,V),i.enableVertexAttribArray(C),i.vertexAttribPointer(C,M,i.FLOAT,!1,0,0))};r("aPos",k.pos,3),r("aFaceNormal",k.nor,3),r("aFace",k.face,1);const v=i.getUniformLocation(y,"uMVP"),P=i.getUniformLocation(y,"uEyePos");i.uniformMatrix4fv(v,!1,h),i.uniform3f(P,A[0],A[1],A[2]),i.drawArrays(i.POINTS,0,k.cnt),I=requestAnimationFrame(f)}I=requestAnimationFrame(f)}let E=!1,T=0,S=0;function lt(e){E=!0,T=e.clientX,S=e.clientY}function ct(e){if(O=e.clientX,W=e.clientY,!E)return;const t=e.clientX-T,n=e.clientY-S;B=t*.005,L=n*.005,T=e.clientX,S=e.clientY}function Q(){E=!1}function ut(e){const t=e.touches[0];E=!0,T=t.clientX,S=t.clientY}function ft(e){const t=e.touches[0];if(O=t.clientX,W=t.clientY,!E)return;const n=t.clientX-T,a=t.clientY-S;B=n*.006,L=a*.006,T=t.clientX,S=t.clientY}function dt(){E=!1}let z=null;return gt(()=>{Y.value&&(z=ot(Y.value)),N.value&&rt(N.value)}),ht(()=>{z&&z(),G&&cancelAnimationFrame(G),I&&cancelAnimationFrame(I)}),(e,t)=>{const n=yt("router-link");return vt(),Pt("div",Ft,[R("canvas",{ref_key:"bgCanvasRef",ref:Y,class:"bg-canvas"},null,512),t[7]||(t[7]=x()),R("div",At,[mt(n,{to:"/",class:"back-btn"},{default:wt(()=>[...t[0]||(t[0]=[x("← 返回首页",-1)])]),_:1}),t[1]||(t[1]=x()),t[2]||(t[2]=R("h1",{class:"title"},"GLOWING PARTICLES",-1)),t[3]||(t[3]=x()),t[4]||(t[4]=R("p",{class:"subtitle"},"3D 粒子星轨立方体 & 凝视写意魔瞳",-1))]),t[8]||(t[8]=x()),R("div",{class:"canvas-wrap",onMousedown:lt,onMousemove:ct,onMouseup:Q,onMouseleave:Q,onTouchstart:ut,onTouchmove:ft,onTouchend:dt},[R("canvas",{ref_key:"canvasRef",ref:N,class:"cube-canvas"},null,512),t[5]||(t[5]=x()),t[6]||(t[6]=R("div",{class:"interaction-hint"},"← 拖拽鼠标旋转立方体，眼睛将锁定你的鼠标 →",-1))],32),t[9]||(t[9]=bt(' <div class="tech-spec" data-v-a09be700><div class="spec-item" data-v-a09be700><span class="spec-label" data-v-a09be700>RENDERER:</span> WebGL 1.0 (GLSL ES 100)</div> <div class="spec-item" data-v-a09be700><span class="spec-label" data-v-a09be700>VERTICES:</span> 24,000 Particle Points</div> <div class="spec-item" data-v-a09be700><span class="spec-label" data-v-a09be700>MATRIX:</span> 4x4 Orthographic/Perspective Projection</div> <div class="spec-item" data-v-a09be700><span class="spec-label" data-v-a09be700>INTERACTION:</span> Euler Drag, Pointer Raycast Lock</div></div>',2))])}}},Vt=pt(Et,[["__scopeId","data-v-a09be700"]]);export{Vt as default};
