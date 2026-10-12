// The clinic's signs, posters and ceiling lights (clinic/room.js builds the rest): 受付 over the counter with the
// departments and the hours (clinic/signs.js, as on its front), 薬 over the pharmacy's window, a sight chart in the
// examination bay, a hand-washing poster over the children's corner, a flu-jab poster and a mask notice over the
// waiting bench, a clock, skirting, and the ceiling's light panels for the close follow view.
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { signBoard } from '../plaza-buildings.js';
import { textTexture, plane, clock, JP_FONT } from '../../props.js';
import { hoursPlate, departmentsStrip, GREEN } from './signs.js';
import { PHARMACY } from './plan.js';

const INK = '#3f4650';

// a line of Japanese with its English after it
const both = (ctx, ja, en, x, y, w) => ctx.fillText(`${ja} · ${en}`, x, y, w);

// a poster on a wall: paper with a coloured head, its title and the English under it; draw(ctx, w, h) paints the rest
function poster(w, h, head, title, en, draw) {
  const tex = textTexture(
    (ctx, cw, ch) => {
      ctx.fillStyle = '#f5f4ee';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = head;
      ctx.fillRect(0, 0, cw, ch * 0.24);
      ctx.fillStyle = '#f5f4ee';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(ch * 0.12) + 'px ' + JP_FONT;
      ctx.fillText(title, cw / 2, ch * 0.1, cw - 24);
      ctx.font = '600 ' + Math.round(ch * 0.045) + 'px sans-serif';
      ctx.fillText(en, cw / 2, ch * 0.2, cw - 24);
      draw(ctx, cw, ch);
    },
    Math.round(400 * (w / h)),
    400,
  );
  return plane(w, h, tex);
}

// the sight chart: rows of rings with a gap, getting smaller, in hiragana's place the usual Landolt rings
function sightChart() {
  return poster(0.42, 0.72, '#5c7f8f', '視力検査', 'EYE TEST', (ctx, cw, ch) => {
    ctx.strokeStyle = INK;
    const dirs = [0, 1.5, 3, 4.7, 0.8, 2.3, 3.9, 5.5];
    let y = ch * 0.34;
    for (let row = 0, size = 34; row < 6; row++, size *= 0.72) {
      const n = row < 2 ? 2 + row : 4;
      ctx.lineWidth = Math.max(2, size * 0.2);
      for (let i = 0; i < n; i++) {
        const x = (cw * (i + 1)) / (n + 1),
          a = dirs[(row * 3 + i) % dirs.length];
        ctx.beginPath();
        ctx.arc(x, y, size / 2, a + 0.35, a + Math.PI * 2 - 0.35);
        ctx.stroke();
      }
      y += size * 1.5 + 8;
    }
  });
}

// hand washing, drawn for children: two hands under a tap and a bubble or two
function handsPoster() {
  return poster(0.5, 0.62, '#6f9fcf', 'てあらい', 'WASH YOUR HANDS', (ctx, cw, ch) => {
    ctx.fillStyle = '#b9c2c4';
    ctx.fillRect(cw * 0.42, ch * 0.3, cw * 0.16, ch * 0.08);
    ctx.fillStyle = '#a9cde0';
    ctx.fillRect(cw * 0.47, ch * 0.38, cw * 0.06, ch * 0.16);
    ctx.fillStyle = '#e8c4a8';
    for (const [x, r] of [
      [0.38, -0.5],
      [0.62, 0.5],
    ]) {
      ctx.save();
      ctx.translate(cw * x, ch * 0.66);
      ctx.rotate(r);
      ctx.beginPath();
      ctx.ellipse(0, 0, cw * 0.09, ch * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#8fc2dd';
    ctx.lineWidth = 4;
    for (const [x, y, r] of [
      [0.22, 0.48, 18],
      [0.78, 0.5, 14],
      [0.7, 0.4, 9],
    ]) {
      ctx.beginPath();
      ctx.arc(cw * x, ch * y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = '700 ' + Math.round(ch * 0.075) + 'px ' + JP_FONT;
    both(ctx, '30びょう', 'SCRUB 30 SECONDS', cw / 2, ch * 0.9, cw - 20);
  });
}

// the flu jab: a syringe and the season's dates
function fluPoster() {
  return poster(0.5, 0.66, '#c96a5a', 'インフルエンザ', 'FLU', (ctx, cw, ch) => {
    ctx.fillStyle = INK;
    ctx.font = '700 ' + Math.round(ch * 0.075) + 'px ' + JP_FONT;
    both(ctx, '予防接種', 'JABS', cw / 2, ch * 0.33, cw - 20);
    ctx.save();
    ctx.translate(cw / 2, ch * 0.56);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#d6e6ee';
    ctx.fillRect(-cw * 0.22, -ch * 0.045, cw * 0.36, ch * 0.09);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(-cw * 0.22, -ch * 0.045, cw * 0.36, ch * 0.09);
    ctx.fillStyle = INK;
    ctx.fillRect(cw * 0.14, -2, cw * 0.14, 4);
    ctx.fillRect(-cw * 0.3, -ch * 0.03, cw * 0.08, ch * 0.06);
    ctx.restore();
    ctx.font = '600 ' + Math.round(ch * 0.058) + 'px ' + JP_FONT;
    both(ctx, '10月〜12月', 'OCT–DEC', cw / 2, ch * 0.84, cw - 20);
  });
}

// a small notice: a face with a mask
function maskNotice() {
  return poster(0.36, 0.44, GREEN, 'マスク', 'MASKS, PLEASE', (ctx, cw, ch) => {
    ctx.fillStyle = '#e8c4a8';
    ctx.beginPath();
    ctx.arc(cw / 2, ch * 0.58, cw * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cw * 0.3, ch * 0.6, cw * 0.4, ch * 0.14);
    ctx.strokeStyle = '#c3c8cc';
    ctx.lineWidth = 3;
    ctx.strokeRect(cw * 0.3, ch * 0.6, cw * 0.4, ch * 0.14);
    ctx.fillStyle = INK;
    for (const x of [0.42, 0.58]) {
      ctx.beginPath();
      ctx.arc(cw * x, ch * 0.52, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// put a flat thing on a wall: 'n' the back wall (facing +z), 'w' the west wall (facing +x), 'e' the east (facing -x)
function onWall(root, obj, wallSide, R, u, y) {
  if (wallSide === 'n') obj.position.set(u, y, R.z0 + 0.012);
  else if (wallSide === 'w') {
    obj.position.set(R.x0 + 0.012, y, u);
    obj.rotation.y = Math.PI / 2;
  } else {
    obj.position.set(R.x1 - 0.012, y, u);
    obj.rotation.y = -Math.PI / 2;
  }
  root.add(obj);
  return obj;
}

export function clinicDetails(root, k, R) {
  onWall(root, signBoard('受付', 'RECEPTION', 0.92, 0.3, '#4c6a64'), 'n', R, 2.55, 1.62);
  onWall(root, departmentsStrip(1.1, 0.2), 'n', R, 2.55, 2.0);
  onWall(root, hoursPlate(0.5, 0.62), 'n', R, 1.55, 1.48);
  const c = clock();
  onWall(root, c, 'n', R, 3.55, 1.6);
  // 薬 over the pharmacy's window, on its partition's front
  const med = signBoard('薬', 'PHARMACY', 0.6, 0.3, '#4f7a66');
  med.position.set((PHARMACY.hatch[0] + PHARMACY.hatch[1]) / 2, 1.72, PHARMACY.z + 0.056);
  root.add(med);
  onWall(root, sightChart(), 'w', R, -5.05, 1.25);
  onWall(root, handsPoster(), 'w', R, -2.8, 1.05);
  onWall(root, fluPoster(), 'e', R, -2.8, 1.25);
  onWall(root, maskNotice(), 'e', R, -1.75, 1.25);
  // skirting round the room's three standing walls
  const sk = '#9fb0ab';
  k.box(sk, R.x1 - R.x0, 0.07, 0.015, (R.x0 + R.x1) / 2, 0, R.z0 + 0.008, { surf: 'plastic', cast: false });
  for (const x of [R.x0 + 0.008, R.x1 - 0.008])
    k.box(sk, 0.015, 0.07, -R.z0, x, 0, R.z0 / 2, { surf: 'plastic', cast: false });
  // the ceiling's light panels, seen only with the ceiling (rooms/enclosure.js)
  const lamps = new Kit();
  for (const [x, z] of [
    [-3.2, -5.3],
    [-3.2, -2.2],
    [0, -3.4],
    [2.6, -4.7],
    [2.6, -1.9],
  ]) {
    lamps.box('#8fa0a3', 1.0, 0.04, 0.42, x, R.h - 0.05, z, { surf: 'metal' });
    lamps.box('#f2f5ee', 0.92, 0.012, 0.34, x, R.h - 0.062, z, { surf: 'glass', cast: false });
  }
  const g = new THREE.Group();
  lamps.flush(g);
  g.traverse((o) => {
    if (o.isMesh) o.userData.noBatch = true;
  });
  root.getObjectByName('follow-interior').add(g);
}
