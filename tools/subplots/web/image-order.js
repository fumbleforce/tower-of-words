// Completion time for pictures, submission time for jobs still in the queue.
// The server supplies epoch seconds so its timezone also applies to old local timestamps.
function pictureTime(picture) {
  if (Number.isFinite(picture.at_epoch)) return picture.at_epoch;
  const at = Date.parse(picture.at || '');
  if (Number.isFinite(at)) return at / 1000;
  return Number.isFinite(picture.created) ? picture.created : 0;
}

export function newestPictureFirst(a, b) {
  return pictureTime(b) - pictureTime(a)
    || (Number(b.n) || 0) - (Number(a.n) || 0)
    || (Number(b.idx) || 0) - (Number(a.idx) || 0)
    || String(b.id || '').localeCompare(String(a.id || ''), undefined, {numeric: true});
}
