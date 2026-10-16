import*as a from"three";import{keepPatch as m}from"./patch.js";export function localHorizon(e,[n,t,o]){const l=n==="uv"?"uv.y":"position.y",c=e.onBeforeCompile,f=e.customProgramCacheKey,i=c!==a.Material.prototype.onBeforeCompile;e.onBeforeCompile=function(r,v){i&&c.call(this,r,v),r.vertexShader=`varying float vPaneH;
`+r.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vPaneH = ${l};`),r.fragmentShader=`varying float vPaneH;
`+r.fragmentShader.replace("#include <envmap_physical_pars_fragment>",a.ShaderChunk.envmap_physical_pars_fragment.replace("reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );",`reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
reflectVec = normalize( reflectVec + vec3( 0.0, ( vPaneH - ${(+t).toFixed(3)} ) * ${(+o).toFixed(3)}, 0.0 ) );`))};const p=`|pane-${n}-${t}-${o}`;return e.customProgramCacheKey=function(){return(i?f.call(this):"")+p},m(e)}
