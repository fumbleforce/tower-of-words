import * as THREE from 'three';
import * as P from './plan.js';

// Opaque glazing closes a real recess. A quiet sky/ground environment gives moving
// highlights without inventing rooms, furniture or buildings behind every pane.
export function sportsGlass() {
  const images = Array.from({ length: 6 }, (_, face) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 64, 64);
    // Large soft bands continue beyond each window instead of stamping an object
    // into every pane. Their contrast survives the steep native street camera.
    const tones =
      face === 2
        ? ['#b5ced6', '#e0e6df', '#9fbecb']
        : face === 3
          ? ['#617f83', '#a5bcb7', '#465d60']
          : ['#718f9e', '#d1dedb', '#536e70'];
    gradient.addColorStop(0, tones[0]);
    gradient.addColorStop(0.38, tones[0]);
    gradient.addColorStop(0.48, tones[1]);
    gradient.addColorStop(0.65, tones[2]);
    gradient.addColorStop(1, tones[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
  });
  const envMap = new THREE.CubeTexture(images);
  envMap.colorSpace = THREE.SRGBColorSpace;
  envMap.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    color: '#b9cbd0',
    roughness: 0.09,
    metalness: 0.82,
    envMap,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
    emissive: '#ffd7a0',
    emissiveIntensity: 0,
  });
  material.userData.noLook = true;
  // A shallow local probe: the pane height shifts the reflected horizon.
  // This keeps a readable sky-to-ground response at the native near-orthographic
  // camera, where an infinitely distant environment otherwise becomes one tint.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'varying float vSportsGlassY;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSportsGlassY = uv.y;');
    const environment = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
      'reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );',
      'reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\nreflectVec = normalize(reflectVec + vec3(0.0, (vSportsGlassY - 0.5) * 1.4, 0.0));',
    );
    shader.fragmentShader =
      'varying float vSportsGlassY;\n' +
      shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>', environment);
  };
  material.customProgramCacheKey = () => 'sports-glass-local-horizon-v2';
  return material;
}

// Same footprint and roof bearing as the original hall; the clerestory and entrance
// are openings through a 24 cm shell rather than glass laid on a solid building.
export function gymShell(p, C, height) {
  const [x0, x1, z0, z1] = P.GYM,
    gx = P.GX,
    width = x1 - x0,
    depth = z1 - z0;
  p.box(C.wall, width, height - 0.3, 0.24, gx, 0.3, z0 + 0.12, { surf: 'concrete' });
  const doorHalf = 3.4;
  for (const [a, b] of [
    [x0, gx - doorHalf],
    [gx + doorHalf, x1],
  ]) {
    p.box(C.wall, b - a, height - 0.3, 0.24, (a + b) / 2, 0.3, z1 - 0.12, { surf: 'concrete' });
    // Broad mineral panels sit within the wall line, separated by narrow joints.
    const count = 3,
      pitch = (b - a) / count;
    for (let i = 0; i < count; i++) {
      p.box('#c2c0b7', pitch - 0.035, 2.75, 0.035, a + pitch * (i + 0.5), 1.15, z1 + 0.004, {
        surf: 'concrete',
        cast: false,
      });
      p.box('#a8aaa1', pitch - 0.035, 0.7, 0.03, a + pitch * (i + 0.5), 0.35, z1 + 0.006, {
        surf: 'concrete',
        cast: false,
      });
    }
  }
  p.box(C.wall, doorHalf * 2, height - 3, 0.24, gx, 3, z1 - 0.12, { surf: 'concrete' });
  for (const x of [x0 + 0.12, x1 - 0.12]) {
    p.box(C.wall, 0.24, 2.55, depth, x, 0.3, (z0 + z1) / 2, { surf: 'concrete' });
    p.box(C.wall, 0.24, height - 3.85, depth, x, 3.85, (z0 + z1) / 2, { surf: 'concrete' });
    const bays = Math.round(depth / 3.2),
      pitch = depth / bays;
    for (let i = 0; i <= bays; i++) {
      const a = Math.max(z0, z0 + i * pitch - 0.3),
        b = Math.min(z1, z0 + i * pitch + 0.3);
      p.box(C.wall, 0.24, 1, b - a, x, 2.85, (a + b) / 2, { surf: 'concrete' });
    }
  }
}
