import { itemDocumentPages } from '../gameplay/item-documents.js';
import { readNote } from '../flavor-finds/note.js';
import { sim } from '../sim.js';
export async function readItemDocument(game, id, { alive = () => true } = {}) {
  const pages = itemDocumentPages(id);
  if (!pages || !sim.inv.includes(id)) return false;
  const line = document.querySelector('#talk .line'),
    previous = line?.style.whiteSpace;
  if (line) line.style.whiteSpace = 'pre-line';
  try {
    for (const text of pages) {
      if (!alive()) return false;
      await readNote(game.ui, text);
    }
  } finally {
    if (line) line.style.whiteSpace = previous;
  }
  return true;
}
export function installItemDocuments(game) {
  const bag = document.getElementById('bagPanel');
  bag.addEventListener(
    'click',
    async (e) => {
      const button = e.target.closest('[data-read-item]');
      if (!button) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (game.busy) return;
      const id = button.dataset.readItem,
        wasHidden = bag.hidden;
      bag.hidden = true;
      try {
        await game.beat(() => readItemDocument(game, id));
      } finally {
        bag.hidden = wasHidden;
        button.focus();
      }
    },
    true,
  );
}
