// three's GTAOPass with three changes (post.js builds its AO with this):
// - A mesh tagged userData.noAO stays out of the AO's own normal and depth pass, in the same walk that already leaves
//   out points, lines and sprites. The far view's island model (scenes/far-model.js) doubled its triangles there for
//   contact shadows nobody sees past the haze (#365).
// - The AO is multiplied straight onto the frame (one pass, no swap) instead of copying the frame into the other
//   buffer and multiplying onto that copy: the same picture, one full-screen pass and one multisample resolve fewer.
// - The AO, its normals and its denoise are worked out on at most MAX_PIXELS (a 1920x1080 frame) and filtered back
//   up: a larger frame gets its AO at a lower scale (2560x1440: 0.75 each way). The denoise radius is in pixels and
//   scales with it. At 2560x1440 on an RTX 3080 the AO was 2 to 4 ms of a 5 to 7 ms frame (#630, notes/PERF.md).
import { GTAOPass as Base } from 'three/addons/postprocessing/GTAOPass.js';

export const MAX_PIXELS = 1920 * 1080;
// the AO's scale for a frame of w x h (1: full size)
export const aoScale = (w, h, max = MAX_PIXELS) => Math.min(1, Math.sqrt(max / Math.max(1, w * h)));

export class GTAOPass extends Base {
  constructor(...args) {
    super(...args);
    this.needsSwap = false; // multiplied onto the frame in place (render below)
    this.pdRadius = this.pdMaterial.uniforms.radius.value;
  }
  _overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      if (o.visible && (o.isPoints || o.isLine || o.isLine2 || o.isSprite || o.userData.noAO)) {
        o.visible = false;
        cache.push(o);
      }
    });
  }
  // the frame's size; the AO's own targets get aoScale of it
  setSize(width, height) {
    const s = (this.scale = aoScale(width, height));
    super.setSize(Math.max(1, Math.round(width * s)), Math.max(1, Math.round(height * s)));
    // the base constructor sizes the pass before ours has read the radius
    if (this.pdRadius !== undefined) this.pdMaterial.uniforms.radius.value = Math.max(1, this.pdRadius * s);
  }
  updatePdMaterial(parameters) {
    super.updatePdMaterial(parameters);
    if (parameters.radius === undefined) return;
    this.pdRadius = parameters.radius;
    this.pdMaterial.uniforms.radius.value = Math.max(1, this.pdRadius * (this.scale ?? 1));
  }
  render(renderer, writeBuffer, readBuffer) {
    if (this.renderToScreen) return super.render(renderer, writeBuffer, readBuffer); // nothing on screen to multiply
    this.output = Base.OUTPUT.Off; // the normals, AO and denoise only
    super.render(renderer, writeBuffer, readBuffer);
    this.output = Base.OUTPUT.Default;
    this.blendMaterial.uniforms.intensity.value = this.blendIntensity;
    this.blendMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
    this._renderPass(renderer, this.blendMaterial, readBuffer); // multiplies (the base's blend material), no clear
  }
}
