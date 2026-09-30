// Names are never garbled in overheard Japanese (Jørgen, 2026-09-30, office_in: "I think he says his name is Mori,
// his name should not be obscured"). Loads the real dialogue-text.js with its audio import stubbed.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith('/js/ui/dialogue-text.js') && specifier === '../audio/core.js')
      return { url: 'data:text/javascript,export const paused = false;', shortCircuit: true };
    return next(specifier, context);
  },
});
const { heardHTML } = await import('../../js/ui/dialogue-text.js');
const { known, NAMES, nameAt } = await import('../../js/lang.js');
const readable = (html) => html.replace(/<span class="gx"[^>]*>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');

test("Mori's introduction shows his name with its romaji before anything is taught", () => {
  known.clear();
  const html = heardHTML('{ohayo}。森と申します。ITサポートへ、ようこそ。', ['IT']);
  assert.match(html, /<span class="plain name">森<\/span> <span class="gl">\(Mori\)<\/span>/);
});

test('an honorific after a name stays with it', () => {
  known.clear();
  assert.match(readable(heardHTML('浜田さん！かばん、頭の上！')), /浜田さん \(Hamada-san\)/);
  assert.match(readable(heardHTML('森さん、新しい人、どうですか。')), /森さん \(Mori-san\)/);
});

test('every name in NAMES is readable in a line, and only as a whole word', () => {
  known.clear();
  for (const n of NAMES) assert.match(readable(heardHTML(`あ、${n.ja}。`)), new RegExp(`${n.ja} \\(${n.en}\\)`));
  assert.equal(nameAt('森林', 0), null);
  assert.equal(nameAt('キレイ', 1), null);
});
