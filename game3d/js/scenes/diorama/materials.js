import*as g from"three";import{STATION as l}from"../station-exterior.js";import{windowPane as y}from"./reflections.js";import{skyEnv as x}from"../../kit/materials/env.js";import{varyPanes as h}from"./glazing.js";import{leafCluster as S}from"./canopy.js";export function streetMaterial(n,a){const r=n.clone();return r.userData={...n.userData,noLook:!0},r.roughness=a==="metal"?.42:.86,a==="mulch-cover"?(r.map=S(),r.alphaTest=.4,r.side=g.DoubleSide,r):(r.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vStreet; varying vec3 vStreetNormal;`),t.vertexShader=t.vertexShader.replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vStreet=(modelMatrix*vec4(transformed,1.)).xyz; vStreetNormal=normalize(mat3(modelMatrix)*objectNormal);`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
      varying vec3 vStreet; varying vec3 vStreetNormal;
      float streetHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float streetNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(streetHash(i),streetHash(i+vec3(1,0,0)),f.x),mix(streetHash(i+vec3(0,1,0)),streetHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(streetHash(i+vec3(0,0,1)),streetHash(i+vec3(1,0,1)),f.x),mix(streetHash(i+vec3(0,1,1)),streetHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `);const e=a==="brick"?`
      vec2 wall=vec2(abs(vStreetNormal.x)>.5?vStreet.z:vStreet.x,vStreet.y);
      vec2 cell=wall/vec2(.33,.13);cell.x+=mod(floor(cell.y),2.)*.5;
      vec2 edge=min(fract(cell),1.-fract(cell));
      float mortar=1.-smoothstep(.015,.045,min(edge.x,edge.y));
      float block=streetHash(vec3(floor(cell),1.));
      vec3 stone=mix(vec3(.40,.32,.23),vec3(.57,.46,.33),block);
      diffuseColor.rgb=mix(stone,vec3(.34,.31,.25),mortar);
      streetRelief+=(1.-mortar)*.035;
    `:a==="limestone"?`
      float stoneTone=streetHash(vec3(floor(vStreet.xz/.6),1.));
      bool guidance=diffuseColor.r>diffuseColor.b*2.2 && diffuseColor.g>diffuseColor.b*1.8;
      if(!guidance)diffuseColor.rgb=mix(vec3(.35,.32,.28),vec3(.48,.45,.40),stoneTone);
    `:a==="bark"?`float ridges=streetNoise(vec3(vStreet.x*28.,vStreet.y*2.5,vStreet.z*28.));
               diffuseColor.rgb*=.58+.7*ridges;streetRelief+=.024*ridges;`:a==="mulch"?"float chips=streetNoise(vStreet*85.);diffuseColor.rgb*=.65+.65*chips;streetRelief+=.018*chips;":["grass","foliage","soil"].includes(a)?`if(vStreetNormal.y>.8 && vStreet.y<.45){
              float turfPatch=streetNoise(vStreet*1.3);
              float tufts=streetNoise(vStreet*14.);
              vec2 turfCell=vStreet.xz*42.;
              vec2 turfUv=fract(turfCell)-.5;
              float turfSeed=streetHash(vec3(floor(turfCell),0.));
              float turfBlade=1.-smoothstep(.025,.13,abs(turfUv.x+(turfSeed-.5)*turfUv.y));
              turfBlade*=smoothstep(-.5,.15,turfUv.y);
              diffuseColor.rgb=mix(vec3(.065,.115,.026),vec3(.19,.25,.068),turfPatch);
              diffuseColor.rgb*=.78+.25*tufts+.28*turfBlade;
              streetRelief+=.009*turfBlade;
            }`:a==="concrete"?"diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.31,.28),.22);":"";t.fragmentShader=t.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
      float streetRelief=0.;
      ${e}
      float grain=streetNoise(vStreet*105.);
      float mottling=streetNoise(vStreet*3.7);
      diffuseColor.rgb*=.88+.14*mottling+.10*grain;
      streetRelief+=.022*mottling+.007*grain;
    `),["brick","limestone","concrete","stone","grass","foliage","soil","bark","mulch"].includes(a)&&(t.fragmentShader=t.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
      vec3 streetDx=normalize(dFdx(-vViewPosition)),streetDy=normalize(dFdy(-vViewPosition));
      vec3 streetR1=cross(streetDy,normal),streetR2=cross(normal,streetDx);
      float streetDet=dot(streetDx,streetR1)*faceDirection;
      vec3 streetGrad=sign(streetDet)*(dFdx(streetRelief)*streetR1+dFdy(streetRelief)*streetR2);
      normal=normalize(abs(streetDet)*normal-streetGrad);
    `))},r.customProgramCacheKey=()=>"diorama-street-"+a,r)}export function finishStreet(n,a=!1){const r=new Map,t=x();return n.traverse(e=>{if(!e.isMesh||e.isSkinnedMesh||e.isInstancedMesh||Array.isArray(e.material)||e.material.map)return;const u=e.material.color.getHexString();if(e.material.transparent)return;if(e.name==="station:trim"||e.parent===n&&u==="b3b9c0"){e.material=e.material.clone(),e.material.color.set("#96968a"),e.geometry=e.geometry.clone();const s=e.geometry.attributes.position;for(let o=0;o<s.count;o++){const f=s.getX(o),p=s.getY(o),d=s.getZ(o);p>3.8||(f>l.x1?s.setX(o,l.x1+(f-l.x1)*.14):f<l.x0&&s.setX(o,l.x0+(f-l.x0)*.14),d>l.zS?s.setZ(o,l.zS+(d-l.zS)*.14):d<l.zN&&s.setZ(o,l.zN+(d-l.zN)*.14))}s.needsUpdate=!0,e.geometry.computeBoundingSphere()}const c=e.name==="station:walls"||u==="8a8f96"?"cladding":["station:roof","station:frame"].includes(e.name)?"metal":e.userData.surf;if(!["paving","concrete","cladding","plaster","stone","metal","bark","foliage","grass","soil","mulch","mulch-cover"].includes(c)||a&&["soil","mulch","metal","cladding"].includes(c))return;e.geometry.computeBoundingBox();const i=e.geometry.boundingBox.getSize(new g.Vector3),v=["cladding","plaster"].includes(c)&&i.y>1.5?"brick":c==="concrete"&&i.y<.12&&e.geometry.attributes.color?"limestone":c,m=e.material.uuid+v;if(r.has(m)||r.set(m,streetMaterial(e.material,v)),e.material=r.get(m),v==="metal"||e.name==="station:roof"||e.name==="station:frame"){const s=e.name==="station:roof"||e.name==="station:frame";e.material.metalness=s?.38:.62,e.material.roughness=s?.55:.3,e.material.envMap=t,e.material.envMapIntensity=s?.5:.7}e.userData.noLook=!0}),finishWindows(n,t),t}export function finishWindows(n,a){const r=y();n.traverse(t=>{if(!t.isMesh||Array.isArray(t.material)||t.isSkinnedMesh||t.material.map||t.material.color?.getHexString()!=="8c9dad"&&!/^ho:.*glass/i.test(t.name)&&t.name!=="station:glass")return;const e=t.material,u=e.color.clone(),c=new g.Color("#8ba6b4"),i=e.clone();i.color.copy(c),i.emissiveIntensity<=.05&&(i.emissiveIntensity=0),i.map=r.color,i.emissiveMap=r.glow,i.roughness=.13,i.metalness=.3,i.envMap=a,i.envMapIntensity=1.3,i.userData.noLook=t.userData.noLook=!0,t.material=i,h(t);const v=t.onBeforeRender,m=e.color.clone(),s=e.emissive.clone();let o=e.emissiveIntensity;t.onBeforeRender=function(...f){v.apply(this,f),e.color.equals(m)||(this.material.color.copy(e.color.equals(u)?c:e.color),m.copy(e.color)),e.emissive.equals(s)||(this.material.emissive.copy(e.emissive),s.copy(e.emissive)),e.emissiveIntensity!==o&&(this.material.emissiveIntensity=e.emissiveIntensity,o=e.emissiveIntensity)}})}
