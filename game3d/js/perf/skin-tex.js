// Character skins by tier (#373). The skins are 2048x2048 (21 MB each as a mipmapped texture); a phone gets the
// 1024 copy (5 MB) and the background crowd, only ever seen small, the 512 copy (1.3 MB). The copies are written
// beside each skin by tools/characters/skin_sizes.py. One texture per file: whoever asks for the same skin gets the
// same one. Desktop keeps 2048. ?fullphone turns the smaller copies off with the rest of the lighter phone look.
import * as THREE from 'three';

const cache = new Map();
const smaller = (url, size) => url.replace(/(\.webp)(\?.*)?$/, `-${size}$1$2`);

// The file for this skin on this screen: `small` marks people who are only seen small (the crowd). phone.js reads
// the page's settings when it loads, so it is imported here and not at the top (unit tests load this without a page).
export async function skinUrl(url, { small = false } = {}) {
  const { phoneLighter } = await import('./phone.js');
  return phoneLighter() ? smaller(url, small ? 512 : 1024) : url;
}

// The skin's texture (shared), falling back to the full file if a smaller copy is missing.
export async function loadSkin(url, opts) {
  const want = await skinUrl(url, opts);
  if (!cache.has(want)) {
    const loader = new THREE.TextureLoader();
    const p = loader.loadAsync(want).catch((e) => {
      if (want === url) throw e;
      return loader.loadAsync(url);
    });
    cache.set(want, p);
    p.catch(() => cache.delete(want));
  }
  return cache.get(want);
}
