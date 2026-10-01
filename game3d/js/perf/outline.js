// The outline pass without its own depth pass (issues #78 and #82, notes/PERF.md "Phone draw calls").
// three's OutlinePass draws every other object in the scene into a depth buffer, so that the parts of the target
// behind a wall get no outline: a second draw of the scene whenever anything is outlined. The main render already
// has that depth: post.js gives the composer's targets a depth texture, and the mask compares the target with it.
// The target is in that depth too (it was drawn), so a pixel counts as hidden only when something lies clearly in
// front of it, a few millimetres per metre of distance.
// Without a depth texture (a composer made elsewhere) it falls back to three's depth pass, cut down to the target's
// rectangle on screen (setViewOffset): whatever is outside it is frustum-culled, and the mask looks the depth up
// through the same cut camera.
//   import { OutlinePass } from './perf/outline.js'   same API as three's, plus resolve (below)
import * as THREE from 'three';
import { OutlinePass as ThreeOutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

const box = new THREE.Box3(),
  v = new THREE.Vector3(),
  rect = new THREE.Box2();

// the mask against the main render's depth (a plain depth texture, not packed into colour like three's)
function sceneDepthMask(packed) {
  return new THREE.ShaderMaterial({
    uniforms: {
      depthTexture: { value: null },
      cameraNearFar: { value: new THREE.Vector2(0.5, 0.5) },
      textureMatrix: { value: null },
    },
    vertexShader: packed.vertexShader,
    fragmentShader: `#include <packing>
      varying vec4 vPosition;
      varying vec4 projTexCoord;
      uniform sampler2D depthTexture;
      uniform vec2 cameraNearFar;
      void main() {
        float viewZ = -perspectiveDepthToViewZ(texture2DProj(depthTexture, projTexCoord).x, cameraNearFar.x, cameraNearFar.y);
        float z = -vPosition.z;
        gl_FragColor = vec4(0.0, z > viewZ + 0.004 * z + 0.01 ? 1.0 : 0.0, 1.0, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

export class OutlinePass extends ThreeOutlinePass {
  constructor(...a) {
    super(...a);
    // the scene-depth mask is the usual one (js/perf/warm.js compiles prepareMaskMaterial ahead)
    this.packedMask = this.prepareMaskMaterial;
    if (this.renderCamera.isPerspectiveCamera) this.prepareMaskMaterial = sceneDepthMask(this.packedMask);
  }
  // the outlined things' rectangle in normalised device coordinates, grown a little; null if it can't be cropped
  // (a corner behind the camera, or it fills most of the screen anyway)
  _cropRect() {
    const cam = this.renderCamera;
    rect.makeEmpty();
    let behind = false;
    const add = (o) => {
      if (behind || !o.geometry || !o.visible) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      // skinned meshes pose away from their bind box: grow it by a third
      if (o.isSkinnedMesh) box.expandByScalar(box.getSize(v).length() / 3);
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        v.applyMatrix4(cam.matrixWorldInverse);
        if (v.z > -cam.near) return void (behind = true);
        rect.expandByPoint(v.applyMatrix4(cam.projectionMatrix));
      }
    };
    for (const o of this.selectedObjects) o.traverse(add);
    if (behind) return null;
    if (rect.isEmpty()) return null;
    rect.expandByScalar(0.02);
    rect.min.clampScalar(-1, 1);
    rect.max.clampScalar(-1, 1);
    const w = rect.max.x - rect.min.x,
      h = rect.max.y - rect.min.y;
    return w > 0 && h > 0 && w * h < 3 ? rect : null;
  }
  _cropCamera() {
    const cam = this.renderCamera;
    if (!cam.isPerspectiveCamera || cam.view?.enabled) return null;
    const r = this._cropRect();
    if (!r) return null;
    const c = (this._crop ||= new THREE.PerspectiveCamera());
    c.copy(cam, false);
    c.matrixWorldAutoUpdate = false; // the matrices below are the render camera's, parent or not
    // full size in pixels of an arbitrary 1000 x 1000/aspect frame; the offset picks the rectangle out of it
    const W = 1000,
      H = W / cam.aspect;
    c.setViewOffset(
      W,
      H,
      ((r.min.x + 1) / 2) * W,
      ((1 - r.max.y) / 2) * H,
      ((r.max.x - r.min.x) / 2) * W,
      ((r.max.y - r.min.y) / 2) * H,
    );
    c.matrixWorld.copy(cam.matrixWorld);
    c.matrixWorldInverse.copy(cam.matrixWorldInverse);
    return c;
  }
  // resolve(list): what to select for the given meshes this frame (main.js: the draw-call pass's forOutline, which
  // puts a merged thing's twins in place of its meshes, js/perf/batch-twin.js)
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const sel = this.selectedObjects;
    if (this.resolve && sel.length) this.selectedObjects = this.resolve(sel);
    const depth =
      this.selectedObjects.length && this.prepareMaskMaterial !== this.packedMask && readBuffer.depthTexture;
    const crop = !depth && this.selectedObjects.length ? this._cropCamera() : null;
    this._depthCam = crop;
    const draw = renderer.render,
      mask = this.prepareMaskMaterial;
    if (depth)
      renderer.render = (scene, camera) => {
        if (scene.overrideMaterial === this.depthMaterial) return; // the main render's depth stands in for it
        if (scene.overrideMaterial === mask) mask.uniforms.depthTexture.value = depth;
        draw.call(renderer, scene, camera);
      };
    else {
      this.prepareMaskMaterial = this.packedMask;
      if (crop)
        renderer.render = (scene, camera) =>
          draw.call(renderer, scene, scene.overrideMaterial === this.depthMaterial ? crop : camera);
    }
    try {
      super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    } finally {
      renderer.render = draw;
      this.prepareMaskMaterial = mask;
      this._depthCam = null;
      this.selectedObjects = sel;
    }
  }
  _updateTextureMatrix() {
    const c = this._depthCam || this.renderCamera;
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    this.textureMatrix.multiply(c.projectionMatrix);
    this.textureMatrix.multiply(c.matrixWorldInverse);
  }
}
