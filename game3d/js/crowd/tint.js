import*as o from"three";const c=`vec3 tm = texture2D( tMask, vMapUv ).rgb;
 float tl = dot( texel.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
 if ( tHair.w > 0.0 ) texel.rgb = mix( texel.rgb, tHair.rgb * clamp( tl / tHair.w, 0.55, 1.6 ), tm.r );
 if ( tTop.w > 0.0 ) texel.rgb = mix( texel.rgb, tTop.rgb * clamp( tl / tTop.w, 0.55, 1.6 ), tm.g );
 if ( tBot.w > 0.0 ) texel.rgb = mix( texel.rgb, tBot.rgb * clamp( tl / tBot.w, 0.55, 1.6 ), tm.b );
 diffuseColor *= texel;`,s={hair:"tHair",top:"tTop",bottom:"tBot"};export function tintUniforms(t,r){const n={tMask:{value:t.mask}};for(const[l,m]of Object.entries(s)){const i=r[l],a=t.regions[l],e=i&&a?new o.Color(i):null;n[m]={value:e?new o.Vector4(e.r,e.g,e.b,a.lum):new o.Vector4(0,0,0,0)}}return n}export function shadeTint(t,r){Object.assign(t.uniforms,r),t.fragmentShader=`uniform sampler2D tMask;
uniform vec4 tHair, tTop, tBot;
`+t.fragmentShader.replace("diffuseColor *= texel;",c)}
