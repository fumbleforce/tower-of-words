// The outline pass with its depth pass cropped to the outlined things (issue #78, notes/PERF.md "Phone draw calls").
// three's OutlinePass draws every other object in the scene into a depth buffer, so that the parts of the target
// behind a wall get no outline: a second full draw of the scene whenever anything is outlined (about 60 to 80 draws
// on the phone). Only what lies in front of the target on screen can hide it, so here the depth pass draws through
// a camera cut down to the target's rectangle on screen (setViewOffset); whatever is outside it is frustum-culled.
// The mask pass looks the depth up through the same cut camera, so the outline comes out the same.
//   import { OutlinePass } from './perf/outline.js'   same API as three's
import * as THREE from 'three';
import { OutlinePass as ThreeOutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

const box = new THREE.Box3(),
  v = new THREE.Vector3(),
  rect = new THREE.Box2();

export class OutlinePass extends ThreeOutlinePass {
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
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const crop = this.selectedObjects.length ? this._cropCamera() : null;
    this._depthCam = crop;
    if (!crop) return super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    const draw = renderer.render;
    renderer.render = (scene, camera) =>
      draw.call(renderer, scene, scene.overrideMaterial === this.depthMaterial ? crop : camera);
    try {
      super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    } finally {
      renderer.render = draw;
      this._depthCam = null;
    }
  }
  _updateTextureMatrix() {
    const c = this._depthCam || this.renderCamera;
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    this.textureMatrix.multiply(c.projectionMatrix);
    this.textureMatrix.multiply(c.matrixWorldInverse);
  }
}
