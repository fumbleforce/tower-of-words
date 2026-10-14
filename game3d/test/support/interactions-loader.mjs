// Keep interaction routing and Runner real. Render/audio/UI boundaries use the save-test loader.
import { resolve as saveResolve } from './save-loader.mjs';
export async function resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
  if (specifier.startsWith('three/addons/'))
    return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
  return saveResolve(specifier, context, next);
}
