import*as t from"three";import{mergeGeometries as x}from"three/addons/utils/BufferGeometryUtils.js";const y=.42,w=.34,b=[[[[1.5,1.548],[1.575,1.538],[1.62,1.47],[1.66,1.2],[1.7,.75],[1.72,w-.02]],64,1],[[[.77,2.318],[.835,2.31],[.87,2.25],[.9,2],[.92,1.48]],40,1],[[[.035,2.62],[.05,2.85],[.075,3.12]],10,-1]],F=i=>[[i,w,1.05,1.72],[1.46,1.5,.3,.92],[.74,2.28,.12,.3]],d=`
uniform float uTime, uLight; uniform vec3 uShallow, uDeep, uSky, uFoam;
float wH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wH(i), wH(i + vec2(1, 0)), f.x), mix(wH(i + vec2(0, 1)), wH(i + vec2(1, 1)), f.x), f.y); }
`,W=`
attribute vec3 aW; varying vec3 vL; varying vec3 vWP; varying vec3 vW;
void main(){ vL = position; vW = aW; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w; }`,A=`${d}
varying vec3 vL; varying vec3 vWP; varying vec3 vW;
void main(){
  float r = length(vL.xz), ang = atan(vL.z, vL.x);
  float k = clamp((r - vW.x) / (vW.y - vW.x), 0.0, 1.0); // 0 at the column, 1 at the rim
  float deep = 1.0 - smoothstep(0.05, 1.0, k);
  vec3 col = mix(uShallow, uDeep, clamp(deep * 0.85 + (wN(vL.xz * 1.3) - 0.5) * 0.25, 0.0, 1.0));
  vec3 V = normalize(cameraPosition - vWP);
  col = mix(col, uSky, pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0) * 0.7);
  // rings running outward from where the streams land, broken into arcs
  float ph = (r - vW.z) * 7.5 - uTime * 2.2 + wN(vL.xz * 2.2) * 2.0;
  float ring = smoothstep(0.82, 0.96, 0.5 + 0.5 * sin(ph)) * step(vW.z, r);
  ring *= smoothstep(0.35, 0.62, wN(vec2(ang * 3.2, r * 1.5 - uTime * 0.35))) * (1.0 - k * 0.55);
  // inside the landing ring, softer rings running in
  float inner = smoothstep(0.88, 0.97, 0.5 + 0.5 * sin(r * 9.0 + uTime * 1.6)) * (1.0 - step(vW.z, r)) * 0.5;
  // foam where the water lands, churning
  float band = 1.0 - smoothstep(0.0, 0.17, abs(r - vW.z));
  float churn = wN(vec2(ang * 9.0 + uTime * 0.6, r * 10.0 - uTime * 2.4));
  float foam = band * smoothstep(0.45, 0.8, churn + band * 0.3) * 0.85;
  // a pale line along the rim and round the column
  float edge = smoothstep(vW.y - 0.09, vW.y, r) * 0.7 + (1.0 - smoothstep(vW.x, vW.x + 0.06, r)) * 0.5;
  col = mix(col, uFoam, clamp(ring * 0.45 + inner * 0.6 + foam + edge, 0.0, 1.0));
  // sparkles that come and go
  vec2 sc = vL.xz * 8.0, cell = floor(sc);
  float h = wH(cell + floor(uTime * 1.7 + wH(cell + 7.0) * 9.0));
  float sp = step(0.985, h) * (1.0 - smoothstep(0.04, 0.2, length(fract(sc) - 0.5)));
  col += sp * 0.9;
  float a = max(mix(0.6, 0.9, deep), max(foam, ring * 0.7));
  gl_FragColor = vec4(col * uLight, a);
}`,L=`
attribute float aDir; varying vec2 vUv; varying float vF, vDir;
void main(){
  vUv = uv; vDir = aDir;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vF = 1.0 - abs(dot(n, normalize(cameraPosition - w.xyz))); // 0 facing the camera, 1 at the curtain's sides
  gl_Position = projectionMatrix * viewMatrix * w; }`,S=`${d}
varying vec2 vUv; varying float vF, vDir;
void main(){
  // u round the column, v down the fall (0 at the lip). Streaks of different lengths run down it; they change its
  // brightness and never cut it, so the curtain stays whole and even
  float u = vUv.x, v = vUv.y;
  float t = uTime * 1.6 * vDir;
  float streak = wN(vec2(u * 140.0, v * 3.0 - t)) * 0.65 + wN(vec2(u * 330.0, v * 6.0 - t * 1.4)) * 0.35;
  float a = (0.45 + 0.3 * vF) * (0.75 + 0.35 * streak);
  a *= vDir > 0.0 ? 1.0 : 1.0 - smoothstep(0.55, 1.0, v); // the spout thins out at its top
  vec3 col = mix(uShallow * 1.25, uFoam, 0.45 + 0.4 * smoothstep(0.35, 0.8, streak) + 0.15 * vF);
  gl_FragColor = vec4(col * uLight, a);
}`;function g(i,l,r,n={}){return new t.ShaderMaterial({uniforms:r,vertexShader:i,fragmentShader:l,transparent:!0,depthWrite:!1,...n})}function D(){const i=b.map(([r,n,u])=>{const o=new t.LatheGeometry(r.map(([s,a])=>new t.Vector2(s,a)),n);return o.setAttribute("aDir",new t.Float32BufferAttribute(new Float32Array(o.attributes.position.count).fill(u),1)),o}),l=x(i);for(const r of i)r.dispose();return l}function M(i){const l=F(i).map(([a,v,e,m])=>{const c=new t.CircleGeometry(a,72).rotateX(-Math.PI/2).translate(0,v+.004,0);c.deleteAttribute("uv"),c.deleteAttribute("normal");const p=c.attributes.position.count,h=new Float32Array(p*3);for(let f=0;f<p;f++)h.set([e,a,m],f*3);return c.setAttribute("aW",new t.BufferAttribute(h,3)),c}),r=new t.BufferGeometry,n=[],u=[],o=[];let s=0;for(const a of l){n.push(...a.attributes.position.array),u.push(...a.attributes.aW.array);for(const v of a.index.array)o.push(s+v);s+=a.attributes.position.count,a.dispose()}return r.setAttribute("position",new t.Float32BufferAttribute(n,3)),r.setAttribute("aW",new t.Float32BufferAttribute(u,3)),r.setIndex(o),r}export function animeFountain(i,l){const n=i.getObjectByName("fountain:ripple")?.parent;if(!n)return null;const u=n.children.filter(e=>e.isMesh&&e.material?.transparent);for(const e of u)n.remove(e);const o={uTime:{value:0},uLight:{value:1},uShallow:{value:new t.Color},uDeep:{value:new t.Color},uSky:{value:new t.Color},uFoam:{value:new t.Color}},s=new t.Mesh(M(l-y),g(W,A,o)),a=new t.Mesh(D(),g(L,S,o,{side:t.DoubleSide}));s.renderOrder=1,a.renderOrder=2;const v=performance.now();for(const e of[s,a])e.name="anime:water",e.userData.noLook=e.userData.noInk=e.userData.noAO=!0,n.add(e);return s.onBeforeRender=()=>o.uTime.value=(performance.now()-v)/1e3,{set(e,m){o.uShallow.value.set(e.water.shallow),o.uDeep.value.set(e.water.deep),o.uSky.value.set(e.water.sky),o.uFoam.value.set(e.water.foam),o.uLight.value=m?.75:1},stats:{removed:u.length,triangles:[s,a].map(e=>e.geometry.index.count/3)}}}
