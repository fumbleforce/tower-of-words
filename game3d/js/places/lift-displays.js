// The lift car's displays (places/lift.js): the floor indicator over the mirror and over the lobby's landing doors,
// and the button panel with its floor readout; drawn on canvases, redrawn when the floor or the lit buttons change.
import * as THREE from 'three';

function drawIndicator(g, W2, H2, floor, dir, moving) {
  g.fillStyle = '#16181d';
  g.fillRect(0, 0, W2, H2);
  g.fillStyle = '#ffb45e';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.font = `700 ${Math.round(H2 * 0.62)}px sans-serif`;
  g.fillText(floor, W2 * 0.62, H2 / 2 + 2);
  g.globalAlpha = moving ? 1 : 0.28;
  g.font = `700 ${Math.round(H2 * 0.42)}px sans-serif`;
  g.fillText(dir === 'down' ? '▼' : '▲', W2 * 0.24, H2 / 2 + 2);
  g.globalAlpha = 1;
}
export function indicatorMat() {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 80;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  m.userData.draw = (floor, dir, moving) => {
    drawIndicator(c.getContext('2d'), c.width, c.height, floor, dir, moving);
    tex.needsUpdate = true;
  };
  m.userData.draw('1', 'up', false);
  return m;
}
// the button panel: a floor readout at the top, then the floor buttons and open/close; pressed ones lit
const COP_BTNS = [
  ['5', '4'],
  ['3', '2'],
  ['1', 'B1'],
  ['B2', ''],
];
export function copMat() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 384;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.4,
    metalness: 0.3,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: tex,
    emissiveIntensity: 0.35,
  });
  m.userData.draw = (floor, dir, moving, lit) => {
    const g = c.getContext('2d');
    g.fillStyle = '#9aa0a8';
    g.fillRect(0, 0, 128, 384);
    g.fillStyle = '#8a9098';
    g.fillRect(6, 6, 116, 372);
    // readout
    g.save();
    g.translate(14, 16);
    drawIndicator(g, 100, 46, floor, dir, moving);
    g.restore();
    COP_BTNS.forEach((row, i) =>
      row.forEach((lab, j) => {
        if (!lab) return;
        const x = 38 + j * 52,
          y = 104 + i * 58,
          on = lit.has(lab);
        g.beginPath();
        g.arc(x, y, 19, 0, Math.PI * 2);
        g.fillStyle = on ? '#3a2a18' : '#5d636c';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = on ? '#ffb45e' : '#c3c8cf';
        g.stroke();
        g.fillStyle = on ? '#ffcf8f' : '#eef0f3';
        g.font = '700 17px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(lab, x, y + 1);
      }),
    );
    // open and close
    for (const [x, s] of [
      [38, '◀|▶'],
      [90, '▶|◀'],
    ]) {
      g.beginPath();
      g.arc(x, 342, 19, 0, Math.PI * 2);
      g.fillStyle = '#5d636c';
      g.fill();
      g.fillStyle = '#eef0f3';
      g.font = '700 11px sans-serif';
      g.fillText(s, x, 343);
    }
    tex.needsUpdate = true;
  };
  m.userData.draw('1', 'up', false, new Set());
  return m;
}
