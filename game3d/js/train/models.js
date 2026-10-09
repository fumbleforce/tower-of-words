// The monorail's Blender-built outside (tools/train/monorail.py, game3d/assets/train/monorail.glb): the car's skin
// and roof units, its navy skirt, the gangway bellows, a beam segment, a pillar and its foot. Each node is one mesh
// whose flat colours (stainless, navy, frames, panel lines) are in its vertex colours.
// The car skin is brushed stainless (#356): its wear (grime, drips, rust streaks, edge wear, ambient occlusion and a
// brushed grain) is a baked texture, monorail-wear.webp (tools/train/monorail_wear.py), and it and the skirt reflect
// a small sky-and-sea gradient of their own (skyEnv below; the rest of the place has no environment map).
// loadMonorail() is awaited by the train place before it builds the car and the world; if the model can't be fetched
// (patchy signal), monorailParts() stays null and car.js and world.js build their older code-made outside instead.
// Without the texture the skin is plain brushed metal.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';

let parts = null,
  loading = null;

// one material per kind of surface; the colour is all in the vertices. env: how strongly it reflects skyEnv.
const MATS = {
  car_skin: { roughness: 0.38, metalness: 0.8, env: 1 },
  car_under: { roughness: 0.5, metalness: 0.2, env: 0.7 },
  bellows: { roughness: 0.95, metalness: 0 },
  beam: { roughness: 0.95, metalness: 0 },
  pillar: { roughness: 0.95, metalness: 0 },
  foot: { roughness: 0.95, metalness: 0 },
};

// rust on the skin, linear (#8c4f2e)
const RUST = new THREE.Color('#8c4f2e');

// The skin's shader. The vertex colour's alpha is the metal class (1 bare stainless, 0 paint and rubber), so it scales
// the metalness and never the opacity (the departure fade makes the car's materials transparent). With the wear
// texture (data from monorail_wear.py: R the shade x 1.25, G rust, B roughness) it also shades, rusts and roughens.
function skinShader(material, tex) {
  if (tex) Object.assign(material, { map: tex, roughness: 1 });
  material.onBeforeCompile = (s) => {
    // the vertex colour (its alpha put back), then rust over it. The includes stay, so later patches (look/) can
    // still hook them.
    const rust = tex ? '\ndiffuseColor.rgb = mix( diffuseColor.rgb, rustColor * wear.r * 1.25, wear.g );' : '';
    let f = s.fragmentShader.replace(
      '#include <color_fragment>',
      'float alphaBeforeColor = diffuseColor.a;\n#include <color_fragment>\n#ifdef USE_COLOR_ALPHA\n' +
        'float metalClass = vColor.a;\ndiffuseColor.a = alphaBeforeColor;\n#else\nfloat metalClass = 1.0;\n#endif' +
        rust,
    );
    if (tex) {
      s.uniforms.rustColor = { value: RUST };
      f = ('uniform vec3 rustColor;\n' + f)
        .replace('#include <map_fragment>', 'vec4 wear = texture2D( map, vMapUv );\ndiffuseColor.rgb *= wear.r * 1.25;')
        .replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = roughness * wear.b;',
        );
    }
    s.fragmentShader = f.replace(
      '#include <metalnessmap_fragment>',
      'float metalnessFactor = metalness * metalClass' + (tex ? ' * ( 1.0 - wear.g );' : ';'),
    );
  };
  material.customProgramCacheKey = () => (tex ? 'mono-wear' : 'mono-metal');
}

// What the car's steel reflects: sky above, a warm band at the horizon with the low sun's glow toward the sun
// (SUN_DIR, which places/train.js also lights the place with), the sea below. An equirectangular gradient; the
// renderer prefilters it (PMREM) itself.
export const SUN_DIR = new THREE.Vector3(-0.45, 0.62, -0.75).normalize();
let env = null;
export function skyEnv() {
  if (env || typeof document === 'undefined') return env;
  const W = 256,
    H = 128,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  [
    [0, '#5f8db6'],
    [0.32, '#93b2cb'],
    [0.44, '#bfc8cf'],
    [0.485, '#e3cdb0'],
    [0.5, '#e8c39a'],
    [0.515, '#9fb2bb'],
    [0.62, '#5d8296'],
    [1, '#24485a'],
  ].forEach(([k, c]) => grad.addColorStop(k, c));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // the sun's glow: three's equirect u = atan(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5 (the canvas top is up)
  const su = (Math.atan2(SUN_DIR.z, SUN_DIR.x) / (2 * Math.PI) + 0.5) * W,
    sv = (0.5 - Math.asin(SUN_DIR.y) / Math.PI) * H;
  for (const dx of [-W, 0, W]) {
    const r = g.createRadialGradient(su + dx, sv, 0, su + dx, sv, 22);
    r.addColorStop(0, 'rgba(255,232,196,0.85)');
    r.addColorStop(0.35, 'rgba(255,214,160,0.4)');
    r.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
  }
  env = new THREE.CanvasTexture(cv);
  env.mapping = THREE.EquirectangularReflectionMapping;
  env.colorSpace = THREE.SRGBColorSpace;
  return env;
}

// Shader patches set here survive clone() (the neighbours' tint and the departure fade clone the car's materials;
// a plain clone drops onBeforeCompile).
function keepPatch(material) {
  const { onBeforeCompile, customProgramCacheKey } = material;
  material.clone = function () {
    const c = new this.constructor().copy(this);
    Object.assign(c, {
      onBeforeCompile,
      customProgramCacheKey,
      clone: this.clone,
    });
    return c;
  };
}

// Geometry and a material per node name, from a parsed glTF scene, with the skin's wear texture if it loaded.
export function partsFrom(scene, wear = null) {
  const out = {};
  scene.traverse((o) => {
    if (!o.isMesh || !MATS[o.name]) return;
    const { env: envK, ...look } = MATS[o.name];
    const material = new THREE.MeshStandardMaterial({
      name: 'mono-' + o.name,
      vertexColors: true,
      ...look,
    });
    if (envK) Object.assign(material, { envMap: skyEnv(), envMapIntensity: envK });
    if (o.name === 'car_skin') {
      skinShader(material, o.geometry.attributes.uv ? wear : null);
      keepPatch(material);
    }
    out[o.name] = { geometry: o.geometry, material };
  });
  return Object.keys(MATS).every((k) => out[k]) ? out : null;
}

function loadWear() {
  return new THREE.TextureLoader()
    .loadAsync(new URL('../../assets/train/monorail-wear.webp', import.meta.url).href)
    .then((t) => {
      t.flipY = false; // glTF UVs
      t.colorSpace = THREE.NoColorSpace; // data, not colour
      t.anisotropy = 4;
      return t;
    })
    .catch((e) => (console.warn('monorail-wear.webp', e), null));
}

export function loadMonorail() {
  return (loading ??= Promise.all([
    new GLTFLoader().loadAsync(new URL('../../assets/train/monorail.glb', import.meta.url).href),
    loadWear(),
  ])
    .then(([g, wear]) => {
      parts = partsFrom(g.scene, wear);
      if (!parts) console.warn('monorail.glb: missing nodes');
    })
    .catch((e) => console.warn('monorail.glb', e)));
}

// Set directly (the unit tests parse the file themselves).
export function setMonorail(p) {
  parts = p;
}

export const monorailParts = () => parts;

// A mesh of one node, sharing its geometry and material.
export function monorailMesh(name, { cast = false, recv = true } = {}) {
  const p = parts?.[name];
  if (!p) return null;
  const m = new THREE.Mesh(p.geometry, p.material);
  m.name = name;
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}
