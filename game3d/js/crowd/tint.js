// Recolour only the marked hair, clothing and trousers, retaining painted shading.
import * as THREE from 'three';

const TINT = `vec3 tm = texture2D( tMask, vMapUv ).rgb;
 float tl = dot( texel.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
 if ( tHair.w > 0.0 ) texel.rgb = mix( texel.rgb, tHair.rgb * clamp( tl / tHair.w, 0.55, 1.6 ), tm.r );
 if ( tTop.w > 0.0 ) texel.rgb = mix( texel.rgb, tTop.rgb * clamp( tl / tTop.w, 0.55, 1.6 ), tm.g );
 if ( tBot.w > 0.0 ) texel.rgb = mix( texel.rgb, tBot.rgb * clamp( tl / tBot.w, 0.55, 1.6 ), tm.b );
 diffuseColor *= texel;`;
const REGION = { hair: 'tHair', top: 'tTop', bottom: 'tBot' };

export function tintUniforms(f, tint) {
  const u = { tMask: { value: f.mask } };
  for (const [k, n] of Object.entries(REGION)) {
    const hex = tint[k],
      r = f.regions[k];
    const c = hex && r ? new THREE.Color(hex) : null;
    u[n] = {
      value: c ? new THREE.Vector4(c.r, c.g, c.b, r.lum) : new THREE.Vector4(0, 0, 0, 0),
    };
  }
  return u;
}

export function shadeTint(shader, uniforms) {
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader =
    'uniform sampler2D tMask;\nuniform vec4 tHair, tTop, tBot;\n' +
    shader.fragmentShader.replace('diffuseColor *= texel;', TINT);
}
