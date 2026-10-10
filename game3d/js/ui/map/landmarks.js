// Map geometry comes from the same roof groups and bay grid as the built street.
// In particular, the south row's three alleys must never read as solid buildings.
import { BLOCKS } from '../../scenes/shop-roof-plan.js';
import { BAYS, ROWS_Z } from '../../scenes/island-south.js';
import { rectPts } from './shapes.js';
import { POOL } from '../../scenes/sports/deck-plan.js';
import { CXS, CZ, L, W } from '../../scenes/sports/court-plan.js';

export function mapFootprints(buildings, footprint) {
  return buildings.flatMap((b) => {
    const row = b.id === 'shops_north' ? 'north' : b.id === 'shops_south' ? 'south' : null;
    if (!row) return [{ ...b, points: footprint(b) }];
    const z = row === 'north' ? ROWS_Z.north : ROWS_Z.south;
    return BLOCKS[row].map(([a, last, roof], i) => {
      const rect = [BAYS.x0 + a * BAYS.w, z, BAYS.x0 + (last + 1) * BAYS.w, z + BAYS.w];
      return {
        ...b,
        id: `${b.id}_${i}`,
        roofType: roof,
        rect,
        points: rectPts(rect),
      };
    });
  });
}

const COLORS = {
  arcade: '#91b9b8',
  pitch: '#9b7967',
  flat: '#9ba49e',
  garden: '#83a48f',
  solar: '#4e7787',
};
export function drawRoof(ctx, roof, detail) {
  const [x0, z0, x1, z1] = roof.box,
    w = x1 - x0,
    d = z1 - z0;
  const type = roof.roofType;
  const palette = {
    tower: '#637f8a',
    dorm: '#aa8975',
    shop: '#b39677',
    shed: '#929b9b',
    gym: '#7e9f91',
    office: '#9ba9a4',
  };
  ctx.save();
  ctx.clip(roof.path);
  if (roof.kind === 'arcade') {
    ctx.fillStyle = COLORS.arcade;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x0, z0, w, d);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#deebe5';
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    for (let x = BAYS.x0 + 0.75; x < x1; x += BAYS.w) {
      ctx.moveTo(x, z0);
      ctx.lineTo(x, z1);
    }
    ctx.moveTo(x0, (z0 + z1) / 2);
    ctx.lineTo(x1, (z0 + z1) / 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillStyle = palette[roof.kind] || '#a2a69a';
  ctx.fill(roof.path);
  if (type) {
    ctx.fillStyle = COLORS[type === 'pitch' ? 'pitch' : ['garden', 'beds'].includes(type) ? 'garden' : 'flat'];
    ctx.fill(roof.path);
  }
  if (!detail || Math.min(w, d) < 1.8) {
    ctx.restore();
    return;
  }
  ctx.strokeStyle = '#e6e4ce';
  ctx.lineWidth = 0.3;
  ctx.strokeRect(x0 + 0.55, z0 + 0.55, w - 1.1, d - 1.1);
  ctx.beginPath();
  if (type === 'pitch' || roof.kind === 'shed') {
    ctx.moveTo(x0 + 0.1, (z0 + z1) / 2);
    ctx.lineTo(x1 - 0.1, (z0 + z1) / 2);
    for (const x of [x0, x1]) {
      ctx.moveTo(x, z0);
      ctx.lineTo(x, z1);
    }
  } else if (type === 'solar') {
    ctx.fillStyle = COLORS.solar;
    for (let x = x0 + 0.8; x < x1 - 1.5; x += 1.7) for (const z of [z0 + 0.8, z1 - 1.9]) ctx.fillRect(x, z, 1.2, 1.1);
  } else if (type === 'beds' || type === 'garden') {
    ctx.fillStyle = '#567e69';
    for (let x = x0 + 0.8; x < x1 - 1; x += 2.2) {
      ctx.fillRect(x, z0 + 0.7, 1.3, 0.8);
      ctx.fillRect(x, z1 - 1.5, 1.3, 0.8);
    }
  } else if (roof.kind === 'tower') {
    // Curtain-wall perimeter and the roof's plant zone distinguish head office.
    ctx.strokeRect(x0 + 1.2, z0 + 1.2, w - 2.4, d - 2.4);
    ctx.fillStyle = '#647f8b';
    ctx.fillRect(x0 + w * 0.28, z0 + d * 0.28, w * 0.44, d * 0.44);
  } else if (roof.kind === 'dorm') {
    ctx.fillStyle = '#d5c6ac';
    for (let x = x0 + 1; x < x1 - 1; x += 2.4) ctx.fillRect(x, z1 - 1.2, 1.3, 0.7);
    ctx.moveTo(x0 + w * 0.5, z0 + 0.6);
    ctx.lineTo(x0 + w * 0.5, z1 - 0.6);
  } else if (roof.id === 'gym' || roof.id === 'platform_shed') {
    ctx.fillStyle = '#638785';
    ctx.fillRect(x0 + w * 0.35, z0 + 0.6, w * 0.3, d - 1.2);
    for (let z = z0 + 2; z < z1 - 1; z += 3) {
      ctx.moveTo(x0 + 0.4, z);
      ctx.lineTo(x1 - 0.4, z);
    }
  } else {
    // A plant block and broad seams identify flat roofs without uniform barcode stripes.
    if (w > 5 && d > 4) {
      ctx.fillStyle = '#778e8b';
      ctx.fillRect(x0 + 1, z0 + 1, Math.min(3, w * 0.25), Math.min(2, d * 0.25));
    }
    for (let x = x0 + 4; x < x1 - 0.8; x += 5) {
      ctx.moveTo(x, z0 + 0.6);
      ctx.lineTo(x, z1 - 0.6);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Sporting landmarks use the playable builders' dimensions and island positions.
export function drawGroundLandmarks(ctx, detail) {
  ctx.fillStyle = '#6c9c91';
  ctx.strokeStyle = '#e3eeea';
  ctx.lineWidth = 0.25;
  for (const x of CXS) {
    ctx.fillRect(x - W / 2, CZ - L / 2, W, L);
    ctx.strokeRect(x - W / 2, CZ - L / 2, W, L);
    if (!detail) continue;
    ctx.strokeRect(x - W * 0.37, CZ - L / 2, W * 0.74, L);
    ctx.strokeRect(x - W * 0.37, CZ - L * 0.27, W * 0.74, L * 0.54);
    ctx.beginPath();
    ctx.moveTo(x - W / 2, CZ);
    ctx.lineTo(x + W / 2, CZ);
    ctx.moveTo(x, CZ - L * 0.27);
    ctx.lineTo(x, CZ + L * 0.27);
    ctx.stroke();
  }
  const { x, z, w, l } = POOL;
  ctx.fillStyle = '#6daab7';
  ctx.fillRect(x - w / 2, z - l / 2, w, l);
  ctx.strokeRect(x - w / 2, z - l / 2, w, l);
  if (detail) {
    ctx.strokeStyle = '#b8d8dc';
    ctx.lineWidth = 0.15;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const laneX = x - w / 2 + (i * w) / 6;
      ctx.moveTo(laneX, z - l / 2);
      ctx.lineTo(laneX, z + l / 2);
    }
    ctx.stroke();
  }
}
