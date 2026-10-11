import {draftPictureUrl, fullUrl} from '../../imagegen/web/gallery.js';

export function clearPendingPicture(doc, slot) {
  const saved = doc.studioDraft && doc.images?.find(image => image.id === slot)?.savedPick;
  if (saved) {
    doc.metadata.images ||= {};
    doc.metadata.images[slot] = globalThis.structuredClone(saved);
  } else if (doc.metadata.images) delete doc.metadata.images[slot];
  if (doc.metadata.image?.slot === slot) delete doc.metadata.image;
}

export function picturePick(slot, render) {
  return {slot, id: render.id, n: render.n, url: fullUrl(render, '/api/subplots/image'),
    file: draftPictureUrl(render.url) ? undefined : render.file, seed: render.seed, positive: render.positive};
}

// The displayed picture's source for image-to-image and masked repaint jobs.
export function picturePath(pic) {
  const durable = draftPictureUrl(pic.url);
  if (durable) return durable;
  if (pic.chosen && !pic.chosen.applied && pic.chosen.file) return 'island/private/imagegen/outputs/' + pic.chosen.file;
  return pic.url && !pic.url.startsWith('data:') && !pic.url.startsWith('/api/') ? decodeURIComponent(pic.url.replace(/^\//, '')) : '';
}
