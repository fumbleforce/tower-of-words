import*as e from"three";import{POOL as i}from"./deck-plan.js";const f=`varying vec2 vPool;
void main(){ vPool=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,w=`uniform float uTime,uLight; uniform vec2 uHalf;
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
}`;export function poolWater(r){const t=new e.ShaderMaterial({uniforms:{uTime:{value:0},uLight:{value:1},uHalf:{value:new e.Vector2(i.w/2,i.l/2)},uSwimmers:{value:Array.from({length:3},()=>new e.Vector4)}},vertexShader:f,fragmentShader:w,transparent:!0,depthWrite:!1}),o=new e.Mesh(new e.PlaneGeometry(i.w,i.l).rotateX(-Math.PI/2),t);return o.name="pool:water",o.position.set(i.x,.09,i.z),o.userData.noInk=o.userData.noAO=o.userData.noTraversal=!0,r.add(o),{onPeriod:a=>{t.uniforms.uLight.value=a==="evening"?.74:1}}}export function poolWaterContact(r){const t=r.getObjectByName("pool:water"),o=t?.material?.uniforms,a=new e.Vector3,s=new e.Vector3,m=new e.Quaternion,u=new e.Quaternion;return{clear:()=>{if(o){for(const n of o.uSwimmers.value)n.set(0,0,0,0);o.uTime.value=0}},update(n=0){o&&(o.uTime.value+=Math.min(.1,Math.max(0,n)))},set(n,l,c){if(!o)return;const v=o.uSwimmers.value[n];if(!c||!l?.root.visible){v.w=0;return}l.root.getWorldPosition(a),t.worldToLocal(a),l.root.getWorldQuaternion(m),t.getWorldQuaternion(u).invert(),s.set(0,0,1).applyQuaternion(m).applyQuaternion(u),v.set(a.x,a.z,Math.atan2(s.x,s.z),c==="swim"?2:1)}}}
