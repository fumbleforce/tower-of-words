import assert from 'node:assert/strict';
import { test } from 'node:test';
import prettier from 'prettier';
import { assertSameSyntax, formatOptions } from '../../../tools/check/format-runtime.mjs';

test('format proof permits spelling changes while retaining literals and short-circuit order', async () => {
  const source = "const f=(a,b,c)=>a||(b||c); const text='日本語'; const shader=`a\n  b`; const n=10n;";
  assert.doesNotThrow(() => assertSameSyntax(source, "const f = (a,b,c) => (a||b)||c; const text=\"日本語\"; const shader=`a\n  b`; const n=10n;"));
  const awaitResult = await prettier.format(source, formatOptions);
  assert.doesNotThrow(() => assertSameSyntax(source, awaitResult));
});

test('format proof rejects changed operands, string values, template whitespace and operators', () => {
  for (const [before, after] of [
    ['a || (b || c);', 'a || (c || b);'], ['a || b;', 'a && b;'],
    ["const s='mio';", "const s='emi';"], ['const s=`a  b`;', 'const s=`a b`;'],
    ['const n=10n;', 'const n=11n;'], ['const n=1+2;', 'const n=2+1;'],
  ]) assert.throws(() => assertSameSyntax(before, after), /formatting changed/);
});
