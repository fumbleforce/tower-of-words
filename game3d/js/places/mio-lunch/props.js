import * as THREE from 'three';
import { mat, rbox, textTexture } from '../../props.js';
import { LUNCH_PLAN, LUNCH_SEATS, LUNCH_TOP } from './plan.js';
import { snapshotObject, restoreObject } from '../saved-people.js';

// Day 1 and later lunches use the same approved food and crate dimensions.
export function lunchBento(color = '#b8434f') {
  const g = new THREE.Group();
  g.add(rbox(0.19, 0.045, 0.13, color, { r: 0.012 }));
  const rice = rbox(0.1, 0.012, 0.11, '#f3f1ea', {
    x: -0.035,
    y: 0.04,
    r: 0.004,
    cast: false,
  });
  rice.name = 'bento-rice';
  g.add(rice);
  g.add(
    rbox(0.022, 0.014, 0.022, '#c8424f', {
      x: -0.035,
      y: 0.047,
      r: 0.008,
      cast: false,
    }),
  );
  g.add(
    rbox(0.06, 0.02, 0.045, '#e8c34a', {
      x: 0.05,
      y: 0.042,
      z: -0.025,
      r: 0.006,
      cast: false,
    }),
  );
  g.add(
    rbox(0.06, 0.018, 0.045, '#5f9a4f', {
      x: 0.05,
      y: 0.041,
      z: 0.027,
      r: 0.006,
      cast: false,
    }),
  );
  const sticks = rbox(0.012, 0.008, 0.2, '#d9c7a0', {
    x: 0.11,
    y: 0.028,
    r: 0.003,
    cast: false,
  });
  sticks.name = 'packed-chopsticks';
  sticks.rotation.y = 0.2;
  g.add(sticks);
  g.scale.setScalar(1.35);
  return g;
}

function clipboard() {
  const root = new THREE.Group();
  root.add(rbox(0.23, 0.014, 0.3, '#8a6c48', { r: 0.008 }));
  const texture = textTexture(
    (g, w, h) => {
      g.fillStyle = '#f4efe2';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#263642';
      g.textAlign = 'left';
      g.font = 'bold 24px sans-serif';
      g.fillText('RACK 2', 24, 58);
      g.font = '18px sans-serif';
      g.fillText('Lunch check', 24, 96);
      g.strokeStyle = '#8298a2';
      g.lineWidth = 2;
      for (const y of [119, 184, 248, 308]) {
        g.beginPath();
        g.moveTo(20, y);
        g.lineTo(w - 20, y);
        g.stroke();
      }
      g.strokeStyle = '#c77735';
      g.lineWidth = 3;
      g.strokeRect(16, 126, w - 32, 48);
      g.fillStyle = '#263642';
      g.fillText('Front vent', 26, 155);
      g.strokeRect(w - 53, 137, 24, 24);
      g.fillStyle = '#73818b';
      g.fillText('Mio', 26, 345);
    },
    256,
    384,
  );
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.211, 0.277), new THREE.MeshBasicMaterial({ map: texture }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.015;
  root.add(face);
  root.add(rbox(0.08, 0.01, 0.025, '#aeb8ba', { y: 0.019, z: -0.135, r: 0.003 }));
  const mark = new THREE.Group();
  for (const [x, z, width, angle] of [
    [-0.004, 0.003, 0.011, -0.7],
    [0.004, -0.002, 0.023, 0.7],
  ]) {
    const line = rbox(width, 0.001, 0.0028, '#264b63', {
      x,
      z,
      r: 0,
      cast: false,
    });
    line.rotation.y = angle;
    mark.add(line);
  }
  mark.position.set(0.071, 0.016, -0.03);
  root.add(mark);
  return { root, mark };
}

export function mioLunchProps(space) {
  const root = new THREE.Group();
  root.name = 'mio-weekday-lunch';
  root.userData.noBatch = true;
  space.add(root);
  const add = (object, name) => {
    object.name = 'mio-lunch-' + name;
    object.userData.noBatch = true;
    root.add(object);
    return object;
  };
  const food = add(lunchBento(), 'bento');
  food.getObjectByName('packed-chopsticks').visible = false;
  const lid = rbox(0.198, 0.012, 0.138, '#b8434f', { y: 0.049, r: 0.01 });
  food.add(lid);
  const sheet = clipboard();
  add(sheet.root, 'checklist');
  const pencil = add(rbox(0.012, 0.012, 0.16, '#d1ad4a', { r: 0.002 }), 'pencil');
  const point = rbox(0.007, 0.007, 0.02, '#3d454b', { z: -0.09, r: 0.001 });
  pencil.add(point);
  const pencilTip = new THREE.Object3D();
  pencilTip.position.set(0, 0.0035, -0.1);
  pencil.add(pencilTip);
  const cable = add(new THREE.Group(), 'spare-cable');
  for (const y of [0, 0.016, 0.032]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 6, 24), mat('#343e49'));
    loop.rotation.x = Math.PI / 2;
    loop.position.y = y;
    cable.add(loop);
  }
  cable.add(rbox(0.034, 0.02, 0.026, '#a8acb2', { x: 0.085, y: 0.035, r: 0.002 }));
  const hook = add(new THREE.Group(), 'cable-hook');
  hook.add(rbox(0.03, 0.12, 0.05, '#9aabb4', { r: 0.008 }));
  hook.add(rbox(0.055, 0.025, 0.05, '#9aabb4', { x: -0.024, r: 0.008 }));
  hook.position.set(4.34, 0.155, -2.11);
  hook.rotation.y = Math.PI / 2;
  const intake = add(new THREE.Group(), 'rack-intake');
  intake.add(rbox(0.31, 0.14, 0.014, '#19252d', { y: -0.07, r: 0.005, cast: false }));
  for (let i = 0; i < 6; i++)
    intake.add(
      rbox(0.3, 0.008, 0.017, '#74838a', {
        y: -0.06 + i * 0.021,
        r: 0.002,
        cast: false,
      }),
    );
  intake.position.fromArray(LUNCH_PLAN.intake);
  space.attach(intake);
  const sticks = add(new THREE.Group(), 'chopsticks');
  for (const x of [-0.008, 0.008]) sticks.add(rbox(0.006, 0.006, 0.22, '#dfc79d', { x, z: -0.08, r: 0.002 }));
  const bite = rbox(0.035, 0.019, 0.028, '#f3f1ea', {
    y: -0.006,
    z: -0.18,
    r: 0.008,
  });
  sticks.add(bite);
  const restingGrip = () => {
    const local = new THREE.Vector3(0, 0, -0.02)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.2)
      .multiplyScalar(1 / 1.35);
    return space.worldToLocal(food.localToWorld(local.add(new THREE.Vector3(0.11, 0.034, 0))));
  };
  function restChopsticks() {
    food.add(sticks);
    sticks.scale.setScalar(1 / 1.35);
    sticks.position.set(0.11, 0.034, 0);
    sticks.rotation.set(0, 0.2, 0);
    sticks.visible = true;
    bite.visible = false;
  }
  function park() {
    for (const prop of [food, sheet.root, pencil, cable, sticks]) root.attach(prop);
    food.visible = cable.visible = true;
    food.position.set(LUNCH_SEATS.mio.x, LUNCH_TOP + 0.005, LUNCH_SEATS.mio.z + 0.13);
    food.rotation.set(0, -Math.PI / 2, 0);
    lid.visible = true;
    sheet.root.position.fromArray(LUNCH_PLAN.sheetRack);
    sheet.root.rotation.set(Math.PI / 2, 0, 0);
    sheet.mark.visible = false;
    sheet.root.visible = false;
    restChopsticks();
    pencil.visible = true;
    sheet.root.add(pencil);
    pencil.position.set(0, 0.03, -0.1);
    pencil.rotation.set(0, Math.PI / 2, 0);
    bite.visible = false;
    cable.position.fromArray(LUNCH_PLAN.cable);
    cable.rotation.set(0, 0, 0);
  }
  park();
  root.visible = false;
  const items = { food, sheet: sheet.root, pencil, cable, sticks };
  return {
    root,
    pencilTip,
    ...items,
    lid,
    mark: sheet.mark,
    hook,
    intake,
    bite,
    restingGrip,
    restChopsticks,
    rice: food.getObjectByName('bento-rice'),
    park,
    snapshot: () => ({
      items: Object.fromEntries(
        Object.entries(items).map(([id, object]) => [
          id,
          {
            ...snapshotObject(object),
            scale: object.scale.toArray(),
            parent: object.parent === sheet.root ? 'sheet' : object.parent === food ? 'food' : 'root',
          },
        ]),
      ),
      lid: lid.visible,
      mark: sheet.mark.visible,
      bite: bite.visible,
      visible: root.visible,
    }),
    restore(saved) {
      park();
      root.visible = !!saved?.visible;
      for (const [id, object] of Object.entries(items)) {
        const data = saved?.items?.[id];
        if (!data) continue;
        (data?.parent === 'sheet' ? sheet.root : data?.parent === 'food' ? food : root).add(object);
        restoreObject(object, data);
        if (data.scale) object.scale.fromArray(data.scale);
        else if (id === 'sticks') object.scale.setScalar(data.parent === 'food' ? 1 / food.scale.x : 1);
      }
      lid.visible = saved?.lid ?? true;
      sheet.mark.visible = !!saved?.mark;
      bite.visible = saved?.bite ?? false;
    },
  };
}
