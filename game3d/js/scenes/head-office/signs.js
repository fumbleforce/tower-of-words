// The head office lobby's signs, all drawn on one canvas (one texture, one material): AMAKAWA in steel letters
// and 受付 RECEPTION on the feature wall behind the desk, the floor plates over the lift doors and the stair door,
// and the floor directory. Each sign is a plane with its own piece of the canvas; the planes are merged into one
// mesh per group the lobby needs apart (the feature wall's fade, the lift wall's cut), so the lot costs a draw call
// a group. The plates share one style: a dark slate plate, pale letters, the same fonts as the canopy's fascia.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { textTexture, JP_FONT } from '../../props.js';

const W = 2048,
  H = 1024;
const PLATE = '#2f343c',
  INK = '#e9ecf0',
  INK2 = '#9aa3b0';
// where each sign is on the canvas: [x, y, w, h] in pixels
const AT = {
  amakawa: [0, 0, 1280, 200],
  reception: [1280, 0, 768, 200],
  lift0: [0, 220, 400, 72],
  lift1: [410, 220, 400, 72],
  lift2: [820, 220, 400, 72],
  lift3: [1230, 220, 400, 72],
  stairs: [1640, 220, 400, 72],
  directory: [0, 320, 640, 480],
};
export const LIFT_SIGNS = ['B2 - 5F', '1F - 5F', '6F - 10F', '6F - 10F'];

function draw(ctx) {
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  // brushed steel letters standing off the stone: a dark edge below and right, then the face
  const steel = (text, x, y, font, spacing = '0px') => {
    ctx.font = font;
    ctx.letterSpacing = spacing;
    ctx.fillStyle = '#3f454d';
    ctx.fillText(text, x + 4, y + 5);
    ctx.fillStyle = '#6d757f';
    ctx.fillText(text, x, y);
  };
  ctx.textAlign = 'center';
  let [x, y, w, h] = AT.amakawa;
  steel('AMAKAWA', x + w / 2, y + h / 2 + 6, '700 150px sans-serif', '30px');
  [x, y, w, h] = AT.reception;
  const [ja, en] = ['受付', 'RECEPTION'];
  steel(ja, x + 190, y + h / 2 + 4, '700 120px ' + JP_FONT);
  steel(en, x + 530, y + h / 2 + 10, '600 62px sans-serif', '6px');
  ctx.letterSpacing = '0px';
  const plate = ([x, y, w, h], text, font) => {
    ctx.fillStyle = PLATE;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = INK;
    ctx.font = font;
    ctx.fillText(text, x + w / 2, y + h / 2 + 2);
  };
  LIFT_SIGNS.forEach((t, i) => plate(AT['lift' + i], t, '600 44px sans-serif'));
  plate(AT.stairs, ['階段', 'STAIRS'].join('  '), '600 40px ' + JP_FONT);
  // the directory: every floor as a grey bar except the two that matter today, written large enough to read
  [x, y, w, h] = AT.directory;
  ctx.fillStyle = PLATE;
  ctx.fillRect(x, y, w, h);
  ctx.textAlign = 'left';
  const rows = ['10F', '9F', '8F', '7F', '6F', '5F', '4F', '3F', '2F', '1F', 'B1', 'B2'];
  const big = { '5F': 'Sales', B2: 'IT Support' };
  let ry = y + 22;
  rows.forEach((f, i) => {
    const rh = big[f] ? 104 : 23,
      mid = ry + rh / 2;
    if (big[f]) {
      ctx.fillStyle = INK;
      ctx.font = '700 78px sans-serif';
      ctx.fillText(f, x + 24, mid + 3);
      ctx.font = '600 78px sans-serif';
      ctx.fillText(big[f], x + 170, mid + 3, w - 190);
    } else {
      ctx.fillStyle = INK2;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x + 24, mid - 6, 70, 12);
      ctx.fillRect(x + 170, mid - 6, 200 + ((i * 53) % 150), 12);
      ctx.globalAlpha = 1;
    }
    ry += rh;
  });
}

let tex = null;
const texture = () => (tex ||= textTexture(draw, W, H));

// signs: [[id, width, x, y, z, turn = 0]] in the parent's frame (the sign's height follows its piece's shape); one
// mesh, named so the static merge leaves it alone
export function signMesh(name, signs) {
  const geos = signs.map(([id, w, x, y, z, turn = 0]) => {
    const [px, py, pw, ph] = AT[id];
    const g = new THREE.PlaneGeometry(w, (w * ph) / pw);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * pw) / W, 1 - (py + (1 - uv.getY(i)) * ph) / H);
    if (turn) g.rotateY(turn);
    return g.translate(x, y, z);
  });
  const m = new THREE.Mesh(
    mergeGeometries(geos),
    new THREE.MeshStandardMaterial({
      map: texture(),
      roughness: 0.6,
      alphaTest: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  geos.forEach((g) => g.dispose());
  m.name = name;
  m.userData.noBatch = true; // shown and hidden on its own (the fade, the lift's cut)
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}
