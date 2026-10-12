import * as THREE from 'three';

// A little clustered leaf colour on the merged far model, without cards or extra draw calls.
// Only its green vertices receive it; masonry, roofs, sand and the sea keep their own colours.
export function distantMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vIslandPoint; varying vec3 vIslandNormal;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvIslandPoint = position; vIslandNormal = normal;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying vec3 vIslandPoint; varying vec3 vIslandNormal;
      float islandHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float islandLeaves(vec2 p) {
        vec2 cell=floor(p); float shade=0.;
        for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++) {
          vec2 c=cell+vec2(i,j); float h=islandHash(c),k=islandHash(c+19.3);
          vec2 d=p-c-vec2(h,k); float a=h*6.28318;
          d=mat2(cos(a),-sin(a),sin(a),cos(a))*d;
          shade=max(shade,(1.-smoothstep(.3,.85,length(d/vec2(.8,.45))))*(.25+.65*k));
        }
        return shade;
      }
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float planted=step(vColor.r*1.08,vColor.g)*step(vColor.b*1.08,vColor.g);
      vec3 leafWeight=pow(abs(normalize(vIslandNormal)),vec3(4.));
      leafWeight/=max(dot(leafWeight,vec3(1.)),.001);
      float leaves=dot(leafWeight,vec3(islandLeaves(vIslandPoint.yz*7.),islandLeaves(vIslandPoint.xz*7.),islandLeaves(vIslandPoint.xy*7.)));
      diffuseColor.rgb*=mix(1.,.8+leaves*.35,planted);
    `,
    );
  };
  material.customProgramCacheKey = () => 'island-distant-leaves-1';
  return material;
}
