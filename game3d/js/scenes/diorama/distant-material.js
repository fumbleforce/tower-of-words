import*as l from"three";export function distantMaterial(){const a=new l.MeshStandardMaterial({vertexColors:!0,roughness:.92});return a.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vIslandPoint; varying vec3 vIslandNormal;`),e.vertexShader=e.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vIslandPoint = position; vIslandNormal = normal;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
      varying vec3 vIslandPoint; varying vec3 vIslandNormal;
      float islandHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float islandClumps(vec2 p) {
        vec2 c=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(islandHash(c),islandHash(c+vec2(1.,0.)),f.x),
          mix(islandHash(c+vec2(0.,1.)),islandHash(c+vec2(1.,1.)),f.x),f.y);
      }
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
    `),e.fragmentShader=e.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
      float planted=step(vColor.r*1.08,vColor.g)*step(vColor.b*1.08,vColor.g);
      vec3 leafWeight=pow(abs(normalize(vIslandNormal)),vec3(4.));
      leafWeight/=max(dot(leafWeight,vec3(1.)),.001);
      float leaves=dot(leafWeight,vec3(islandLeaves(vIslandPoint.yz*4.),islandLeaves(vIslandPoint.xz*4.),islandLeaves(vIslandPoint.xy*4.)));
      float clumps=dot(leafWeight,vec3(islandClumps(vIslandPoint.yz*2.),islandClumps(vIslandPoint.xz*2.),islandClumps(vIslandPoint.xy*2.)));
      // Fade fine leaves before their cells shrink below a few pixels; broad clumps remain stable.
      float footprint=max(length(dFdx(vIslandPoint)),length(dFdy(vIslandPoint)))*4.;
      float leafVisible=1.-smoothstep(.2,.6,footprint);
      diffuseColor.rgb*=mix(1.,.8+clumps*.18+(leaves-.35)*.6*leafVisible,planted);
      float leafRelief=leaves*.004*leafVisible*planted;
    `),e.fragmentShader=e.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
      vec3 leafDx=dFdx(-vViewPosition),leafDy=dFdy(-vViewPosition);
      vec3 leafR1=cross(leafDy,normal),leafR2=cross(normal,leafDx);
      float leafDet=dot(leafDx,leafR1)*faceDirection;
      normal=normalize(abs(leafDet)*normal-sign(leafDet)*(dFdx(leafRelief)*leafR1+dFdy(leafRelief)*leafR2));
    `)},a.customProgramCacheKey=()=>"island-distant-leaves-4",a}
