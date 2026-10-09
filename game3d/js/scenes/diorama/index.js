// The street style, the game's outdoor look (Review street-style-default-1, #321): materials, softened station walls,
// paving detail, leaf clusters, meadow and daylight dressed over the forecourt (scenes/forecourt.js). The other outdoor
// places don't have it yet; the world kit (#367, notes/outdoor-plan.md) takes it to them.
import * as THREE from 'three';
import { streetDetails } from './details.js';
import { finishStreet } from './materials.js';
export { finishWindows } from './materials.js';
import { meadowDetail } from './meadow.js';
import { dressFoliage } from './foliage.js';
import { softenStation } from './architecture.js';
import { detailController } from './quality.js';
import { southLinkFrame } from '../forecourt/south-link.js';
export { finishOffice } from './architecture.js';
// phone: the phone's lighter build (perf/phone.js phoneLighter), a coarser crown core and fewer street finishes
export function dressStreet(root, scene, sun, station, nav, phone = false) {
  const environment = finishStreet(root, phone);
  const softened = softenStation(root);
  const details = streetDetails(root, station, environment);
  // leaves in 10 m tiles: fewer draws, each still culled (the place budgets, game3d/tools/perf/place-budgets.json)
  const leaves = dressFoliage(root, {
    budget: 32000,
    tileSize: 10,
    leafShadows: false,
    leafScale: 1.5,
    sun,
    phone,
    bounds: [-8, 33, -13, 19],
    focus: [3, 28, 0, 16],
  });
  const meadow = meadowDetail(root, nav, {
    budget: 6500,
    shadows: false,
    bounds: [3, 27, -0.5, 16],
    avoid: southLinkFrame('forecourt').walk,
  });
  scene.traverse((o) => {
    if (o.isHemisphereLight) {
      o.color.set('#c8dcf0');
      o.groundColor.set('#968264');
      o.intensity = 1.5;
    } else if (o.isAmbientLight) o.intensity = 0.25;
  });
  sun.color.set('#ffe1b7');
  sun.intensity = 2.9;
  // Keep the street and garden inside the shadow camera, rather than centring it at the station's origin.
  sun.target.position.set(12, 0, 5);
  sun.position.copy(sun.target.position).add(new THREE.Vector3(-18, 24, 12));
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.00045;
  sun.shadow.normalBias = 0.012;
  sun.shadow.radius = 2;
  root.userData.diorama = { leaves, meadow, details, softened };
  root.userData.dioramaDetail = detailController(root);
  root.userData.dioramaDetail();
  return environment;
}
export const STREET_GRADE = {
  exposure: 1.02,
  temp: 0.025,
  sat: 1.04,
  contrast: 1.05,
  lift: [0.005, 0.006, 0.009],
  shadowTint: [-0.01, 0, 0.016],
  highTint: [0.014, 0.009, -0.006],
  bloom: 0.13,
  bloomThreshold: 0.95,
  ao: 0.55,
  vignette: 0.12,
  blur: 0,
};
