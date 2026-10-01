import * as THREE from "three";

// A small bilateral texture filter preserves colour boundaries while averaging fine noise inside them.
// The original texture is not changed. This review-only shader is marked in the GLB material extras.
export function applyCleanMaterial(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat()) {
      if (!m.userData.mioCleanFilter || !m.map) continue;
      const image = m.map.image;
      m.onBeforeCompile = (shader) => {
        shader.uniforms.mioTexel = {
          value: new THREE.Vector2(1 / image.width, 1 / image.height),
        };
        shader.fragmentShader =
          "uniform vec2 mioTexel;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `
          #ifdef USE_MAP
            vec4 center = texture2D(map, vMapUv);
            vec3 cleaned = center.rgb * 4.0;
            float total = 4.0;
            for (int y = -2; y <= 2; y++) {
              for (int x = -2; x <= 2; x++) {
                vec2 offset = vec2(float(x), float(y));
                vec3 sampleColor = texture2D(map, vMapUv + offset * mioTexel * 1.5).rgb;
                vec3 delta = sampleColor - center.rgb;
                float weight = exp(-dot(delta, delta) * 220.0 - dot(offset, offset) * 0.22);
                cleaned += sampleColor * weight;
                total += weight;
              }
            }
            diffuseColor *= vec4(cleaned / total, center.a);
          #endif
        `,
        );
      };
      m.customProgramCacheKey = () => "mio-clean-bilateral-1";
      m.needsUpdate = true;
    }
  });
}
