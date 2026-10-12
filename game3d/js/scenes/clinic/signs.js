// The clinic's painted signs, shared by its front on the east lane (block_e1, plaza/east-lane.js) and its waiting
// room (clinic/room.js): the green cross on a white square, the name board (クリニック CLINIC), the opening hours
// (診療時間) and the departments (内科・小児科). The look is the one the island's clinic had on the back lane
// before it moved here (2026-10-12): slate boards, pale lettering, the cross in a muted green.
//   clinicBoard(w, h)        the name board with the cross at its left, lit after dark (its material: glows)
//   hoursPlate(w, h)         the hours on a white plate under a green head
//   departmentsStrip(w, h)   内科・小児科 on a slate strip
//   crossBox(k, x, y, z, s, ry)   a cross in a white box, built into a Kit (dorms/kit.js), s across
import * as THREE from 'three';
import { textTexture, plane, JP_FONT } from '../../props.js';

export const GREEN = '#4f8a62';
const SLATE = '#3f4650',
  PALE = '#eef0ee';
export const HOURS = [
  ['月〜金', 'Mon–Fri', '9:00–18:00'],
  ['土・日', 'Sat–Sun', '10:00–16:00'],
  ['夜間', 'Nights', 'Nurse on call'],
];

export function drawCross(ctx, cx, cy, s) {
  ctx.fillStyle = PALE;
  ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  ctx.fillStyle = GREEN;
  ctx.fillRect(cx - s * 0.36, cy - s * 0.12, s * 0.72, s * 0.24);
  ctx.fillRect(cx - s * 0.12, cy - s * 0.36, s * 0.24, s * 0.72);
}

export function clinicBoard(w, h) {
  const W = Math.round(256 * (w / h));
  const tex = textTexture(
    (ctx, cw, ch) => {
      ctx.fillStyle = SLATE;
      ctx.fillRect(0, 0, cw, ch);
      drawCross(ctx, ch * 0.62, ch / 2, ch * 0.66);
      ctx.fillStyle = PALE;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const mid = (ch * 1.25 + cw) / 2;
      ctx.font = '700 ' + Math.round(ch * 0.44) + 'px ' + JP_FONT;
      ctx.fillText('クリニック', mid, ch * 0.4, cw - ch * 1.4);
      ctx.globalAlpha = 0.85;
      ctx.font = '600 ' + Math.round(ch * 0.18) + 'px sans-serif';
      ctx.fillText('CLINIC', mid, ch * 0.8);
    },
    W,
    256,
  );
  const m = plane(w, h, tex, { emissiveK: 0.08 });
  m.name = 'clinic:board';
  return m;
}

export function hoursPlate(w, h) {
  const tex = textTexture(
    (ctx, cw, ch) => {
      ctx.fillStyle = '#f2f3f1';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = GREEN;
      ctx.fillRect(0, 0, cw, ch * 0.19);
      ctx.fillStyle = '#f2f3f1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(ch * 0.09) + 'px ' + JP_FONT;
      ctx.fillText('診療時間', cw / 2, ch * 0.075);
      ctx.font = '600 ' + Math.round(ch * 0.04) + 'px sans-serif';
      ctx.fillText('CLINIC HOURS', cw / 2, ch * 0.155);
      ctx.fillStyle = SLATE;
      ctx.font = '600 ' + Math.round(ch * 0.064) + 'px ' + JP_FONT;
      HOURS.forEach(([ja, en, t], i) => {
        const y = ch * (0.34 + i * 0.22);
        ctx.textAlign = 'left';
        ctx.fillText(ja, cw * 0.07, y);
        ctx.globalAlpha = 0.7;
        ctx.fillText(en, cw * 0.07, y + ch * 0.075, cw * 0.4);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'right';
        ctx.fillText(t, cw * 0.93, y, cw * 0.5);
        ctx.fillStyle = '#c3c8cc';
        ctx.fillRect(cw * 0.07, y + ch * 0.12, cw * 0.86, 3);
        ctx.fillStyle = SLATE;
      });
    },
    Math.round(512 * (w / h)),
    512,
  );
  return plane(w, h, tex);
}

export function departmentsStrip(w, h) {
  const tex = textTexture(
    (ctx, cw, ch) => {
      ctx.fillStyle = SLATE;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = PALE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(ch * 0.5) + 'px ' + JP_FONT;
      ctx.fillText('内科・小児科', cw / 2, ch * 0.38, cw - 20);
      ctx.font = '600 ' + Math.round(ch * 0.2) + 'px sans-serif';
      ctx.fillText('INTERNAL MEDICINE · CHILDREN', cw / 2, ch * 0.82, cw - 20);
    },
    Math.round(128 * (w / h)),
    128,
  );
  return plane(w, h, tex);
}

// a green cross standing out of a white box: s across, its face toward +z turned by ry; its own lit material
export function crossBox(x, y, z, s, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(s, s, 0.06),
    new THREE.MeshStandardMaterial({ color: '#e3e6e4', roughness: 0.6 }),
  );
  const sign = new THREE.MeshStandardMaterial({
    color: GREEN,
    emissive: new THREE.Color('#3f6b4d'),
    emissiveIntensity: 0.3,
  });
  const bar = (w, h) => new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), sign);
  const a = bar(s * 0.72, s * 0.22),
    b = bar(s * 0.22, s * 0.72);
  a.position.z = b.position.z = 0.05;
  g.add(box, a, b);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  g.name = 'clinic:cross';
  return { group: g, material: sign };
}
