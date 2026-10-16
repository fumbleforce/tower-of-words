import { plane, rbox, textTexture } from '../props.js';
import { OFFICE_DOOR_HEIGHT } from './office-enclosure.js';

export function toiletSign(kind, wide = false) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = kind === 'm' ? '#4f6f9a' : '#9a5a64';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2f2f2';
      const x = wide ? 64 : W / 2;
      g.beginPath();
      g.arc(x, 38, 18, 0, Math.PI * 2);
      g.fill();
      if (kind === 'm') g.fillRect(x - 20, 62, 40, 70);
      else {
        g.beginPath();
        g.moveTo(x, 60);
        g.lineTo(x + 34, 132);
        g.lineTo(x - 34, 132);
        g.fill();
      }
      g.fillRect(x - 16, 130, 12, 44);
      g.fillRect(x + 4, 130, 12, 44);
      if (wide) {
        g.font = '700 43px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(kind === 'm' ? 'MEN' : 'WOMEN', 233, H / 2);
      }
    },
    wide ? 360 : 128,
    190,
  );
  return plane(wide ? 0.64 : 0.26, wide ? 0.34 : 0.38, tex, {
    emissiveK: wide ? 0.16 : 0,
  });
}

export function corridorToiletSigns(root, corridorZ) {
  const enclosure = root.getObjectByName('follow-interior');
  for (const [kind, x] of [
    ['m', 2.6],
    ['f', 5.2],
  ]) {
    // above the doorway's clear height, so the sign never hangs in a walkable opening (movement/clearance.js)
    const plaque = toiletSign(kind, true);
    plaque.rotation.y = Math.PI;
    plaque.position.set(x, OFFICE_DOOR_HEIGHT + 0.2, corridorZ - 0.101);
    enclosure.add(plaque);
    enclosure.add(
      rbox(0.7, 0.4, 0.025, '#c8ced6', {
        x,
        y: OFFICE_DOOR_HEIGHT,
        z: corridorZ - 0.085,
        r: 0.018,
        cast: false,
      }),
    );
  }
}
