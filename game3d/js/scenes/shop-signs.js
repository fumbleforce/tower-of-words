// Shop signs drawn into one canvas and merged into one mesh, so a street of signs costs one draw call: board signs
// (the kana large, the English small under it, as plaza-buildings.js signBoard) and vertical signs (the kana stacked
// top to bottom, for the projecting signs that stand out over a shop street). The evening lights them from inside.
//
//   const signs = signSet();
//   signs.board(kana, en, colour, w, h, [x, y, z], ry);      a board facing +z turned by ry (radians)
//   signs.upright(kana, colour, w, h, [x, y, z], ry);        the kana stacked, read the same from both faces
//   signs.card(kana, en, w, h, [x, y, z], ry);               a small white card, dark kana over small English
//   signs.drawn(draw, w, h, [x, y, z], ry);                  any face: draw(ctx, W, H) paints its cell (a drinks
//                                                            machine's front)
//   const s = signs.build(group); s.evening();
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { JP_FONT } from '../props.js';
import { DECAL } from '../look/decal.js';

const PX = 160, // pixels per unit of sign
  ATLAS_W = 2048,
  PALE = '#eeede8';

function drawBoard(ctx, x, y, W, H, { kana, en, color }) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, W, H);
  ctx.fillStyle = PALE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * 0.46)}px ${JP_FONT}`;
  ctx.fillText(kana, x + W / 2, y + H * 0.38, W - 24);
  ctx.globalAlpha = 0.85;
  ctx.font = `600 ${Math.round(H * 0.19)}px sans-serif`;
  ctx.fillText(en, x + W / 2, y + H * 0.8, W - 24);
  ctx.globalAlpha = 1;
}

// the kana top to bottom in a pale frame; the long-vowel mark (U+30FC) stands upright, as in vertical writing
function drawUpright(ctx, x, y, W, H, { kana, color }) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, W, H);
  ctx.strokeStyle = PALE;
  ctx.lineWidth = Math.max(3, W * 0.05);
  ctx.strokeRect(x + W * 0.1, y + W * 0.1, W * 0.8, H - W * 0.2);
  const chars = [...kana],
    step = Math.min((H - W * 0.4) / chars.length, W * 0.72),
    top = y + (H - step * chars.length) / 2;
  ctx.fillStyle = PALE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(step * 0.82)}px ${JP_FONT}`;
  chars.forEach((c, i) => {
    const cy = top + step * (i + 0.5);
    if (c.charCodeAt(0) === 0x30fc) ctx.fillRect(x + W / 2 - step * 0.05, cy - step * 0.36, step * 0.1, step * 0.72);
    else ctx.fillText(c, x + W / 2, cy);
  });
}

function drawCard(ctx, x, y, W, H, { kana, en }) {
  ctx.fillStyle = '#f2f0ea';
  ctx.fillRect(x, y, W, H);
  ctx.strokeStyle = '#8a3b3b';
  ctx.lineWidth = Math.max(2, H * 0.06);
  ctx.strokeRect(x + H * 0.08, y + H * 0.08, W - H * 0.16, H - H * 0.16);
  ctx.fillStyle = '#2f3540';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(H * 0.4)}px ${JP_FONT}`;
  ctx.fillText(kana, x + W / 2, y + H * 0.42, W - H * 0.4);
  ctx.font = `600 ${Math.round(H * 0.17)}px sans-serif`;
  ctx.fillText(en, x + W / 2, y + H * 0.74, W - H * 0.4);
}
function drawDrawn(ctx, x, y, W, H, { draw }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  draw(ctx, W, H);
  ctx.restore();
}
const DRAW = { board: drawBoard, upright: drawUpright, card: drawCard, drawn: drawDrawn };

export function signSet() {
  const items = [];
  const add = (kind, data, w, h, at, faces) => items.push({ kind, data, w, h, at, faces });
  return {
    board(kana, en, color, w, h, at, ry = 0) {
      add('board', { kana, en, color }, w, h, at, [ry]);
    },
    // both faces show the kana the right way round (two planes back to back, either side of a board 0.08 thick)
    upright(kana, color, w, h, at, ry = 0) {
      add('upright', { kana, color }, w, h, at, [ry, ry + Math.PI]);
    },
    card(kana, en, w, h, at, ry = 0) {
      add('card', { kana, en }, w, h, at, [ry]);
    },
    drawn(draw, w, h, at, ry = 0) {
      add('drawn', { draw }, w, h, at, [ry]);
    },
    build(root) {
      if (!items.length) return { mesh: null, evening() {} };
      // shelf-pack the cells: each sign w x h units at PX pixels a unit
      let x = 0,
        y = 0,
        rowH = 0;
      for (const it of items) {
        const px = it.kind === 'card' ? PX * 3 : it.kind === 'drawn' ? PX * 2 : PX; // the small cards at a finer grain, so they read up close
        it.W = Math.min(ATLAS_W, Math.round(it.w * px));
        it.H = Math.round(it.h * px);
        if (x + it.W > ATLAS_W) [x, y, rowH] = [0, y + rowH + 2, 0];
        [it.x, it.y] = [x, y];
        x += it.W + 2;
        rowH = Math.max(rowH, it.H);
      }
      const canvas = document.createElement('canvas');
      canvas.width = ATLAS_W;
      canvas.height = THREE.MathUtils.ceilPowerOfTwo(y + rowH);
      const ctx = canvas.getContext('2d');
      for (const it of items) DRAW[it.kind](ctx, it.x, it.y, it.W, it.H, it.data);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const geos = [];
      for (const it of items) {
        const u0 = it.x / canvas.width,
          u1 = (it.x + it.W) / canvas.width,
          v1 = 1 - it.y / canvas.height,
          v0 = 1 - (it.y + it.H) / canvas.height;
        for (const ry of it.faces) {
          const g = new THREE.PlaneGeometry(it.w, it.h);
          const uv = g.attributes.uv;
          for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
          // back to back: each face a hair out from the middle along its own normal
          g.translate(0, 0, it.faces.length > 1 ? 0.045 : 0).rotateY(ry);
          geos.push(g.translate(...it.at));
        }
      }
      const material = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.75,
        ...DECAL,
        emissive: new THREE.Color('#ffffff'),
        emissiveMap: tex,
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(mergeGeometries(geos), material);
      geos.forEach((g) => g.dispose());
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.name = 'shop-signs';
      root.add(mesh);
      return {
        mesh,
        evening() {
          material.emissiveIntensity = 0.6;
        },
      };
    },
  };
}
