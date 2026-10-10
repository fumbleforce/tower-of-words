import * as THREE from 'three';
import { rbox } from '../../props.js';

export const ART_SEATS = {
  mori: { x: -0.4, z: -3.25, top: 0.25, ry: 0, out: [-0.4, -3.75] },
  eric: { x: 0.5, z: -3.25, top: 0.25, ry: 0, out: [0.5, -3.75] },
};
export function artProps(space) {
  const root = new THREE.Group();
  root.name = 'art-club-props';
  root.visible = false;
  space.add(root);
  const add = (mesh, name, at) => {
    mesh.name = name;
    mesh.userData.noBatch = true;
    mesh.position.set(...at);
    root.add(mesh);
    return mesh;
  };
  function sheet(name, at) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d'),
      texture = new THREE.CanvasTexture(canvas);
    const mesh = add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.2).translate(0.1, -0.1, 0),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      ),
      name,
      at,
    );
    mesh.rotation.x = -Math.PI / 2;
    const paths = {
      oversize: [
        [20, 38],
        [130, 55],
        [225, 140],
        [330, 230],
        [490, 300],
        [512, 310],
      ],
      slope: [
        [45, 56],
        [145, 70],
        [218, 147],
        [300, 208],
        [430, 235],
      ],
    };
    let drawn = { kind: 'blank', progress: 1 };
    const draw = (kind = 'blank', progress = 1) => {
      drawn = { kind, progress };
      ctx.fillStyle = '#f5f2e6';
      ctx.fillRect(0, 0, 512, 320);
      if (kind !== 'blank') {
        const points = paths[kind];
        ctx.strokeStyle = '#555751';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(...points[0]);
        const n = progress * (points.length - 1);
        for (let i = 1; i < points.length; i++) {
          if (i <= n) ctx.lineTo(...points[i]);
          else {
            const k = Math.max(0, n - i + 1);
            ctx.lineTo(
              points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k,
              points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k,
            );
            break;
          }
        }
        ctx.stroke();
      }
      texture.needsUpdate = true;
    };
    const point = (kind, progress) => {
      const points = paths[kind];
      const n = progress * (points.length - 1),
        i = Math.min(points.length - 2, Math.floor(n)),
        k = n - i;
      const x = points[i][0] + (points[i + 1][0] - points[i][0]) * k;
      const y = points[i][1] + (points[i + 1][1] - points[i][1]) * k;
      return mesh
        .localToWorld(new THREE.Vector3((x / 512 - 0.5) * 0.3 + 0.1, (0.5 - y / 320) * 0.2 - 0.1, 0.003))
        .applyMatrix4(space.matrixWorld.clone().invert());
    };
    draw();
    return {
      mesh,
      point,
      draw,
      snapshot: () => ({ ...drawn }),
      restore: (s) => draw(s?.kind || 'blank', s?.progress ?? 1),
    };
  }
  const mori = sheet('art-mori-paper', [-0.6, 0.411, -2.99]),
    player = sheet('art-player-paper', [0.3, 0.414, -2.99]);
  const photo = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.53, 0.355).translate(-0.23, 0.13, 0),
      new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }),
    ),
    'art-photograph',
    [0.38, 0.419, -2.35],
  );
  photo.rotation.x = -Math.PI / 2;
  const pencils = [-0.4, 0.5].map((x, i) => {
    const pencil = new THREE.Group(),
      barrel = rbox(0.014, 0.014, 0.17, '#d8af5d');
    barrel.position.z = -0.015;
    pencil.add(barrel);
    for (const [radius, length, z, color] of [
      [0.009, 0.03, 0.085, '#d1b18c'],
      [0.003, 0.01, 0.095, '#42413d'],
    ]) {
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(radius, length, 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.z = z;
      pencil.add(tip);
    }
    return add(pencil, 'art-pencil-' + i, [x - 0.12, 0.425, -2.94]);
  });
  const cupLevels = [0, 0];
  const cups = [-0.7, 0.35].map((x, i) => {
    const cup = new THREE.Group();
    cup.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.045, 0.09, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: '#e4e5dd', roughness: 0.8, side: THREE.DoubleSide }),
      ),
    );
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.005, 6, 12), cup.children[0].material);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.045;
    cup.add(rim);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), cup.children[0].material);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -0.043;
    cup.add(bottom);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.043, 12), new THREE.MeshBasicMaterial({ color: '#8c7250' }));
    tea.rotation.x = -Math.PI / 2;
    tea.name = 'tea';
    tea.position.y = -0.025;
    tea.visible = false;
    cup.add(tea);
    return add(cup, 'art-teacup-' + i, [x, 0.455, -2.69]);
  });
  const pot = new THREE.Group(),
    ceramic = new THREE.MeshStandardMaterial({ color: '#bcc8c0', roughness: 0.75 });
  pot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 0.15, 12), ceramic));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.076, 0.025, 12), ceramic);
  lid.position.y = 0.083;
  pot.add(lid);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 0.13, 10), ceramic);
  spout.rotation.z = -0.85;
  spout.position.set(0.09, 0.025, 0);
  pot.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.012, 6, 12), ceramic);
  handle.position.x = -0.075;
  pot.add(handle);
  // Object origin is the handle grip; the body and spout extend beyond the hand.
  for (const child of pot.children) child.position.x += 0.14;
  const spoutTip = new THREE.Object3D();
  spoutTip.position.set(0.279, 0.068, 0);
  pot.add(spoutTip);
  add(pot, 'art-teapot', [0.15, 0.49, -2.99]);
  pot.rotation.y = -Math.PI / 2;
  const stream = add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 1, 6),
      new THREE.MeshBasicMaterial({ color: '#b3baa0', transparent: true, opacity: 0.75 }),
    ),
    'art-tea-stream',
    [0, 0, 0],
  );
  stream.visible = false;
  const home = new Map([...root.children].map((o) => [o, { p: o.position.clone(), q: o.quaternion.clone() }]));
  return {
    root,
    items: [...root.children],
    photo,
    mori,
    player,
    pencils,
    cups,
    pot,
    spoutTip,
    stream,
    cupLevels,
    fillCup(index, level) {
      cupLevels[index] = Math.max(0, Math.min(1, level));
      const tea = cups[index].getObjectByName('tea');
      tea.visible = level > 0;
      tea.position.y = -0.025 + 0.06 * cupLevels[index];
    },
    reset() {
      for (const [o, s] of home) {
        if (o.parent !== root) root.attach(o);
        o.position.copy(s.p);
        o.quaternion.copy(s.q);
      }
      stream.visible = false;
      cups.forEach((_, i) => this.fillCup(i, 0));
    },
    photograph(texture) {
      photo.material.map = texture;
      photo.material.needsUpdate = true;
    },
  };
}
