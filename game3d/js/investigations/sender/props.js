import * as THREE from 'three';
import { rbox, mat } from '../../props.js';
import { pendingItems } from './model.js';

function display(monitor) {
  const screen = monitor.children.find((child) => child.geometry?.type === 'PlaneGeometry');
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  screen.material = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  // only the screen redraws; the housing around it can still batch (perf/batch.js)
  screen.userData.noBatch = true;
  return { canvas, texture, screen };
}
function base(g, title) {
  g.fillStyle = '#101925';
  g.fillRect(0, 0, 640, 400);
  g.fillStyle = '#27364c';
  g.fillRect(0, 0, 640, 64);
  g.font = 'bold 30px sans-serif';
  g.fillStyle = '#ecf1fa';
  g.fillText(title, 24, 43);
  g.fillStyle = '#96d9a3';
  g.beginPath();
  g.arc(608, 32, 7, 0, Math.PI * 2);
  g.fill();
}
function queue(g, state) {
  const groups = [
    ['Pending', pendingItems(state)],
    ['Held', state.held === null ? [] : [state.held]],
    ['Acknowledged', state.acknowledged],
  ];
  groups.forEach(([title, ids], index) => {
    const x = 22 + index * 210;
    g.fillStyle = '#afbdd0';
    g.font = '24px sans-serif';
    g.fillText(title, x, 130);
    g.fillStyle = index === 1 ? '#c9dfa9' : '#f0f5ff';
    g.font = 'bold 38px monospace';
    ids.forEach((id, row) => g.fillText(String(id), x, 187 + row * 50));
    if (!ids.length) g.fillText('—', x, 187);
  });
}

// Attach to the two existing monitors. No extra screen or room is introduced.
export function senderProps(world) {
  const desk = world.dS(0).group;
  const deskMonitor = desk.children.find(
    (child) =>
      child.children?.some((mesh) => mesh.geometry?.type === 'PlaneGeometry') &&
      Math.abs(child.position.y - 0.42) < 0.02,
  );
  const remote = display(deskMonitor);
  const retained = display(world.senderMonitor);
  const control = rbox(0.07, 0.024, 0.045, '#87a1bb', {
    x: 0.16,
    y: 0.504,
    z: 0.15,
    r: 0.006,
  });
  control.userData.noBatch = true;
  world.senderCart.add(control);
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.2, 0.54, -1.45),
    new THREE.Vector3(3.93, 0.1, -1.5),
    new THREE.Vector3(3.73, 0.035, -1.8),
    new THREE.Vector3(3.73, 0.035, -2.75),
    new THREE.Vector3(4.1, 0.045, -2.87),
    new THREE.Vector3(4.4, 0.16, -2.92),
  ]);
  world.root.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 24, 0.014, 6, false), mat('#39475a')));
  desk.add(rbox(0.13, 0.014, 0.1, '#c7cec4', { x: 0.29, y: 0.422, z: 0.28, r: 0.003 }));
  const note = rbox(0.12, 0.008, 0.095, '#d6dfcf', {
    x: 0.29,
    y: 0.425,
    z: 0.02,
    r: 0.003,
  });
  const paper = document.createElement('canvas');
  paper.width = paper.height = 128;
  const ink = paper.getContext('2d');
  ink.fillStyle = '#d6dfcf';
  ink.fillRect(0, 0, 128, 128);
  ink.fillStyle = '#344338';
  ink.font = 'bold 58px monospace';
  ink.fillText('25', 26, 78);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.115, 0.09),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(paper), toneMapped: false }),
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.005;
  note.add(label);
  note.userData.noBatch = true;
  note.visible = false;
  desk.add(note);
  let stamp = '';
  return {
    deskMonitor,
    control,
    note,
    remoteScreen: remote.screen,
    consoleScreen: retained.screen,
    paint(state, kept = false) {
      const next = JSON.stringify([state, kept]);
      if (next === stamp) return;
      stamp = next;
      note.visible = kept;
      const deskContext = remote.canvas.getContext('2d');
      base(deskContext, 'Timesheet sender');
      queue(deskContext, state);
      remote.texture.needsUpdate = true;
      const g = retained.canvas.getContext('2d');
      base(g, 'Retained output');
      if (!state.awake) {
        g.fillStyle = '#aebccd';
        g.font = '26px sans-serif';
        g.fillText('Press to wake', 215, 235);
      } else {
        const runs = state.pinned
          ? state.attempts.filter((run) => run.rows.some((row) => state.pinned.rows.includes(row.id)))
          : state.attempts.slice(0, 2);
        runs.forEach((run, index) => {
          const x = 22 + index * 316;
          g.fillStyle = '#afbdd0';
          g.font = '24px sans-serif';
          g.fillText(`Attempt ${run.id}`, x, 112);
          run.rows.forEach((row, line) => {
            const y = 165 + line * 57;
            g.fillStyle = state.pinned?.rows.includes(row.id) ? '#c9dfa9' : '#ecf1fa';
            g.font = '25px monospace';
            g.fillText(
              row.status === 'restart' ? '↻ Restart' : `${row.item} ${row.status === 'started' ? 'Started' : 'Ack.'}`,
              x,
              y,
            );
          });
        });
      }
      retained.texture.needsUpdate = true;
    },
    turnDesk(amount) {
      deskMonitor.rotation.y = amount;
    },
  };
}
