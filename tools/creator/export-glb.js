import * as THREE from 'three';
import { GLTFExporter } from './vendor/GLTFExporter.js';
import { buildCharacter } from './recipe.js';
import { disposeCharacter } from './dispose.js';
import { bakePartMaterial } from './export-material.js';

function exportClips(character) {
  const hips = character.bones.Hips.position;
  return Object.entries(character.actions).map(([name, action]) => {
    const clip = action.getClip().clone();
    clip.name = name;
    if (name === 'idle') {
      clip.duration = 1;
      clip.tracks = clip.tracks.map(track => {
        const value = Array.from(track.createInterpolant().evaluate(.4));
        return new track.constructor(track.name, [0, 1], [...value, ...value], THREE.InterpolateLinear);
      });
    }
    for (const track of clip.tracks) if (track.name === 'Hips.position') {
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = hips.x; track.values[i + 2] = hips.z;
      }
    }
    return clip;
  });
}

export async function exportCharacterGLB(library, recipe) {
  const snapshot = structuredClone(recipe), textures = [];
  let character;
  try {
    character = await buildCharacter(library, snapshot);
    character.bindPose();
    const animations = exportClips(character);
    for (const mesh of Object.values(character.meshes)) bakePartMaterial(mesh, textures);
    character.root.name = snapshot.body + '-character';
    character.root.userData.amakawa = {format: 'amakawa-creator', version: 1, recipe: snapshot};
    character.root.updateMatrixWorld(true);
    return await new GLTFExporter().parseAsync(character.root, {binary: true, animations});
  } finally {
    disposeCharacter(character);
    textures.forEach(texture => texture.dispose());
  }
}
