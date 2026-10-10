import * as THREE from 'three';

// The rooms behind the street style's windows (what metal and glass reflect is kit/materials/env.js).
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
