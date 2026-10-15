// The fountain's local transparent-surface treatment, fitted to the pool rectangle.
// Surface, waterline and three small moving contacts share this one draw call.
import * as THREE from 'three';
import { POOL } from './deck-plan.js';
const VERT = `varying vec2 vPool;
void main(){ vPool=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FRAG = `uniform float uTime,uLight; uniform vec2 uHalf;
uniform vec4 uSwimmers[3]; varying vec2 vPool;
void main(){
  float wave=sin(vPool.x*4.1+vPool.y*2.3+uTime*1.2)+sin(vPool.x*2.8-vPool.y*5.2-uTime*.8);
  float glint=smoothstep(.95,1.0,.5+.5*sin(vPool.y*9.0+vPool.x*1.3+wave*.35+uTime*.65));
  vec3 col=vec3(.24,.53,.63)+wave*.008+glint*.035;
  float rim=1.0-smoothstep(.025,.075,min(uHalf.x-abs(vPool.x),uHalf.y-abs(vPool.y)));
  float foam=rim*.5;
  for(int i=0;i<3;i++){
    vec4 s=uSwimmers[i];
    if(s.w<.5)continue;
    vec2 d=vPool-s.xy,heading=vec2(sin(s.z),cos(s.z));
    float along=dot(d,heading),across=dot(d,vec2(heading.y,-heading.x));
    float swimming=step(1.5,s.w),pulse=.035*sin(uTime*3.2+float(i)*2.0);
    float ellipse=length(vec2(across/(.31+pulse),(along-swimming*.38)/(.36+swimming*.12+pulse)));
    float contact=(1.0-smoothstep(.025,.10,abs(ellipse-1.0)))*.32;
    float trail=smoothstep(-1.1,-.75,along)*(1.0-smoothstep(-.15,.2,along))*swimming;
    float width=.17+max(0.0,-along)*.20;
    float wake=(1.0-smoothstep(.018,.065,abs(abs(across)-width)))*trail*.25;
    wake*=.65+.35*sin(along*13.0+uTime*4.2);
    foam=max(foam,contact+wake);
  }
  col=mix(col,vec3(.79,.91,.94),clamp(foam,0.0,.55));
  gl_FragColor=vec4(col*uLight,.61+rim*.10);
}`;
export function poolWater(root) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLight: { value: 1 },
      uHalf: { value: new THREE.Vector2(POOL.w / 2, POOL.l / 2) },
      uSwimmers: { value: Array.from({ length: 3 }, () => new THREE.Vector4()) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(POOL.w, POOL.l).rotateX(-Math.PI / 2), material);
  mesh.name = 'pool:water';
  mesh.position.set(POOL.x, 0.09, POOL.z);
  mesh.userData.noInk = mesh.userData.noAO = mesh.userData.noTraversal = true;
  root.add(mesh);
  return {
    onPeriod: (period) => {
      material.uniforms.uLight.value = period === 'evening' ? 0.74 : 1;
    },
  };
}
export function poolWaterContact(root) {
  const water = root.getObjectByName('pool:water'),
    uniforms = water?.material?.uniforms;
  const position = new THREE.Vector3(),
    heading = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    inverse = new THREE.Quaternion();
  const clear = () => {
    if (uniforms) {
      for (const s of uniforms.uSwimmers.value) s.set(0, 0, 0, 0);
      uniforms.uTime.value = 0;
    }
  };
  return {
    clear,
    update(dt = 0) {
      if (uniforms) uniforms.uTime.value += Math.min(0.1, Math.max(0, dt));
    },
    set(i, rig, mode) {
      if (!uniforms) return;
      const s = uniforms.uSwimmers.value[i];
      if (!mode || !rig?.root.visible) {
        s.w = 0;
        return;
      }
      rig.root.getWorldPosition(position);
      water.worldToLocal(position);
      rig.root.getWorldQuaternion(rotation);
      water.getWorldQuaternion(inverse).invert();
      heading.set(0, 0, 1).applyQuaternion(rotation).applyQuaternion(inverse);
      s.set(position.x, position.z, Math.atan2(heading.x, heading.z), mode === 'swim' ? 2 : 1);
    },
  };
}
