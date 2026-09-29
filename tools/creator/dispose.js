// Creator builds own their geometries, materials, skeleton and mixer. Source
// textures belong to the library and stay alive for the next recipe.
export function disposeCharacter(character) {
  if (!character) return;
  character.root.removeFromParent();
  character.mixer.stopAllAction();
  character.mixer.uncacheRoot(character.rig);
  const geometries = new Set(), materials = new Set();
  for (const mesh of Object.values(character.meshes)) {
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  }
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  character.skeleton.dispose();
}
