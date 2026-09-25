// Amakawa opening: a small WebGL2 compositor. Every frame is a pure function of time t (seconds into the song),
// so the live player, the scrubber and the frame-exact video export all draw the same picture.
'use strict';
const W = 1920, H = 1080;

// ---------- math helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  lin: u => u,
  inQ: u => u * u, outQ: u => 1 - (1 - u) * (1 - u),
  inC: u => u * u * u, outC: u => 1 - Math.pow(1 - u, 3), ioC: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  outE: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u), inE: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
  ioE: u => u <= 0 ? 0 : u >= 1 ? 1 : u < .5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
  outB: u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  ioS: u => u * u * (3 - 2 * u),
};
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
const on2s = (t, fps = 12) => Math.floor(t * fps) / fps; // drawings on 2s at 24 fps

// ---------- GL setup ----------
const GL = {};
function glInit(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL2 is not available');
  GL.gl = gl;
  const vs = `#version 300 es
  in vec2 aPos; in vec3 aUvq; out vec3 vUvq; out vec2 vScr;
  void main(){ vUvq=aUvq; vScr=aPos; gl_Position=vec4(aPos.x/${W}.0*2.0-1.0, 1.0-aPos.y/${H}.0*2.0, 0.0, 1.0); }`;
  const layerFs = `#version 300 es
  precision highp float;
  in vec3 vUvq; in vec2 vScr; out vec4 o;
  uniform sampler2D uTex, uDepth;
  uniform vec4 uCrop; uniform vec2 uPar; uniform float uFocus, uHasDepth, uAlpha;
  uniform vec2 uMB; uniform vec4 uSil; uniform vec4 uRim; uniform vec2 uRimDir;
  uniform vec4 uWarp; uniform vec4 uWarpBox; uniform vec3 uGrade; uniform vec4 uTint;
  uniform vec4 uSweep; uniform vec3 uSweepCol; uniform vec4 uBands; uniform float uBlur;
  vec2 cropUv(vec2 q){ return mix(uCrop.xy, uCrop.zw, q); }
  float dep(vec2 uv){ return texture(uDepth, uv).r; }
  vec2 warp(vec2 q){
    if(uWarp.x==0.0) return q;
    float wy = smoothstep(uWarpBox.w, uWarpBox.y, q.y);           // stronger toward the top of the box
    float wx = 1.0 - smoothstep(0.0, uWarpBox.z, abs(q.x-uWarpBox.x)); // 0 near the face column, 1 at the sides
    float m = wy * mix(0.25, 1.0, 1.0-wx);
    return q + vec2(uWarp.x*sin(uWarp.w*uWarp.z + q.y*uWarp.y) , uWarp.x*0.35*cos(uWarp.w*uWarp.z*0.8 + q.x*uWarp.y)) * m;
  }
  vec4 samp(vec2 q){
    q = warp(q);
    vec2 uv = cropUv(q);
    if(uHasDepth>0.5){
      vec2 s = uv;
      for(int i=0;i<6;i++){ s = uv - uPar*(dep(s)-uFocus); }
      uv = s;
    }
    if(uBlur>0.0){
      vec4 a=vec4(0.0); float k=0.0;
      for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++){ float w=1.0/(1.0+float(i*i+j*j)); a+=texture(uTex, uv+vec2(i,j)*uBlur*0.5)*w; k+=w; }
      return a/k;
    }
    return texture(uTex, uv);
  }
  void main(){
    vec2 q = vUvq.xy / vUvq.z;
    vec4 c;
    if(uMB.x!=0.0 || uMB.y!=0.0){
      c = vec4(0.0);
      for(int i=0;i<10;i++){ float f=float(i)/9.0-0.5; c += samp(q + uMB*f); }
      c /= 10.0;
    } else c = samp(q);
    // colour grade: brightness, contrast, saturation (premultiplied colour)
    vec3 rgb = c.a>0.0 ? c.rgb/c.a : c.rgb;
    float l = dot(rgb, vec3(0.299,0.587,0.114));
    rgb = mix(vec3(l), rgb, uGrade.z);
    rgb = (rgb-0.5)*uGrade.y + 0.5 + uGrade.x;
    rgb = mix(rgb, uTint.rgb, uTint.a);
    // light sweep: a soft band moving across the layer (in screen space)
    if(uSweep.w>0.0){
      vec2 d = vec2(cos(uSweep.z), sin(uSweep.z));
      float p = dot(vScr/vec2(${W}.0,${H}.0), d);
      float b = exp(-pow((p-uSweep.x)/uSweep.y, 2.0));
      rgb += uSweepCol * b * uSweep.w;
    }
    // passing shadow bands (pillars): x = phase, y = period, z = width, w = strength
    if(uBands.w>0.0){
      float p = fract((vScr.x/${W}.0) / uBands.y + uBands.x);
      float b = smoothstep(0.0, 0.08, p) * (1.0-smoothstep(uBands.z, uBands.z+0.08, p));
      rgb *= 1.0 - b*uBands.w;
    }
    rgb = clamp(rgb, 0.0, 1.0);
    // silhouette fill + rim light
    rgb = mix(rgb, uSil.rgb, uSil.a);
    if(uRim.a>0.0){
      float a2 = samp(q + uRimDir).a;
      float rim = clamp(c.a - a2, 0.0, 1.0);
      rgb += uRim.rgb * rim * uRim.a * 1.5;
    }
    o = vec4(rgb*c.a, c.a) * uAlpha;
  }`;
  GL.layer = prog(vs, layerFs);
  // fullscreen passes
  const fsv = `#version 300 es
  in vec2 aPos; out vec2 vUv; void main(){ vUv=aPos*0.5+0.5; gl_Position=vec4(aPos,0.0,1.0);} `;
  GL.bright = prog(fsv, `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform float uThr;
  void main(){ vec3 c=vec3(0.0); vec2 px=1.0/vec2(${W / 2}.0,${H / 2}.0);
    for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++) c+=texture(uTex,vUv+vec2(i,j)*px).rgb;
    c/=9.0; float l=max(c.r,max(c.g,c.b)); o=vec4(c*smoothstep(uThr,1.0,l),1.0);} `);
  GL.blur = prog(fsv, `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;
  void main(){ float w[5]=float[](0.227,0.195,0.122,0.054,0.016); vec3 c=texture(uTex,vUv).rgb*w[0];
    for(int i=1;i<5;i++){ c+=texture(uTex,vUv+uDir*float(i)).rgb*w[i]; c+=texture(uTex,vUv-uDir*float(i)).rgb*w[i]; } o=vec4(c,1.0);} `);
  GL.speed = prog(fsv, `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o;
  uniform vec4 uSp; // mode (1 radial, 2 parallel), density, seed, strength
  uniform vec4 uSp2; // center x,y (radial) or angle, clear radius, length
  uniform vec3 uSpCol;
  float h(float n){ return fract(sin(n*91.345+uSp.z*17.17)*47453.5453); }
  void main(){
    vec2 p=(vUv-0.5)*vec2(${W / H},1.0); float a=0.0;
    if(uSp.x<1.5){
      vec2 c=(uSp2.xy-0.5)*vec2(${W / H},1.0); vec2 d=p-c; float ang=atan(d.y,d.x); float r=length(d);
      float k=floor((ang/6.2831853+0.5)*uSp.y); float w=fract((ang/6.2831853+0.5)*uSp.y);
      float on=step(0.55,h(k)); float r0=uSp2.z+h(k+7.0)*0.25;
      float thin = 1.0-smoothstep(0.0, 0.5*(0.3+0.7*h(k+3.0)), abs(w-0.5));
      a=on*thin*smoothstep(r0,r0+0.25,r);
    } else {
      float an=uSp2.x; vec2 d=vec2(cos(an),sin(an)); vec2 n=vec2(-d.y,d.x);
      float y=dot(p,n)*uSp.y; float x=dot(p,d); float k=floor(y); float w=fract(y);
      float len=0.2+h(k)*uSp2.w; float off=h(k+1.0)*4.0-2.0 + uSp.z*1.37*h(k+5.0);
      float seg=fract((x+off)/(len*2.0)); float on=step(0.62,h(k+2.0))*step(seg,0.5);
      a=on*(1.0-smoothstep(0.0,0.35*(0.3+h(k+9.0)),abs(w-0.5)));
      a*=smoothstep(uSp2.z, uSp2.z+0.2, abs(dot(p,n)));
    }
    o=vec4(uSpCol*a*uSp.w, a*uSp.w);
  }`);
  GL.post = prog(fsv, `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D uTex, uBloom; uniform float uBloomAmt, uCA, uVig, uGrain, uFlash, uFade, uTime, uInvert;
  uniform vec4 uLeak; uniform vec3 uFlare; uniform float uFlareAmt; uniform vec3 uFlashCol;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uTime*13.1)*43758.5453); }
  void main(){
    vec2 d=vUv-0.5; float r=length(d);
    vec2 off=d*uCA*r;
    vec3 c=vec3(texture(uTex,vUv+off).r, texture(uTex,vUv).g, texture(uTex,vUv-off).b);
    c+=texture(uBloom,vUv).rgb*uBloomAmt;
    // light leak: two warm soft blobs drifting in from the edges
    if(uLeak.w>0.0){
      vec2 p1=vec2(-0.1+0.3*sin(uLeak.x), 0.2+0.2*cos(uLeak.x*0.7)); vec2 p2=vec2(1.1-0.25*cos(uLeak.x*0.8), 0.9-0.3*sin(uLeak.x*0.5));
      vec2 a=vUv*vec2(${W / H},1.0);
      float b1=exp(-pow(length(a-p1*vec2(${W / H},1.0))/0.55,2.0)); float b2=exp(-pow(length(a-p2*vec2(${W / H},1.0))/0.5,2.0));
      c+=(vec3(1.0,0.55,0.25)*b1+vec3(1.0,0.35,0.55)*b2*0.8)*uLeak.w;
    }
    // lens flare: glow at the source, a horizontal streak and ghosts mirrored through the centre
    if(uFlareAmt>0.0){
      vec2 a=vUv*vec2(${W / H},1.0); vec2 s=uFlare.xy*vec2(${W / H},1.0);
      float g=exp(-length(a-s)*6.0)*1.2 + exp(-abs(a.y-s.y)*90.0)*exp(-abs(a.x-s.x)*1.6)*0.6;
      vec3 f=vec3(1.0,0.9,0.75)*g;
      vec2 cc=vec2(0.5*${W / H},0.5); vec2 v=cc-s;
      for(int i=1;i<5;i++){ vec2 gp=s+v*(0.4+0.45*float(i)); float rr=0.03+0.025*float(i);
        f+=vec3(0.4,0.8,1.0)*(0.18/float(i))*smoothstep(rr,rr*0.6,length(a-gp)); }
      c+=f*uFlareAmt;
    }
    c=mix(c, 1.0-c, uInvert);
    c*=1.0-uVig*smoothstep(0.35,0.95,r);
    c+=(h(vUv*${W}.0)-0.5)*uGrain;
    c=mix(c, uFlashCol, uFlash);
    c*=1.0-uFade;
    o=vec4(c,1.0);
  }`);
  // buffers
  GL.quad = gl.createBuffer();
  GL.full = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, GL.full);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  GL.scene = target(W, H);
  GL.half = target(W / 2, H / 2);
  GL.b1 = target(W / 4, H / 4);
  GL.b2 = target(W / 4, H / 4);
  GL.white = texFromPixels(new Uint8Array([255, 255, 255, 255]), 1, 1);
  GL.black = texFromPixels(new Uint8Array([0, 0, 0, 255]), 1, 1);
  GL.c2d = document.createElement('canvas');
  GL.c2d.width = W; GL.c2d.height = H;
  GL.ctx = GL.c2d.getContext('2d');
  GL.c2dTex = gl.createTexture();
  return gl;
}
function prog(vs, fs) {
  const gl = GL.gl;
  const p = gl.createProgram();
  for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(p, sh);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); }
  return { p, u, aPos: gl.getAttribLocation(p, 'aPos'), aUvq: gl.getAttribLocation(p, 'aUvq') };
}
function target(w, h) {
  const gl = GL.gl;
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return { t, f, w, h };
}
function texParams(mip) {
  const gl = GL.gl;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
function texFromPixels(px, w, h) {
  const gl = GL.gl;
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  texParams(false);
  return t;
}
function texFromImage(img) {
  const gl = GL.gl;
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D);
  texParams(true);
  const ext = gl.getExtension('EXT_texture_filter_anisotropic');
  if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return { t, w: img.width, h: img.height };
}

// ---------- asset loading ----------
const TEX = {};
async function loadAssets(list, base, onProgress) {
  let done = 0;
  await Promise.all(list.map(async name => {
    const img = new Image();
    img.decoding = 'async';
    img.src = `${base}/${name}.webp`;
    try { await img.decode(); TEX[name] = texFromImage(img); } catch (e) { console.warn('missing asset', name); }
    onProgress && onProgress(++done / list.length);
  }));
}

// ---------- drawing ----------
// Draw a textured quad. corners: 4 screen points [tl, tr, br, bl]; perspective-correct via the q coordinate.
function drawQuad(tex, corners, o = {}) {
  const gl = GL.gl, P = GL.layer;
  gl.useProgram(P.p);
  // projective q per corner from the diagonals' intersection (so trapezoids texture correctly)
  const [p0, p1, p2, p3] = corners;
  const q = [1, 1, 1, 1];
  const d = (p2[0] - p0[0]) * (p3[1] - p1[1]) - (p2[1] - p0[1]) * (p3[0] - p1[0]);
  if (Math.abs(d) > 1e-6) {
    const s = ((p1[0] - p0[0]) * (p3[1] - p1[1]) - (p1[1] - p0[1]) * (p3[0] - p1[0])) / d;
    const tt = ((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0])) / d;
    const ix = p0[0] + s * (p2[0] - p0[0]), iy = p0[1] + s * (p2[1] - p0[1]);
    const dist = p => Math.hypot(p[0] - ix, p[1] - iy);
    const d0 = dist(p0), d1 = dist(p1), d2 = dist(p2), d3 = dist(p3);
    if (d0 > 0 && d1 > 0 && d2 > 0 && d3 > 0) {
      q[0] = (d0 + d2) / d2; q[2] = (d2 + d0) / d0; q[1] = (d1 + d3) / d3; q[3] = (d3 + d1) / d1;
    }
    void tt;
  }
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const order = [0, 1, 3, 2];
  const data = [];
  for (const i of order) data.push(corners[i][0], corners[i][1], uv[i][0] * q[i], uv[i][1] * q[i], q[i]);
  gl.bindBuffer(gl.ARRAY_BUFFER, GL.quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(P.aPos); gl.vertexAttribPointer(P.aPos, 2, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(P.aUvq); gl.vertexAttribPointer(P.aUvq, 3, gl.FLOAT, false, 20, 8);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex.t || tex); gl.uniform1i(P.u.uTex, 0);
  const dep = o.depth && TEX[o.depth];
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dep ? dep.t : GL.black); gl.uniform1i(P.u.uDepth, 1);
  const c = o.crop || [0, 0, 1, 1];
  gl.uniform4f(P.u.uCrop, c[0], c[1], c[2], c[3]);
  const par = o.par || [0, 0];
  gl.uniform2f(P.u.uPar, par[0], par[1]);
  gl.uniform1f(P.u.uFocus, o.focus ?? 0.5);
  gl.uniform1f(P.u.uHasDepth, dep && (par[0] || par[1]) ? 1 : 0);
  gl.uniform1f(P.u.uAlpha, o.alpha ?? 1);
  const mb = o.mb || [0, 0];
  gl.uniform2f(P.u.uMB, mb[0], mb[1]);
  const sil = o.sil || [0, 0, 0, 0];
  gl.uniform4f(P.u.uSil, sil[0], sil[1], sil[2], sil[3]);
  const rim = o.rim || [0, 0, 0, 0];
  gl.uniform4f(P.u.uRim, rim[0], rim[1], rim[2], rim[3]);
  const rd = o.rimDir || [0.004, 0.004];
  gl.uniform2f(P.u.uRimDir, rd[0], rd[1]);
  const wp = o.warp || [0, 0, 0, 0];
  gl.uniform4f(P.u.uWarp, wp[0], wp[1], wp[2], wp[3]);
  const wb = o.warpBox || [0.5, 0, 0.2, 0.5];
  gl.uniform4f(P.u.uWarpBox, wb[0], wb[1], wb[2], wb[3]);
  const g = o.grade || [0, 1, 1];
  gl.uniform3f(P.u.uGrade, g[0], g[1], g[2]);
  const ti = o.tint || [0, 0, 0, 0];
  gl.uniform4f(P.u.uTint, ti[0], ti[1], ti[2], ti[3]);
  const sw = o.sweep || [0, 0.1, 0, 0];
  gl.uniform4f(P.u.uSweep, sw[0], sw[1], sw[2], sw[3]);
  const sc = o.sweepCol || [1, 0.9, 0.7];
  gl.uniform3f(P.u.uSweepCol, sc[0], sc[1], sc[2]);
  const bd = o.bands || [0, 1, 0.2, 0];
  gl.uniform4f(P.u.uBands, bd[0], bd[1], bd[2], bd[3]);
  gl.uniform1f(P.u.uBlur, o.blur || 0);
  gl.enable(gl.BLEND);
  if (o.add) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function rectCorners(x, y, w, h, rot = 0, ax = 0.5, ay = 0.5) {
  const cx = x, cy = y, c = Math.cos(rot), s = Math.sin(rot);
  const pts = [[-ax * w, -ay * h], [(1 - ax) * w, -ay * h], [(1 - ax) * w, (1 - ay) * h], [-ax * w, (1 - ay) * h]];
  return pts.map(([px, py]) => [cx + px * c - py * s, cy + px * s + py * c]);
}
// Full-frame background with a virtual camera: cx, cy = centre of view in image uv; zoom 1 = the image just covers 16:9.
function bg(name, o = {}) {
  const t = TEX[name];
  if (!t) return;
  const ia = t.w / t.h, sa = W / H;
  let vw = 1, vh = 1;
  if (ia > sa) vw = sa / ia; else vh = ia / sa;
  const z = o.zoom || 1;
  vw /= z; vh /= z;
  const m = o.margin ?? 0;
  let cx = o.cx ?? 0.5, cy = o.cy ?? 0.5;
  cx = clamp(cx, vw / 2 + m, 1 - vw / 2 - m); cy = clamp(cy, vh / 2 + m, 1 - vh / 2 - m);
  const crop = [cx - vw / 2, cy - vh / 2, cx + vw / 2, cy + vh / 2];
  if (o.du) { crop[0] += o.du; crop[2] += o.du; }  // layer drift (e.g. clouds) after the camera clamp
  const sx = o.shake ? o.shake[0] : 0, sy = o.shake ? o.shake[1] : 0;
  const rot = o.rot || 0;
  // rotation: grow the quad so the corners stay covered
  const grow = rot ? 1 + Math.abs(Math.sin(rot)) * 0.9 : 1;
  const corners = rectCorners(W / 2 + sx, H / 2 + sy, W * grow, H * grow, rot);
  const cc = rot ? [lerp(crop[0], crop[2], 0.5) - (crop[2] - crop[0]) * grow / 2, lerp(crop[1], crop[3], 0.5) - (crop[3] - crop[1]) * grow / 2,
    lerp(crop[0], crop[2], 0.5) + (crop[2] - crop[0]) * grow / 2, lerp(crop[1], crop[3], 0.5) + (crop[3] - crop[1]) * grow / 2] : crop;
  GL.lastCrop = crop;
  drawQuad(t, corners, Object.assign({ depth: o.depth === undefined ? name + '-d' : o.depth }, o, { crop: cc }));
}
// image uv -> screen px under the last bg() framing (ignores rotation)
function toScreen(u, v) { const c = GL.lastCrop || [0, 0, 1, 1]; return [(u - c[0]) / (c[2] - c[0]) * W, (v - c[1]) / (c[3] - c[1]) * H]; }
// Sprite: anchored at bottom centre (x, y) with height h in screen px.
function sprite(name, x, y, h, o = {}) {
  const t = TEX[name];
  if (!t) return;
  const w = h * t.w / t.h * (o.flip ? -1 : 1);
  drawQuad(t, rectCorners(x, y, w, h, o.rot || 0, 0.5, o.ay ?? 1), Object.assign({ depth: null }, o));
}
// Crop of a sprite drawn into a screen rect (for close-ups): crop in uv.
function spriteCrop(name, crop, x, y, w, h, o = {}) {
  const t = TEX[name];
  if (!t) return;
  drawQuad(t, rectCorners(x, y, w, h, o.rot || 0), Object.assign({ depth: null }, o, { crop }));
}
function fill(r, g, b, a = 1, o = {}) {
  drawQuad(GL.white, rectCorners(W / 2, H / 2, W * 1.5, H * 1.5, 0), Object.assign({ tint: [r, g, b, 1], alpha: a }, o));
}
function rect(x, y, w, h, rot, col, a = 1, o = {}) {
  drawQuad(GL.white, rectCorners(x, y, w, h, rot), Object.assign({ tint: [col[0], col[1], col[2], 1], alpha: a }, o));
}
// 2D canvas layer composited at the current point in the stack.
function c2d() { const x = GL.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, W, H); return x; }
function draw2d(o = {}) {
  const gl = GL.gl;
  gl.bindTexture(gl.TEXTURE_2D, GL.c2dTex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, GL.c2d);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  texParams(false);
  drawQuad(GL.c2dTex, rectCorners(W / 2, H / 2, W, H, 0), Object.assign({ depth: null }, o));
}
function speedLines(o) {
  const gl = GL.gl, P = GL.speed;
  gl.useProgram(P.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, GL.full);
  gl.enableVertexAttribArray(P.aPos); gl.vertexAttribPointer(P.aPos, 2, gl.FLOAT, false, 0, 0);
  gl.uniform4f(P.u.uSp, o.mode === 'radial' ? 1 : 2, o.density || 90, o.seed || 0, o.alpha ?? 0.6);
  if (o.mode === 'radial') gl.uniform4f(P.u.uSp2, o.cx ?? 0.5, 1 - (o.cy ?? 0.5), o.clear ?? 0.3, 0);
  else gl.uniform4f(P.u.uSp2, o.angle || 0, 0, o.clear ?? 0, o.len ?? 0.6);
  const c = o.col || [1, 1, 1];
  gl.uniform3f(P.u.uSpCol, c[0], c[1], c[2]);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function fullPass(P, tgt) {
  const gl = GL.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgt ? tgt.f : null);
  gl.viewport(0, 0, tgt ? tgt.w : gl.drawingBufferWidth, tgt ? tgt.h : gl.drawingBufferHeight);
  gl.useProgram(P.p);
  gl.disable(gl.BLEND);
  gl.bindBuffer(gl.ARRAY_BUFFER, GL.full);
  gl.enableVertexAttribArray(P.aPos); gl.vertexAttribPointer(P.aPos, 2, gl.FLOAT, false, 0, 0);
}
function bindTex(P, name, tex, unit) {
  const gl = GL.gl;
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u[name], unit);
}

// ---------- frame ----------
// fx: per-frame post settings set by the shot.
function frame(t, drawShot) {
  const gl = GL.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, GL.scene.f);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  const fx = { bloom: 0.35, thr: 0.72, ca: 0.0, vig: 0.28, grain: 0.035, flash: 0, flashCol: [1, 1, 1], fade: 0, leak: 0, leakPhase: t * 0.4,
    flare: null, flareAmt: 0, invert: 0 };
  drawShot(t, fx);
  // bloom
  fullPass(GL.bright, GL.half); bindTex(GL.bright, 'uTex', GL.scene.t, 0); gl.uniform1f(GL.bright.u.uThr, fx.thr); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fullPass(GL.blur, GL.b1); bindTex(GL.blur, 'uTex', GL.half.t, 0); gl.uniform2f(GL.blur.u.uDir, 2 / (W / 4), 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fullPass(GL.blur, GL.b2); bindTex(GL.blur, 'uTex', GL.b1.t, 0); gl.uniform2f(GL.blur.u.uDir, 0, 2 / (H / 4)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fullPass(GL.blur, GL.b1); bindTex(GL.blur, 'uTex', GL.b2.t, 0); gl.uniform2f(GL.blur.u.uDir, 4 / (W / 4), 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fullPass(GL.blur, GL.b2); bindTex(GL.blur, 'uTex', GL.b1.t, 0); gl.uniform2f(GL.blur.u.uDir, 0, 4 / (H / 4)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const P = GL.post;
  fullPass(P, null);
  bindTex(P, 'uTex', GL.scene.t, 0); bindTex(P, 'uBloom', GL.b2.t, 1);
  gl.uniform1f(P.u.uBloomAmt, fx.bloom); gl.uniform1f(P.u.uCA, fx.ca); gl.uniform1f(P.u.uVig, fx.vig); gl.uniform1f(P.u.uGrain, fx.grain);
  gl.uniform1f(P.u.uFlash, clamp(fx.flash)); gl.uniform3f(P.u.uFlashCol, ...fx.flashCol); gl.uniform1f(P.u.uFade, clamp(fx.fade)); gl.uniform1f(P.u.uTime, on2s(t));
  gl.uniform1f(P.u.uInvert, fx.invert);
  gl.uniform4f(P.u.uLeak, fx.leakPhase, 0, 0, fx.leak);
  const fl = fx.flare || [0.5, 0.5];
  gl.uniform3f(P.u.uFlare, fl[0], 1 - fl[1], 0); gl.uniform1f(P.u.uFlareAmt, fx.flare ? fx.flareAmt : 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
