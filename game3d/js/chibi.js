// The Meshy chibis of Eric, Mio and Kuro (Review chibi-cast-meshy-1: eric-1, mio-3, kuro-1) as a switchable look.
// ?chibi=1 (or ?chibi=0) decides for one visit; otherwise Settings > Graphics > Chibi cast, from the next load. When
// on, the three get these bodies everywhere they appear; the approved models stay the default.
// Files in assets/characters/chibi-<id>/: model.glb and base.webp (tools/characters/chibi_game.py: about 20k
// triangles and a 1024 px texture baked from the full model; -lo: 8k, for phones), and clips.json
// (tools/characters/chibi-bake.mjs: the game's walk, run, idle, sit, phone pose and Eric's gestures carried over
// onto Meshy's rig, the legs at 0.55 of the swing, half the walk's lean, and the gait speeds that go with them).
import * as THREE from 'three';
import { loadMeshy, loadEric, GESTURES } from './avatar.js';
import { loadMio, CDIR, V } from './mio.js';
// settings.js needs a page; the unit tests import the cast in Node, where the look is off
const S = typeof addEventListener === 'function' ? await import('./settings.js') : null;

const flag = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('chibi') : null;
export const CHIBI_ON = flag != null ? flag !== '0' : !!S?.settings.chibi;
// standing heights, the same as the bodies they stand in for
const HEIGHT = { eric: 1.2, mio: 1.12, kuro: 1.12 };
// people in cast.js that take their chibi through cast3d.js
export const CHIBI_CAST = CHIBI_ON ? ['kuro'] : [];

export async function loadChibi(id) {
  const dir = CDIR + 'chibi-' + id + '/';
  const lo = S.isPhone() || S.qualityTier() === 'low' ? '-lo' : '';
  const data = await fetch(dir + 'clips.json' + V()).then((r) => {
    if (!r.ok) throw new Error(`chibi ${id}: ${r.status}`);
    return r.json();
  });
  const clip = (n) => THREE.AnimationClip.parse(data.clips[n]);
  const packed = (load) =>
    Promise.all([
      load(dir + `model${lo}.glb` + V()).then((g) => ({ scene: g.scene, animations: [clip('walk')] })),
      { animations: [clip('run')] },
      clip('idle'),
      { animations: [clip('sit')] },
      new THREE.TextureLoader().loadAsync(dir + `base${lo}.webp` + V()),
      data.clips.phone || null,
      ...GESTURES.map((g) => data.clips[g] || null),
    ]);
  const m = await loadMeshy('chibi-' + id, { height: HEIGHT[id], dir, packed, stride: data.gait });
  // The decimated surface folds over on itself in places, and culled back faces showed as specks of whatever is
  // behind. Both sides draw, lit by the full model's normals whichever side faces the camera.
  m.model.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material,
      before = mat.onBeforeCompile;
    mat.side = THREE.DoubleSide;
    mat.onBeforeCompile = (sh, r) => {
      before.call(mat, sh, r);
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n normal = normalize( vNormal );',
      );
    };
  });
  m.chibi = true;
  return m;
}

const fallback = (load) => (e) => {
  console.warn('chibi failed, using the approved model', e);
  return load();
};
// the player's and Mio's bodies for main.js boot(); a chibi that fails to load falls back to the approved model
export const ericBody = () => (CHIBI_ON ? loadChibi('eric').catch(fallback(loadEric)) : loadEric());
export const mioBody = () => {
  const mio = () => loadMio({ height: 1.12 });
  return CHIBI_ON ? loadChibi('mio').catch(fallback(mio)) : mio();
};

// Settings > Graphics: the switch, under Surface detail. Added the first time Settings is built (menu.js is at its
// size ceiling, as for the private-mode row in settings.js).
function ensureRow() {
  const surf = document.querySelector('#settings .sw[data-key="surfaces"]')?.closest('.row');
  if (!surf || document.querySelector('#settings [data-key="chibi"]')) return;
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML =
    '<span class="lbl" id="l-chibi">Chibi cast<small>Mio, Eric and Kuro as chibi figures, from the next time the game loads</small></span>' +
    '<button type="button" class="sw" role="switch" data-key="chibi" aria-labelledby="l-chibi"><i></i></button>';
  surf.after(row);
  const sw = row.querySelector('.sw');
  const paint = () => sw.setAttribute('aria-checked', S.settings.chibi ? 'true' : 'false');
  paint();
  sw.onclick = () => {
    S.setSetting('chibi', !S.settings.chibi);
    paint();
  };
}
if (S) new MutationObserver(ensureRow).observe(document.documentElement, { childList: true, subtree: true });
