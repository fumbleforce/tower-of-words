// Shader patches set on a material survive clone() (a tint or a fade clones a material; a plain clone drops
// onBeforeCompile and the program key that goes with it).
export function keepPatch(material) {
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
  return material;
}
