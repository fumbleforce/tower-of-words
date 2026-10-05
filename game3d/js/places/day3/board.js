// The plaza's notice board on day 3 (story/day3/plaza.js): the island map on its own post beside the board, with a
// handwritten ここ sticker by its arrow (board_map, readable with or without Aoi), and Aoi's moment at the board.
// `boardVisit` states: slip (she steps up and takes a tennis slip off its poster; the player's clubs don't change),
// leave (she walks off toward the shop street and is gone). The map stands from day 3 on.
import * as THREE from 'three';
import { sim } from '../../sim.js';
import { sfx } from '../../sfx.js';
import { rbox, textTexture } from '../../props.js';
import { walkRig, faceRig } from '../../move.js';

// the sticker's word, read out (with its reading and English) by the map's look line (story/day3/plaza.js d3_map)
const STICKER = { ja: 'ここ', ro: 'koko', en: 'here' };
const MAP_DX = 1.35; // east of the board's middle, clear of its frame

function mapTexture() {
  return textTexture(
    (g, W, H) => {
      g.fillStyle = '#d9e6ea'; // the sea
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#e9e1c8'; // the island
      g.beginPath();
      g.ellipse(W * 0.5, H * 0.52, W * 0.4, H * 0.36, -0.2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#b9ac8c';
      g.lineWidth = 3;
      g.stroke();
      g.strokeStyle = '#ffffff'; // the streets
      g.lineWidth = 5;
      for (const [a, b, c, d] of [
        [0.18, 0.55, 0.82, 0.48],
        [0.5, 0.22, 0.52, 0.85],
        [0.3, 0.3, 0.7, 0.75],
      ]) {
        g.beginPath();
        g.moveTo(W * a, H * b);
        g.lineTo(W * c, H * d);
        g.stroke();
      }
      g.fillStyle = '#7fb3c9'; // the fountain's circle
      g.beginPath();
      g.arc(W * 0.5, H * 0.52, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#d23b3b'; // the arrow
      g.beginPath();
      g.moveTo(W * 0.5 + 12, H * 0.52 + 4);
      g.lineTo(W * 0.5 + 40, H * 0.52 + 30);
      g.lineTo(W * 0.5 + 30, H * 0.52 + 38);
      g.closePath();
      g.fill();
      g.fillStyle = '#fff6a8'; // the sticker
      g.fillRect(W * 0.5 + 34, H * 0.52 + 30, 54, 30);
      g.fillStyle = '#26303a';
      g.font = 'bold 24px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(STICKER.ja, W * 0.5 + 61, H * 0.52 + 46);
    },
    256,
    192,
  );
}

export function plazaBoard(game, { w, root, nav, cast }) {
  const [bx, bz] = w.board.at;
  const at = [bx + MAP_DX, bz];
  const shown = sim.day >= 3;
  const g = new THREE.Group();
  g.position.set(at[0], 0, at[1]);
  g.add(rbox(0.06, 1.25, 0.06, '#3b4048', { y: 0, r: 0.01 }));
  g.add(rbox(0.62, 0.48, 0.04, '#3b4048', { y: 1.0, r: 0.01 }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.42),
    new THREE.MeshStandardMaterial({ map: mapTexture(), roughness: 0.85 }),
  );
  face.position.set(0, 1.24, -0.025);
  face.rotation.y = Math.PI; // facing the fountain, as the board does
  const back = face.clone(); // and the same map on its other face, as the board has notices on both
  back.position.z = 0.025;
  back.rotation.y = 0;
  g.add(face, back);
  g.visible = shown;
  root.add(g);
  if (shown) nav.block(at[0] - 0.14, at[0] + 0.14, at[1] - 0.12, at[1] + 0.12);
  const target = {
    anchor: (v) => v.set(at[0], 1.75, at[1]),
    spot: () => [at[0], at[1] - 0.8],
    face: () => at,
    enabled: () => shown,
  };
  const aoi = () => cast.people.aoi;
  async function boardVisit({ state } = {}) {
    if (state === 'slip') {
      await walkRig(game, aoi(), [bx - 0.55, bz - 0.7], { speed: 0.9 });
      await faceRig(game, aoi(), [bx - 0.55, bz]);
      await game.wait(500);
      sfx('tap'); // the slip off the tennis poster
      await game.wait(350);
      await faceRig(game, aoi(), [game.player.root.position.x, game.player.root.position.z]);
      return;
    }
    if (state === 'leave') {
      const r = aoi(),
        here = game.place;
      void (async () => {
        await walkRig(game, r, [bx + 6, bz - 3.5], { speed: 1.1 });
        await walkRig(game, r, w.shopWalk, { speed: 1.1 });
        if (game.place === here) cast.hide('aoi');
      })();
    }
  }
  return { thing: () => target, hooks: { boardVisit } };
}
