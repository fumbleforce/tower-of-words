import * as THREE from 'three';
import { STATION } from '../station-exterior.js';
import { streetReflections, windowPane } from './reflections.js';
import { varyPanes } from './glazing.js';
import { leafCluster } from './canopy.js';

// A world-space finish keeps the existing paving and building geometry aligned at seams.
// The street style's own copies: the shared materials the other outdoor places use stay as they are.
export function streetMaterial(original, kind) {
  const material = original.clone();
  material.userData = { ...original.userData, noLook: true };
  material.roughness = kind === 'metal' ? 0.42 : 0.86;
  if (kind === 'mulch-cover') {
    material.map = leafCluster();
    material.alphaTest = 0.4;
    material.side = THREE.DoubleSide;
    return material;
  }
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vStreet; varying vec3 vStreetNormal;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvStreet=(modelMatrix*vec4(transformed,1.)).xyz; vStreetNormal=normalize(mat3(modelMatrix)*objectNormal);',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vStreet; varying vec3 vStreetNormal;
      float streetHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float streetNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(streetHash(i),streetHash(i+vec3(1,0,0)),f.x),mix(streetHash(i+vec3(0,1,0)),streetHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(streetHash(i+vec3(0,0,1)),streetHash(i+vec3(1,0,1)),f.x),mix(streetHash(i+vec3(0,1,1)),streetHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `,
    );
    const brick =
      kind === 'brick'
        ? `
      vec2 wall=vec2(abs(vStreetNormal.x)>.5?vStreet.z:vStreet.x,vStreet.y);
      vec2 cell=wall/vec2(.33,.13);cell.x+=mod(floor(cell.y),2.)*.5;
      vec2 edge=min(fract(cell),1.-fract(cell));
      float mortar=1.-smoothstep(.015,.045,min(edge.x,edge.y));
      float block=streetHash(vec3(floor(cell),1.));
      vec3 stone=mix(vec3(.40,.32,.23),vec3(.57,.46,.33),block);
      diffuseColor.rgb=mix(stone,vec3(.34,.31,.25),mortar);
      streetRelief+=(1.-mortar)*.035;
    `
        : kind === 'limestone'
          ? `
      float stoneTone=streetHash(vec3(floor(vStreet.xz/.6),1.));
      bool guidance=diffuseColor.r>diffuseColor.b*2.2 && diffuseColor.g>diffuseColor.b*1.8;
      if(!guidance)diffuseColor.rgb=mix(vec3(.35,.32,.28),vec3(.48,.45,.40),stoneTone);
    `
          : kind === 'bark'
            ? `float ridges=streetNoise(vec3(vStreet.x*28.,vStreet.y*2.5,vStreet.z*28.));
               diffuseColor.rgb*=.58+.7*ridges;streetRelief+=.024*ridges;`
            : kind === 'mulch'
              ? `float chips=streetNoise(vStreet*85.);diffuseColor.rgb*=.65+.65*chips;streetRelief+=.018*chips;`
              : ['grass', 'foliage', 'soil'].includes(kind)
                ? `if(vStreetNormal.y>.8 && vStreet.y<.45){
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
            }`
                : kind === 'concrete'
                  ? `diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.31,.28),.22);`
                  : '';
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float streetRelief=0.;
      ${brick}
      float grain=streetNoise(vStreet*105.);
      float mottling=streetNoise(vStreet*3.7);
      diffuseColor.rgb*=.88+.14*mottling+.10*grain;
      streetRelief+=.022*mottling+.007*grain;
    `,
    );
    if (['brick', 'limestone', 'concrete', 'stone', 'grass', 'foliage', 'soil', 'bark', 'mulch'].includes(kind))
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
      vec3 streetDx=normalize(dFdx(-vViewPosition)),streetDy=normalize(dFdy(-vViewPosition));
      vec3 streetR1=cross(streetDy,normal),streetR2=cross(normal,streetDx);
      float streetDet=dot(streetDx,streetR1)*faceDirection;
      vec3 streetGrad=sign(streetDet)*(dFdx(streetRelief)*streetR1+dFdy(streetRelief)*streetR2);
      normal=normalize(abs(streetDet)*normal-streetGrad);
    `,
      );
  };
  material.customProgramCacheKey = () => 'diorama-street-' + kind;
  return material;
}

// phone: soil, mulch, metal and cladding keep the shared materials they were built with (one draw less each)
export function finishStreet(root, phone = false) {
  const cache = new Map(),
    environment = streetReflections();
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.map) return;
    const originalColor = o.material.color.getHexString();
    if (o.material.transparent) return;
    if (o.name === 'station:trim' || (o.parent === root && originalColor === 'b3b9c0')) {
      o.material = o.material.clone();
      o.material.color.set('#96968a');
      // Shallow stone reveals keep the existing openings and their fade ownership.
      o.geometry = o.geometry.clone();
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        if (y > 3.8) continue;
        if (x > STATION.x1) p.setX(i, STATION.x1 + (x - STATION.x1) * 0.14);
        else if (x < STATION.x0) p.setX(i, STATION.x0 + (x - STATION.x0) * 0.14);
        if (z > STATION.zS) p.setZ(i, STATION.zS + (z - STATION.zS) * 0.14);
        else if (z < STATION.zN) p.setZ(i, STATION.zN + (z - STATION.zN) * 0.14);
      }
      p.needsUpdate = true;
      o.geometry.computeBoundingSphere();
    }
    const surface =
      o.name === 'station:walls' || originalColor === '8a8f96'
        ? 'cladding'
        : ['station:roof', 'station:frame'].includes(o.name)
          ? 'metal'
          : o.userData.surf;
    if (
      ![
        'paving',
        'concrete',
        'cladding',
        'plaster',
        'stone',
        'metal',
        'bark',
        'foliage',
        'grass',
        'soil',
        'mulch',
        'mulch-cover',
      ].includes(surface) ||
      (phone && ['soil', 'mulch', 'metal', 'cladding'].includes(surface))
    )
      return;
    o.geometry.computeBoundingBox();
    const size = o.geometry.boundingBox.getSize(new THREE.Vector3());
    const kind =
      ['cladding', 'plaster'].includes(surface) && size.y > 1.5
        ? 'brick'
        : surface === 'concrete' && size.y < 0.12 && o.geometry.attributes.color
          ? 'limestone'
          : surface;
    const key = o.material.uuid + kind;
    if (!cache.has(key)) cache.set(key, streetMaterial(o.material, kind));
    o.material = cache.get(key);
    if (kind === 'metal' || o.name === 'station:roof' || o.name === 'station:frame') {
      const coated = o.name === 'station:roof' || o.name === 'station:frame';
      o.material.metalness = coated ? 0.38 : 0.62;
      o.material.roughness = coated ? 0.55 : 0.3;
      o.material.envMap = environment;
      o.material.envMapIntensity = coated ? 0.5 : 0.7;
    }
    o.userData.noLook = true;
  });
  finishWindows(root, environment);
  return environment;
}

export function finishWindows(root, environment) {
  const pane = windowPane();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.isSkinnedMesh || o.material.map) return;
    if (o.material.color?.getHexString() !== '8c9dad' && !/^ho:.*glass/i.test(o.name) && o.name !== 'station:glass')
      return;
    // Building callbacks retain the source for evening light. Clone the street appearance so
    // cached materials used by other places remain untouched; forward only its light state.
    const source = o.material,
      daylight = source.color.clone(),
      tint = new THREE.Color('#8ba6b4');
    const material = source.clone();
    material.color.copy(tint);
    if (material.emissiveIntensity <= 0.05) material.emissiveIntensity = 0;
    material.map = pane.color;
    material.emissiveMap = pane.glow;
    material.roughness = 0.13;
    material.metalness = 0.3;
    material.envMap = environment;
    material.envMapIntensity = 1.3;
    material.userData.noLook = o.userData.noLook = true;
    o.material = material;
    varyPanes(o);
    const beforeRender = o.onBeforeRender;
    const lastColor = source.color.clone(),
      lastEmission = source.emissive.clone();
    let lastIntensity = source.emissiveIntensity;
    o.onBeforeRender = function (...args) {
      beforeRender.apply(this, args);
      // Lift clipping may clone this material again after the room is built.
      // Some period callbacks write their captured source, others the mesh's current material.
      // Forward source changes only; leave direct writes to the current material intact.
      if (!source.color.equals(lastColor)) {
        this.material.color.copy(source.color.equals(daylight) ? tint : source.color);
        lastColor.copy(source.color);
      }
      if (!source.emissive.equals(lastEmission)) {
        this.material.emissive.copy(source.emissive);
        lastEmission.copy(source.emissive);
      }
      if (source.emissiveIntensity !== lastIntensity) {
        this.material.emissiveIntensity = source.emissiveIntensity;
        lastIntensity = source.emissiveIntensity;
      }
    };
  });
}
