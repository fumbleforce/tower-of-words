// Overheard Japanese keeps only taught words readable (Jørgen, 2026-09-29: "honsha, head office is shown as a known
// word, along with hai, we have not learned those words"), and the Words panel explains the -te form ("it is never
// explained in the word menu what the -te ending is"). Loads the real dialogue-text.js with its audio import stubbed.
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
const { known, baseHTML, FORM_NOTE, BASE } = await import('../../js/lang.js');

const GUARD = 'はい、アマカワ{honsha}、正面ゲートです。…はい。待ちます。';
const readable = (html) => html.replace(/<span class="gx"[^>]*>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');

test('the guard line shows neither 本社 nor はい as known before they are taught', () => {
  known.clear();
  known.add('matte');
  const html = heardHTML(GUARD);
  assert.doesNotMatch(html, /jp clear/);
  assert.doesNotMatch(readable(html), /本社|はい|honsha|head office/);
});

test('a taught word in an overheard line stays sharp and glossed', () => {
  known.clear();
  known.add('matte');
  const html = heardHTML('ちょっと待って。');
  assert.match(html, /<span class="jp clear">待って<\/span> <span class="gl">\(matte, wait\)<\/span>/);
});

test('every -te word in the Words panel names its form, and the panel has a line on what -te does', () => {
  assert.match(FORM_NOTE.te, /-te/);
  for (const [id, b] of Object.entries(BASE)) if (b.form === 'te') assert.match(baseHTML(id), /-te form of/);
});
