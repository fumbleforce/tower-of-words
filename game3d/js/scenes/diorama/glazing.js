import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BU, GF } from '../head-office/frame.js';

function lobbyPanes(source) {
  const p = source.attributes.position,
    parts = [],
    box = new THREE.Box3(),
    point = new THREE.Vector3();
  if (!source.index || p.count % 24) return source.clone();
  for (let start = 0; start < p.count; start += 24) {
    box.makeEmpty();
    for (let i = start; i < start + 24; i++) box.expandByPoint(point.fromBufferAttribute(p, i));
    const xs = [box.min.x, ...BU.filter((x) => x > box.min.x + 0.01 && x < box.max.x - 0.01), box.max.x];
    const ys = [box.min.y, ...(GF > box.min.y + 0.01 && GF < box.max.y - 0.01 ? [GF] : []), box.max.y];
    for (let i = 1; i < xs.length; i++)
      for (let j = 1; j < ys.length; j++)
        parts.push(
          new THREE.BoxGeometry(xs[i] - xs[i - 1], ys[j] - ys[j - 1], box.max.z - box.min.z).translate(
            (xs[i] + xs[i - 1]) / 2,
            (ys[j] + ys[j - 1]) / 2,
            (box.min.z + box.max.z) / 2,
          ),
        );
  }
  const result = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return result;
}

// Each authored glass box selects one interior from a shared atlas. Preserve the
// pane mesh and its callback ownership; only its private UVs and shader change.
export function varyPanes(mesh) {
  const geometry = mesh.name === 'ho:lobbyGlass' ? lobbyPanes(mesh.geometry) : mesh.geometry.clone(),
    position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!uv) {
    geometry.dispose();
    return;
  }
  const box = new THREE.Box3(),
    point = new THREE.Vector3(),
    center = new THREE.Vector3();
  const stride = geometry.index && position.count % 24 === 0 ? 24 : position.count;
  mesh.updateWorldMatrix(true, false);
  for (let start = 0; start < position.count; start += stride) {
    box.makeEmpty();
    for (let i = start; i < start + stride; i++) box.expandByPoint(point.fromBufferAttribute(position, i));
    box.getCenter(center).applyMatrix4(mesh.matrixWorld);
    const random = Math.sin(center.x * 17.17 + center.y * 41.73 + center.z * 13.11) * 43758.5453;
    const cell = Math.floor((random - Math.floor(random)) * 8),
      column = cell % 4,
      row = Math.floor(cell / 4);
    for (let i = start; i < start + stride; i++)
      uv.setXY(i, (column + (2 + uv.getX(i) * 124) / 128) / 4, (1 - row + (2 + uv.getY(i) * 124) / 128) / 2);
  }
  uv.needsUpdate = true;
  mesh.geometry = geometry;
  const material = mesh.material;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vPaneWorld; varying vec3 vPaneNormal;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvPaneWorld=(modelMatrix*vec4(transformed,1.)).xyz; vPaneNormal=normalize(mat3(modelMatrix)*objectNormal);',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vPaneWorld; varying vec3 vPaneNormal;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // One broad angular reflection runs across the facade, without restarting at each bay.
      float facadeX=abs(vPaneNormal.z)>.5?vPaneWorld.x:vPaneWorld.z;
      float skyEdge=vPaneWorld.y-(1.2+.14*facadeX);
      float skyShape=smoothstep(-.03,.03,skyEdge)*(1.-smoothstep(1.3,1.36,skyEdge));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.28,.36),skyShape*.12);
    `,
    );
  };
  material.customProgramCacheKey = () => 'diorama-pane-atlas-v1';
}
