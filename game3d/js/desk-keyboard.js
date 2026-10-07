import * as THREE from 'three';

// The visible keyboard and its contact points share coordinates in both prop detail levels.
export function deskKeyboard(desk, box, depth, keysMesh = null) {
  const keyboard = new THREE.Group();
  keyboard.position.set(0, 0.42, depth * 0.12);
  keyboard.add(
    box(keysMesh ? 0.37 : 0.36, keysMesh ? 0.016 : 0.02, keysMesh ? 0.13 : 0.12, '#cfd1d4', {
      r: keysMesh ? 0.006 : 0.008,
    }),
  );
  if (keysMesh) {
    const keys = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 14; c++) keys.push([0.019, 0.008, 0.019, -0.165 + c * 0.0254, 0.016, -0.042 + r * 0.026]);
    keys.push([0.15, 0.008, 0.019, 0, 0.016, 0.062]);
    keyboard.add(keysMesh(keys, '#e6e7e8', { cast: false }));
  }
  keyboard.userData.typing = [-0.09, 0.09].map((x) => [x, keysMesh ? 0.024 : 0.02, 0.035]);
  desk.add(keyboard);
  desk.userData.keyboard = keyboard;
}
