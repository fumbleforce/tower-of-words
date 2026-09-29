import * as THREE from 'three';

// Same linear-colour transform as partMaterial() in recipe.js, baked for glTF.
export function colourTransform(u) {
  const key = u.uKey.value, tint = u.uTint.value, cool = u.uCool.value;
  const keyGamma = [key.r, key.g, key.b].map(n => Math.pow(n, 1 / 2.2));
  const keyLight = Math.max(key.r * .2126 + key.g * .7152 + key.b * .0722, .0001);
  return colour => {
    const light = colour.r * .2126 + colour.g * .7152 + colour.b * .0722;
    const r = (light + (colour.r - light) * u.uSat.value) * cool.x;
    const g = (light + (colour.g - light) * u.uSat.value) * cool.y;
    const b = (light + (colour.b - light) * u.uSat.value) * cool.z;
    const distance = Math.hypot(
      Math.pow(Math.max(r, 0), 1 / 2.2) - keyGamma[0],
      Math.pow(Math.max(g, 0), 1 / 2.2) - keyGamma[1],
      Math.pow(Math.max(b, 0), 1 / 2.2) - keyGamma[2],
    );
    const t = THREE.MathUtils.clamp((distance - u.uThr.value) / (u.uThr.value * .8), 0, 1);
    const mix = u.uAmt.value * (1 - t * t * (3 - 2 * t));
    const shade = THREE.MathUtils.clamp((r * .2126 + g * .7152 + b * .0722) / keyLight, .35, 2.2);
    colour.setRGB(r + (tint.r * shade - r) * mix, g + (tint.g * shade - g) * mix, b + (tint.b * shade - b) * mix);
    return colour;
  };
}

function bakeTexture(source, transform) {
  const canvas = document.createElement('canvas');
  canvas.width = source.image.width; canvas.height = source.image.height;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.drawImage(source.image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height), colour = new THREE.Color();
  for (let i = 0; i < pixels.data.length; i += 4) {
    colour.setRGB(pixels.data[i] / 255, pixels.data[i + 1] / 255, pixels.data[i + 2] / 255, THREE.SRGBColorSpace);
    transform(colour).convertLinearToSRGB();
    pixels.data[i] = Math.round(colour.r * 255);
    pixels.data[i + 1] = Math.round(colour.g * 255);
    pixels.data[i + 2] = Math.round(colour.b * 255);
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = source.wrapS; texture.wrapT = source.wrapT;
  texture.magFilter = source.magFilter; texture.minFilter = source.minFilter;
  return texture;
}

export function bakePartMaterial(mesh, ownedTextures) {
  const geometry = mesh.geometry, old = mesh.material;
  const use = geometry.getAttribute('useTex'), colours = geometry.getAttribute('color');
  const textured = [], palette = [], transform = colourTransform(old.userData.u), colour = new THREE.Color();
  for (let i = 0; i < use.count; i += 3) {
    const usesTexture = use.getX(i) === 1;
    for (let j = i; j < i + 3; j++) {
      if (use.getX(j) !== Number(usesTexture)) throw new Error('Cannot export a triangle with mixed texture modes.');
      if (usesTexture && [colours.getX(j), colours.getY(j), colours.getZ(j)].some(n => n !== 1)) {
        throw new Error('Cannot export a textured triangle with an additional vertex tint.');
      }
      if (!usesTexture) {
        colour.fromBufferAttribute(colours, j); transform(colour);
        colours.setXYZ(j, THREE.MathUtils.clamp(colour.r, 0, 1), THREE.MathUtils.clamp(colour.g, 0, 1), THREE.MathUtils.clamp(colour.b, 0, 1));
      }
      (usesTexture ? textured : palette).push(j);
    }
  }
  geometry.setIndex([...textured, ...palette]);
  geometry.deleteAttribute('useTex');
  geometry.clearGroups();
  const materials = [];
  if (textured.length) {
    const map = bakeTexture(old.map, transform); ownedTextures.push(map);
    geometry.addGroup(0, textured.length, materials.length);
    materials.push(new THREE.MeshStandardMaterial({map, roughness: 1, metalness: 0, vertexColors: true}));
  }
  if (palette.length) {
    geometry.addGroup(textured.length, palette.length, materials.length);
    materials.push(new THREE.MeshStandardMaterial({roughness: 1, metalness: 0, vertexColors: true}));
  }
  if (old.flatShading) geometry.computeVertexNormals();
  mesh.material = materials; old.dispose();
}
