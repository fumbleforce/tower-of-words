import * as THREE from 'three';

// A small continuous sky environment gives glass and metal view-dependent reflections.
// It is local to these materials, so indoor light and the other places keep their own setup.
export function streetReflections() {
  const size = 128;
  const faces = [
    (u, v) => [1, -v, -u],
    (u, v) => [-1, -v, u],
    (u, v) => [u, 1, v],
    (u, v) => [u, -1, -v],
    (u, v) => [u, -v, 1],
    (u, v) => [-u, -v, -1],
  ];
  const images = faces.map((direction) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'),
      pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const d = new THREE.Vector3(...direction((2 * (x + 0.5)) / size - 1, (2 * (y + 0.5)) / size - 1)).normalize();
        const t = Math.sqrt(Math.abs(d.y));
        const horizon = [194, 204, 203],
          sky = [101, 143, 184],
          ground = [80, 91, 66];
        const end = d.y > 0 ? sky : ground;
        const cloud = d.y > 0.05 ? Math.pow(Math.max(0, Math.sin(d.x * 5 + d.z * 3) * Math.cos(d.y * 9)), 6) * 22 : 0;
        const angle = Math.atan2(d.x, d.z),
          block = Math.floor((angle + Math.PI) * 3);
        const roof = 0.58 + 0.22 * Math.sin(block * 4.7);
        const building = d.y > -0.18 && d.y < roof && Math.sin(angle * 2 + 0.8) > -0.2;
        const crown = d.y > -0.2 && d.y < 0.34 + 0.12 * Math.sin(angle * 7) && !building;
        const window = Math.sin(angle * 45) > 0.05 && Math.sin(d.y * 90) > -0.3;
        const reflected = building ? (window ? [58, 79, 92] : [133, 140, 137]) : crown ? [64, 85, 46] : null;
        const i = (y * size + x) * 4;
        for (let k = 0; k < 3; k++)
          pixels.data[i + k] = reflected ? reflected[k] : horizon[k] * (1 - t) + end[k] * t + cloud;
        pixels.data[i + 3] = 255;
      }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  });
  const texture = new THREE.CubeTexture(images);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Eight related interiors share the facade palette, with different blinds, reveals
// and room depths. A separate emission mask keeps dusk from lighting every pane alike.
export function windowPane() {
  const canvas = document.createElement('canvas'),
    emission = document.createElement('canvas');
  canvas.width = emission.width = 512;
  canvas.height = emission.height = 256;
  const ctx = canvas.getContext('2d'),
    lit = emission.getContext('2d');
  const brightness = [0.18, 0.65, 0.38, 0.8, 0.5, 0.24, 0.72, 0.42];
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 128,
      y = Math.floor(i / 4) * 128;
    ctx.save();
    lit.save();
    ctx.translate(x, y);
    lit.translate(x, y);
    ctx.fillStyle = '#263d50';
    ctx.fillRect(0, 0, 128, 128);
    const room = ctx.createLinearGradient(0, 0, 106, 120);
    room.addColorStop(0, i % 2 ? '#6e879e' : '#5c748c');
    room.addColorStop(0.6, '#466079');
    room.addColorStop(1, '#304a60');
    ctx.fillStyle = room;
    ctx.fillRect(6, 7, 116, 114);
    // Recessed ceiling and one side reveal describe depth behind the crisp frame.
    ctx.fillStyle = '#33475d';
    ctx.beginPath();
    ctx.moveTo(6, 7);
    ctx.lineTo(122, 7);
    ctx.lineTo(108, 20);
    ctx.lineTo(18, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a90a2';
    ctx.beginPath();
    ctx.moveTo(6, 7);
    ctx.lineTo(18, 20);
    ctx.lineTo(18, 113);
    ctx.lineTo(6, 121);
    ctx.closePath();
    ctx.fill();
    const blind = [24, 58, 0, 38, 72, 0, 18, 46][i];
    if (blind) {
      ctx.fillStyle = i % 2 ? '#8897a1' : '#738a9d';
      ctx.fillRect(18, 20, 90, blind);
      ctx.strokeStyle = 'rgba(20,32,43,.35)';
      ctx.lineWidth = 1;
      for (let by = 24; by < 20 + blind; by += 5) {
        ctx.beginPath();
        ctx.moveTo(18, by);
        ctx.lineTo(108, by);
        ctx.stroke();
      }
    }
    if (i === 2 || i === 5) {
      ctx.fillStyle = '#7e8d9f';
      ctx.fillRect(i === 2 ? 83 : 22, 20, 18, 93);
      ctx.fillStyle = '#4d647a';
      ctx.fillRect(i === 2 ? 89 : 28, 20, 3, 93);
    }
    // Quiet room silhouettes differ in placement and height, rather than a universal bottom stripe.
    ctx.fillStyle = '#21364a';
    ctx.fillRect(27 + (i % 3) * 14, 89 - (i % 2) * 9, 39, 25 + (i % 2) * 9);
    ctx.fillStyle = 'rgba(145,175,197,.18)';
    ctx.fillRect(7, 7, 1, 114);
    ctx.fillRect(7, 120, 115, 1);
    ctx.fillStyle = '#162631';
    ctx.fillRect(61, 6, 2, 116);
    lit.fillStyle = '#000000';
    lit.fillRect(0, 0, 128, 128);
    const value = Math.round(brightness[i] * 255);
    lit.fillStyle = `rgb(${value},${value},${value})`;
    lit.fillRect(18, 20, 90, 93);
    lit.fillStyle = 'rgba(0,0,0,.65)';
    lit.fillRect(27 + (i % 3) * 14, 89 - (i % 2) * 9, 39, 25 + (i % 2) * 9);
    lit.fillRect(61, 6, 2, 116);
    if (blind) {
      lit.fillStyle = 'rgba(0,0,0,.5)';
      lit.fillRect(18, 20, 90, blind);
    }
    ctx.restore();
    lit.restore();
  }
  const color = new THREE.CanvasTexture(canvas),
    glow = new THREE.CanvasTexture(emission);
  color.colorSpace = glow.colorSpace = THREE.SRGBColorSpace;
  return { color, glow };
}
