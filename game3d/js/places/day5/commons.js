import { textTexture } from '../../props.js';
import { anchor, board, prop, moveProp, frame } from './props.js';

export function mondayCommons(game, P) {
  const table = anchor(P, 'art_table'),
    rack = anchor(P, 'drying_rack');
  const paper = prop(P, [0.3, 0.025, 0.22], '#edf0eb', [table.x - 0.7, 0.42, table.z]);
  const bag = prop(P, [0.2, 0.24, 0.13], '#546b94', [0.5, 0.34, -1.75]);
  const pencils = board(P, ['Pencils are in the tin.', 'Leave the sharpener here.'], { w: 0.38, h: 0.15 });
  pencils.position.set(table.x + 0.4, 0.43, table.z);
  pencils.rotation.x = -Math.PI / 2;
  const notice = board(P, ['Art club tomorrow evening', 'The table by the window'], { w: 0.5, h: 0.25 });
  notice.position.copy(anchor(P, 'commons_board'));
  notice.rotation.y = -Math.PI / 2;
  const sketch = board(P, [], { w: 0.3, h: 0.22 });
  sketch.material.map.dispose();
  sketch.material.map = textTexture(
    (g, W, H) => {
      g.fillStyle = '#eff0e9';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#6b7070';
      g.lineWidth = 2;
      // A neighbouring window's angle onto the same unadorned concrete dorm wall.
      g.beginPath();
      g.moveTo(0, H * 0.2);
      g.lineTo(W, H * 0.1);
      g.lineTo(W, H);
      g.lineTo(0, H);
      g.stroke();
      for (let i = 1; i < 5; i++) {
        g.beginPath();
        g.moveTo((W * i) / 5, H * 0.2);
        g.lineTo((W * i) / 5, H);
        g.stroke();
      }
      for (let i = 1; i < 4; i++) {
        g.beginPath();
        g.moveTo(0, (H * i) / 4);
        g.lineTo(W, (H * i) / 4 - H * 0.08);
        g.stroke();
      }
    },
    512,
    384,
  );
  sketch.position.set(rack.x, rack.y - 0.1, rack.z + 0.05);
  sketch.rotation.x = -Math.PI / 2;
  const note = board(P, ['From room 204, next block.', 'Please leave this on the shelf.'], { w: 0.3, h: 0.22 });
  note.visible = false;
  P.seats.d5_aoi_beside = {
    x: 0.5,
    z: -1.75,
    top: 0.25,
    ry: Math.PI,
    out: [0.5, -1.1],
  };
  async function hook({ state }) {
    if (state === 'paper') {
      frame(game, 'art_table', 2.8);
      paper.position.y = 0.6;
      await moveProp(game, paper, [table.x - 0.7, 0.42, table.z]);
    } else if (state === 'seat') {
      frame(game, 'aoi', 2.4);
      await moveProp(game, bag, [-0.7, 0.14, -1.55]);
    } else if (state === 'sit') {
      await game.hooks.sit({ who: 'eric', at: 'd5_aoi_beside' });
      game.place.cam.release?.();
    } else if (state === 'sketch') {
      frame(game, 'drying_rack', 3.2);
      const home = sketch.position.clone();
      await moveProp(game, sketch, [rack.x, rack.y + 0.1, rack.z + 0.2]);
      sketch.rotation.x = -0.5;
      await game.wait(900);
      note.position.copy(sketch.position);
      note.rotation.copy(sketch.rotation);
      sketch.visible = false;
      note.visible = true;
      await game.wait(1100);
      note.visible = false;
      sketch.visible = true;
      sketch.rotation.x = -Math.PI / 2;
      sketch.position.copy(home);
    } else throw new Error(`Unknown commons state: ${state}`);
  }
  return {
    hook,
    restore() {
      bag.position.set(0.5, 0.34, -1.75);
    },
  };
}
