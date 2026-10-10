// three's GTAOPass with one change: a mesh tagged userData.noAO stays out of the AO's own normal and depth pass, in
// the same walk that already leaves out points, lines and sprites. The far view's island model (scenes/far-model.js)
// doubled its triangles there for contact shadows nobody sees past the haze (#365). post.js builds its AO with this.
import { GTAOPass as Base } from 'three/addons/postprocessing/GTAOPass.js';

export class GTAOPass extends Base {
  _overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      if (o.visible && (o.isPoints || o.isLine || o.isLine2 || o.isSprite || o.userData.noAO)) {
        o.visible = false;
        cache.push(o);
      }
    });
  }
}
