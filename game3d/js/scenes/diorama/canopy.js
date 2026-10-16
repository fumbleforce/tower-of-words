import*as a from"three";import{mergeVertices as p}from"three/addons/utils/BufferGeometryUtils.js";import{shadowOnly as h,clustered as v}from"../../perf/shadow-proxy.js";export function leafCluster(){const c=document.createElement("canvas");c.width=c.height=128;const o=c.getContext("2d");[[39,35,-.8],[68,22,.2],[87,48,.9],[48,64,-.5],[78,80,.6],[33,91,-.8],[59,105,.15]].forEach(([n,s,f],m)=>{o.save(),o.translate(n,s),o.rotate(f),o.beginPath(),o.moveTo(0,-20),o.bezierCurveTo(15,-10,14,8,0,20),o.bezierCurveTo(-13,9,-14,-8,0,-20);const t=o.createLinearGradient(-12,-12,12,12);t.addColorStop(0,m%2?"#ededed":"#ffffff"),t.addColorStop(.48,"#e1e1e1"),t.addColorStop(.52,"#c5c5c5"),t.addColorStop(1,"#aeaeae"),o.fillStyle=t,o.fill(),o.restore()});const l=new a.CanvasTexture(c);return l.colorSpace=a.SRGBColorSpace,l}export function addCanopyCore(c,o,d,l=!1){const n=new a.BufferGeometry,s=[],f=[],m=[];for(const e of o)for(const i of[e.a,e.b,e.c])m.push(i.x,i.y,i.z),s.push(i.x,i.y,i.z),f.push(e.n.x,e.n.y,e.n.z);n.setAttribute("position",new a.Float32BufferAttribute(s,3)),n.setAttribute("normal",new a.Float32BufferAttribute(f,3));let t=n;l&&(t=v(n,.2),t.computeVertexNormals()),t.deleteAttribute("normal");const r=new a.Mesh(p(t),new a.MeshStandardMaterial({color:"#365020",roughness:1}));r.geometry.computeVertexNormals(),n.dispose(),t!==n&&t.dispose();const w=new a.BufferGeometry;w.setAttribute("position",new a.Float32BufferAttribute(m,3)),d&&c.add(h(v(w,.45),"diorama-crown-shadow",d)),w.dispose(),r.name="diorama-foliage-interior",r.userData.noLook=r.material.userData.noLook=!0,r.userData.surf="foliage",r.userData.crownCore=!0,r.material.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vCrown; varying vec3 vCrownNormal;`),e.vertexShader=e.vertexShader.replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vCrown=(modelMatrix*vec4(transformed,1.)).xyz; vCrownNormal=normalize(mat3(modelMatrix)*objectNormal);`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
      varying vec3 vCrown; varying vec3 vCrownNormal;
      float crownHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float crownNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(crownHash(i),crownHash(i+vec2(1,0)),f.x),mix(crownHash(i+vec2(0,1)),crownHash(i+vec2(1,1)),f.x),f.y);
      }
      // Leaves scattered at random points (the nearest of the jittered neighbours), each its own size, turn and
      // shade, under soft clumps of light and shadow: no row or grid to pick out (issue #362).
      float crownLayer(vec2 p){
        vec2 cell=floor(p);float best=9.,tone=.5,lit=0.;
        for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
          vec2 c=cell+vec2(i,j);float h=crownHash(c),k=crownHash(c+17.3);
          vec2 d=p-(c+vec2(h,k));float a=h*6.28318;
          d=mat2(cos(a),-sin(a),sin(a),cos(a))*d;
          float e=length(d/vec2(.62,.36))/(.75+.5*k);
          if(e<best){best=e;tone=h;lit=d.y;}
        }
        float leaf=1.-smoothstep(.55,1.,best);
        return leaf*(.25+.45*tone)+lit*.12;
      }
      float crownLeaves(vec2 p){
        vec2 q=mat2(.8,-.6,.6,.8)*p;
        float leaves=max(crownLayer(p*9.),crownLayer(q*13.+5.1)*.85);
        float clump=crownNoise(p*2.3)*.6+crownNoise(q*5.1)*.4;
        return .4+leaves*.8+(clump-.5)*.42;
      }
    `),e.fragmentShader=e.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
      vec3 crownWeight=pow(abs(normalize(vCrownNormal)),vec3(4.));
      crownWeight/=dot(crownWeight,vec3(1.));
      float crownTone=dot(crownWeight,vec3(crownLeaves(vCrown.yz),crownLeaves(vCrown.xz),crownLeaves(vCrown.xy)));
      diffuseColor.rgb*=crownTone;
      float crownRelief=crownTone*.035;
    `)};const u=r.material.onBeforeCompile;r.material.onBeforeCompile=e=>{u(e),e.fragmentShader=e.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
      vec3 crownDx=dFdx(-vViewPosition),crownDy=dFdy(-vViewPosition);
      vec3 crownR1=cross(crownDy,normal),crownR2=cross(normal,crownDx);
      float crownDet=dot(crownDx,crownR1)*faceDirection;
      normal=normalize(abs(crownDet)*normal-sign(crownDet)*(dFdx(crownRelief)*crownR1+dFdy(crownRelief)*crownR2));
    `)},r.material.customProgramCacheKey=()=>"diorama-leaf-interior-v2",r.castShadow=!1,r.receiveShadow=!0,c.add(r)}
