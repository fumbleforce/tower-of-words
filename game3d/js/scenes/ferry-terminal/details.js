import { Kit } from '../dorms/kit.js';
import { signBoard } from '../plaza-buildings.js';
import { clock, rbox } from '../../props.js';
import { R } from './plan.js';
// Fitted fixtures around the clear aisle: room-use notices, leaflets, service shutter and seat maintenance details.
export function terminalDetails(root) {
  const k = new Kit(),
    sign = (ja, en, w, h, x, y, z, color = '#4d7580') => {
      const o = signBoard(ja, en, w, h, color);
      o.position.set(x, y, z);
      root.add(o);
      return o;
    };
  // A glazed notice case beside the benches, with only actual room use and island directions.
  k.box('#58747c', 3.5, 1.18, 0.1, -4.8, 1.03, R.z0 + 0.06, { surf: 'metal', r: 0.025 });
  k.box('#a9bab6', 3.36, 1.04, 0.018, -4.8, 1.1, R.z0 + 0.121, { surf: 'fabric' });
  sign('おねがい', 'KEEP THE SEATS CLEAR', 1.36, 0.37, -5.61, 1.75, R.z0 + 0.147, '#658282');
  sign('ごみはこちら', 'PLEASE USE THE BIN', 1.36, 0.37, -4, 1.75, R.z0 + 0.147, '#587a84');
  sign('やすんでどうぞ', 'WAITING ROOM · NO TICKET NEEDED', 2.94, 0.27, -4.8, 1.28, R.z0 + 0.147, '#718681');
  for (const x of [-6.36, -3.24])
    for (const y of [1.15, 2.08]) k.box('#c3cdca', 0.035, 0.035, 0.025, x, y, R.z0 + 0.14, { surf: 'metal' });
  // The attendant's rack holds actual folded leaflets; the moving copy sits at its reachable rear lip.
  k.box('#536f7b', 0.64, 0.028, 0.31, 4.87, 0.663, -6.27, { surf: 'metal' });
  k.box('#728f98', 0.64, 0.17, 0.022, 4.87, 0.68, -6.39, { surf: 'metal' });
  for (const x of [4.56, 5.18]) k.box('#627f89', 0.022, 0.15, 0.31, x, 0.69, -6.27, { surf: 'metal' });
  for (let i = 0; i < 3; i++) {
    k.box(['#dce4d8', '#c9dedb', '#b5ced1'][i], 0.15, 0.12, 0.017, 4.65 + i * 0.2, 0.706, -6.31, {
      rx: -0.25,
      surf: 'card',
    });
    k.box('#66858c', 0.11, 0.018, 0.018, 4.65 + i * 0.2, 0.76, -6.289, { rx: -0.25, surf: 'card' });
  }
  // One small counter label and one fitted paper board establish a clear hierarchy.
  sign('ごあんない', 'ROOM ATTENDANT', 1.25, 0.19, 4.6, 0.41, -5.682);
  k.box('#6c858a', 1.38, 0.94, 0.07, 5.9, 1.04, R.z0 + 0.05, { surf: 'metal', r: 0.016 });
  k.box('#bfc7b7', 1.28, 0.84, 0.014, 5.9, 1.09, R.z0 + 0.09, { surf: 'fabric' });
  sign('係員のいる時間', 'MORNING · LUNCH · AFTERNOON', 1.12, 0.24, 5.9, 1.71, R.z0 + 0.11, '#7b8c85');
  sign('ご自由にどうぞ', 'PLEASE TAKE A LEAFLET', 0.79, 0.2, 5.84, 1.34, R.z0 + 0.115, '#82918b');
  for (const x of [5.45, 6.35]) k.box('#b77b65', 0.025, 0.025, 0.018, x, 1.85, R.z0 + 0.13, { surf: 'metal' });
  // A low staff-side shelf and paper stacks sit on real supports, outside the public aisle.
  k.box('#819896', 2.45, 0.038, 0.28, 5.25, 0.76, R.z0 + 0.19, { surf: 'laminate' });
  for (const x of [4.2, 6.3]) k.box('#687f82', 0.045, 0.76, 0.24, x, 0, R.z0 + 0.19, { surf: 'metal' });
  for (let i = 0; i < 3; i++) {
    k.box(['#dae1d8', '#c9d9d6', '#e0d6bf'][i], 0.32, 0.045, 0.22, 4.46 + i * 0.48, 0.798, R.z0 + 0.18, {
      surf: 'card',
    });
    k.box('#e8ece5', 0.3, 0.003, 0.2, 4.46 + i * 0.48, 0.845, R.z0 + 0.18, { cast: false });
  }
  k.box('#a5b5af', 3.7, 1.02, 0.016, 4.75, 0.12, R.z0 + 0.01, { surf: 'paint' });
  k.box('#8ba29e', 3.7, 0.035, 0.03, 4.75, 1.13, R.z0 + 0.025, { surf: 'paint' });
  k.box('#546c75', 3.6, 0.06, 0.06, 4.75, 0.035, -5.74, { surf: 'metal' });

  const time = clock();
  time.position.set(2.02, 2.08, R.z0 + 0.13);
  root.add(time);
  // A fitted wall shelf under the notice is shallow enough to keep both bench approaches unchanged.
  k.box('#8ba2a3', 2.8, 0.055, 0.19, -4.8, 0.91, R.z0 + 0.17, { surf: 'laminate' });
  for (const x of [-5.9, -3.7]) k.box('#607b83', 0.035, 0.22, 0.1, x, 0.71, R.z0 + 0.13, { surf: 'metal' });
  // Raised skirting and a restrained entrance wear field, using geometry at the same floor level.
  for (const x of [R.x0 + 0.016, R.x1 - 0.016]) k.box('#90a3a4', 0.035, 0.12, -R.z0, x, 0, R.z0 / 2, { surf: 'paint' });
  k.box('#90a3a4', R.x1 - R.x0, 0.12, 0.035, (R.x0 + R.x1) / 2, 0, R.z0 + 0.018, { surf: 'paint' });
  for (const [x, z, w, d] of [
    [-0.45, -0.95, 0.46, 0.14],
    [0.23, -1.2, 0.65, 0.12],
    [-0.13, -1.62, 0.51, 0.1],
    [0.59, -0.81, 0.28, 0.11],
  ])
    k.box('#b4c0bd', w, 0.002, d, x, 0.003, z, { r: 0.02, cast: false });
  for (const z of [-5.8, -2.8])
    for (const x of [-6.3, -4]) {
      k.box('#7e9498', 0.23, 0.014, 0.52, x, 0.003, z, { surf: 'metal', cast: false });
      for (const dz of [-0.2, 0.2])
        k.box('#c3ceca', 0.025, 0.007, 0.025, x, 0.019, z + dz, { surf: 'metal', cast: false });
    }
  // Real ceiling fixtures stay with the enclosure; overview lights are represented by their soft floor pools.
  const full = root.getObjectByName('follow-interior');
  for (const x of [-4, 4]) {
    const light = rbox(1.8, 0.055, 0.16, '#cedad8', { y: R.h - 0.035, x, z: -4 });
    light.userData.noBatch = true;
    full.add(light);
    const diffuser = rbox(1.68, 0.018, 0.115, '#ecf2db', { y: R.h - 0.071, x, z: -4 });
    diffuser.userData.noBatch = true;
    full.add(diffuser);
  }
  k.flush(root);
  return {};
}
