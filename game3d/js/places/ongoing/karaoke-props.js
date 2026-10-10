import * as THREE from 'three';

export const SONG_NUMBER = '0718';
export const BOOTH_SEATS = {
  kenji: { x: -2.14, z: -1.6, top: 0.2, ry: Math.PI / 2, out: [-1.58, -1.1] },
  kuroda: { x: 2.14, z: -2.6, top: 0.2, ry: -Math.PI / 2, out: [1.52, -2.5] },
  eric: { x: -0.55, z: -0.25, top: 0.2, ry: Math.PI, out: [-0.55, -0.95] },
};
function surface(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const update = (...args) => {
    draw(context, ...args);
    texture.needsUpdate = true;
  };
  return { texture, update };
}
function label(c, ja, en, x, y) {
  c.fillText(`${ja} / ${en}`, x, y);
}
function paper(back) {
  return surface(384, 576, (c) => {
    c.fillStyle = '#fff3d7';
    c.fillRect(0, 0, 384, 576);
    c.fillStyle = '#493d3a';
    c.textAlign = 'center';
    if (back) {
      c.font = '22px sans-serif';
      label(c, '曲番号', 'SONG NO.', 192, 140);
      c.font = 'bold 110px sans-serif';
      c.fillStyle = '#244a79';
      c.fillText(SONG_NUMBER, 192, 295);
      c.strokeStyle = '#244a79';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(54, 330);
      c.lineTo(335, 316);
      c.stroke();
    } else {
      c.font = 'bold 25px sans-serif';
      label(c, 'ベーカリー', 'BAKERY', 192, 80);
      c.font = '27px sans-serif';
      label(c, 'パン  2点', 'BREAD: 2 ITEMS', 192, 190);
      c.fillRect(40, 240, 304, 2);
      c.font = 'bold 60px sans-serif';
      c.fillText('¥380', 192, 325);
      c.font = '16px sans-serif';
      label(c, 'ありがとうございます', 'THANK YOU', 192, 452);
    }
  });
}
export function karaokeProps(space) {
  const root = new THREE.Group();
  root.name = 'karaoke-club-props';
  root.visible = false;
  space.add(root);
  const receipt = new THREE.Group();
  receipt.name = 'bakery-receipt';
  const card = new THREE.Group();
  receipt.add(card);
  for (const back of [false, true]) {
    const page = paper(back);
    page.update();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.36),
      new THREE.MeshBasicMaterial({ map: page.texture }),
    );
    mesh.position.set(-0.07, 0.13, back ? -0.001 : 0.001);
    if (back) mesh.rotation.y = Math.PI;
    card.add(mesh);
  }
  root.add(receipt);
  const microphone = new THREE.Group();
  microphone.name = 'club-microphone';
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.014, 0.19, 10),
    new THREE.MeshStandardMaterial({ color: '#272b36', roughness: 0.6 }),
  );
  body.position.y = 0.045;
  const grille = new THREE.Mesh(
    new THREE.SphereGeometry(0.034, 12, 8),
    new THREE.MeshStandardMaterial({ color: '#cbd0d5', roughness: 0.45, metalness: 0.4 }),
  );
  grille.position.y = 0.16;
  microphone.add(body, grille);
  root.add(microphone);
  const queue = surface(1024, 576, (c, entries = [], selected = false) => {
    c.fillStyle = '#17182e';
    c.fillRect(0, 0, 1024, 576);
    c.fillStyle = '#efcc7e';
    c.font = 'bold 55px sans-serif';
    label(c, '予約リスト', 'QUEUE', 62, 85);
    c.fillStyle = '#cbd1ea';
    c.font = '29px sans-serif';
    label(c, '曲番号', 'SONG NO.', 120, 145);
    label(c, '名前', 'NAME', 425, 145);
    entries.forEach((entry, i) => {
      const y = 225 + i * 94;
      if (selected && entry.number === SONG_NUMBER) {
        c.fillStyle = '#355465';
        c.fillRect(40, y - 55, 944, 81);
      }
      c.fillStyle = '#fff4df';
      c.font = 'bold 50px sans-serif';
      c.fillText(entry.number, 120, y);
      c.font = '42px sans-serif';
      label(c, entry.who === 'kuroda' ? '浜田' : 'ケンジ', entry.who === 'kuroda' ? 'Hamada' : 'Kenji', 425, y);
    });
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.58, 0.89),
    new THREE.MeshBasicMaterial({ map: queue.texture }),
  );
  screen.position.set(0, 0.91, -3.526);
  root.add(screen);
  const selector = new THREE.Mesh(
    new THREE.PlaneGeometry(0.255, 0.157),
    new THREE.MeshBasicMaterial({ map: queue.texture }),
  );
  selector.position.set(-0.2, 0.675, -1.738);
  selector.rotation.x = -0.45;
  root.add(selector);
  function reset() {
    root.add(receipt, microphone);
    receipt.position.set(0.24, 0.56, -2.0);
    receipt.rotation.set(-Math.PI / 2, 0, 0);
    card.rotation.set(0, 0, 0);
    microphone.position.set(-1.17, 0.63, -2.0);
    microphone.rotation.set(0, 0, -Math.PI / 2);
  }
  reset();
  queue.update([]);
  return { root, receipt, card, microphone, screen, selector, reset, queue: queue.update };
}
