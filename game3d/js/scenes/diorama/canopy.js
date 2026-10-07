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
      float crownLeaves(vec2 p){
        vec2 grid=p*10.,cell=floor(grid),uv=fract(grid)-.5;
        float seed=crownHash(cell),angle=seed*6.28318;
        uv=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*uv;
        float edge=length(uv/vec2(.58,.34));
        float leaf=1.-smoothstep(.76,1.05,edge);
        return .42+leaf*(.35+.35*seed)+.18*uv.y;
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
  core.material.customProgramCacheKey = () => 'diorama-leaf-interior-v1';
  core.castShadow = core.receiveShadow = true;
  root.add(core);
}
