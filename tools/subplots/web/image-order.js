// The picture library's one order, newest first (#694: "the images are not rendering in order ... they seem to arrive
// in semi random order"). Finished pictures go by the #n the image service gives each one as it finishes, so #n order
// is finish order whoever rendered it. Renders still waiting sit above them in the order the queue will run them, the
// next one lowest, so a render that finishes keeps its place and nothing reshuffles.
const waiting = picture => picture.status === 'queued' || picture.status === 'running';
const number = picture => Number(picture.n) || 0;

// Completion time, for the rare finished picture without a number.
function pictureTime(picture) {
  if (Number.isFinite(picture.at_epoch)) return picture.at_epoch;
  const at = Date.parse(picture.at || '');
  return Number.isFinite(at) ? at / 1000 : 0;
}

// Later in the queue is higher up: the running render first in line, then queue_pos (the service's run order:
// Jørgen's own renders before agents', each in the order they came), then submission time when a list has no position.
function queueLater(a, b) {
  const running = (a.status === 'running') - (b.status === 'running');
  if (running) return running;
  if (Number.isFinite(a.queue_pos) && Number.isFinite(b.queue_pos)) return b.queue_pos - a.queue_pos;
  return (Number(b.created) || 0) - (Number(a.created) || 0);
}

export function newestPictureFirst(a, b) {
  return waiting(b) - waiting(a)
    || (waiting(a) ? queueLater(a, b) : 0)
    || !number(a) - !number(b)
    || number(b) - number(a)
    || pictureTime(b) - pictureTime(a)
    || (Number(b.idx) || 0) - (Number(a.idx) || 0)
    || String(b.id || '').localeCompare(String(a.id || ''), undefined, {numeric: true});
}
