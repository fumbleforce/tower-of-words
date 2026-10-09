import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function leafCluster() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const leaves = [
    [39, 35, -0.8],
    [68, 22, 0.2],
    [87, 48, 0.9],
    [48, 64, -0.5],
    [78, 80, 0.6],
    [33, 91, -0.8],
    [59, 105, 0.15],
  ];
  leaves.forEach(([x, y, angle], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.bezierCurveTo(15, -10, 14, 8, 0, 20);
    ctx.bezierCurveTo(-13, 9, -14, -8, 0, -20);
    const shade = ctx.createLinearGradient(-12, -12, 12, 12);
    shade.addColorStop(0, i % 2 ? '#ededed' : '#ffffff');
    shade.addColorStop(0.48, '#e1e1e1');
    shade.addColorStop(0.52, '#c5c5c5');
    shade.addColorStop(1, '#aeaeae');
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.restore();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function addCanopyCore(root, faces) {
  // A recessed, dark leaf mass closes the gaps between the outer leaves.
  // The outer leaves still define its silhouette and catch the sunlight.
  const coreGeometry = new THREE.BufferGeometry();
  const vertices = [],
    normals = [];
  for (const face of faces)
    for (const p of [face.a, face.b, face.c]) {
      vertices.push(p.x, p.y, p.z);
      normals.push(face.n.x, face.n.y, face.n.z);
    }
  coreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  coreGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const core = new THREE.Mesh(
    mergeVertices(coreGeometry),
    new THREE.MeshStandardMaterial({ color: '#365020', roughness: 1 }),
  );
  coreGeometry.dispose();

  core.name = 'diorama-foliage-interior';
  core.userData.noLook = core.material.userData.noLook = true;
  core.material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vCrown; varying vec3 vCrownNormal;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvCrown=(modelMatrix*vec4(transformed,1.)).xyz; vCrownNormal=normalize(mat3(modelMatrix)*objectNormal);',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vCrown; varying vec3 vCrownNormal;
      float crownHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float crownNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(crownHash(i),crownHash(i+vec2(1,0)),f.x),mix(crownHash(i+vec2(0,1)),crownHash(i+vec2(1,1)),f.x),f.y);
      }
      // Leaves scattered at random points (the nearest of the jittered neighbours), each its own size, turn and
      // shade, under soft clumps of light and shadow: no row or grid to pick out (issue #362).
      float crownLayer(vec2 p){
        vec2 cell=floor(p);float best=9.,tone=.5,lit=0.;
        for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
          vec2 c=cell+vec2(i,j);float h=crownHash(c),k=crownHash(c+17.3);
          vec2 d=p-(c+vec2(h,k));float a=h*6.28318;
          d=mat2(cos(a),-sin(a),sin(a),cos(a))*d;
          float e=length(d/vec2(.62,.36))/(.75+.5*k);
          if(e<best){best=e;tone=h;lit=d.y;}
        }
        float leaf=1.-smoothstep(.55,1.,best);
        return leaf*(.25+.45*tone)+lit*.12;
      }
      float crownLeaves(vec2 p){
        vec2 q=mat2(.8,-.6,.6,.8)*p;
        float leaves=max(crownLayer(p*9.),crownLayer(q*13.+5.1)*.85);
        float clump=crownNoise(p*2.3)*.6+crownNoise(q*5.1)*.4;
        return .4+leaves*.8+(clump-.5)*.42;
      }
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 crownWeight=pow(abs(normalize(vCrownNormal)),vec3(4.));
      crownWeight/=dot(crownWeight,vec3(1.));
      float crownTone=dot(crownWeight,vec3(crownLeaves(vCrown.yz),crownLeaves(vCrown.xz),crownLeaves(vCrown.xy)));
      diffuseColor.rgb*=crownTone;
      float crownRelief=crownTone*.035;
    `,
    );
  };
  const compileCore = core.material.onBeforeCompile;
  core.material.onBeforeCompile = (shader) => {
    compileCore(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      vec3 crownDx=dFdx(-vViewPosition),crownDy=dFdy(-vViewPosition);
      vec3 crownR1=cross(crownDy,normal),crownR2=cross(normal,crownDx);
      float crownDet=dot(crownDx,crownR1)*faceDirection;
      normal=normalize(abs(crownDet)*normal-sign(crownDet)*(dFdx(crownRelief)*crownR1+dFdy(crownRelief)*crownR2));
    `,
    );
  };
  core.material.customProgramCacheKey = () => 'diorama-leaf-interior-v2';
  core.castShadow = core.receiveShadow = true;
  root.add(core);
}
