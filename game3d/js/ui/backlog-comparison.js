import { heardHTML } from './dialogue-text.js';

// Only a recorded vocabulary can describe the original hearing. Legacy saves
// without that snapshot still show today's reading in the ordinary log.
export function earlierReading(entry, currentHTML) {
  if (!entry.memoryId || !entry.ov || !Array.isArray(entry.knownAtTime)) return '';
  const original = heardHTML(entry.text, entry.clear, new Set(entry.knownAtTime));
  if (original === currentHTML) return '';
  return `<details class="reading-before"><summary>What I understood then</summary>
    <div class="tx">${original}</div></details>`;
}
