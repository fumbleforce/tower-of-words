// Leaf shade for the anime trial (#383): a top-down map of where the tree crowns throw their shadow, drawn from the
// crowns' clumps (look/anime/crowns.js) along the sun's direction, so morning and evening shadows fall each their
// own way. The material patch (look/anime/shade.js aShadow) projects each point it lights along the same direction
// onto the map; inside a crown's shadow the sun's shadow becomes leaf shade with scattered light spots and a ragged
// leafy edge, both from noise in the shader. One small canvas texture per place, redrawn when the sun moves.
import * as THREE from 'three';

const MIN_Y = 1.6, // clumps lower than this are shrubs and hedges: their own shadow is enough
  MIN_R = 0.3;

export function canopyMap(clumps, { size = 512 } = {}) {
  const crowns = clumps.filter((c) => c.y > MIN_Y && Math.max(c.rx, c.rz) > MIN_R);
  if (!crowns.length) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false; // the canvas's rows run with world z, as the shader reads them
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const box = new THREE.Vector4();
  // dir: toward the sun (unit). A clump's shadow on the ground is its disc moved away from the sun by its height,
  // stretched along the sun's heading by 1 / sin(elevation)
  function draw(dir) {
    const dy = Math.max(dir.y, 0.15),
      foot = crowns.map((c) => ({ x: c.x - (dir.x * c.y) / dy, z: c.z - (dir.z * c.y) / dy, c }));
    let x0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      z1 = -Infinity;
    const stretch = 1 / Math.max(Math.hypot(dir.x, dir.z) > 1e-3 ? dy : 1, 0.3);
    for (const f of foot) {
      const r = Math.max(f.c.rx, f.c.rz) * stretch + 1;
      x0 = Math.min(x0, f.x - r);
      z0 = Math.min(z0, f.z - r);
      x1 = Math.max(x1, f.x + r);
      z1 = Math.max(z1, f.z + r);
    }
    const S = Math.max(x1 - x0, z1 - z0);
    box.set(x0, z0, S, S);
    const k = size / S,
      ang = Math.atan2(dir.z, dir.x);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.filter = `blur(${Math.max(1, Math.round(size / 160))}px)`;
    for (const f of foot) {
      const rx = Math.max(f.c.rx, MIN_R) * 0.92,
        rz = Math.max(f.c.rz, MIN_R) * 0.92,
        r = (rx + rz) / 2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      // the canvas's x is world x, its y is world z
      ctx.ellipse((f.x - x0) * k, (f.z - z0) * k, r * stretch * k, r * k, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.filter = 'none';
    tex.needsUpdate = true;
  }
  return { texture: tex, box, draw, crowns: crowns.length, top: Math.min(...crowns.map((c) => c.y - c.ry)) };
}
