import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { parseSource } from '../lib/source-data.mjs';
import { sourceFiles } from './source-files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const formatOptions = { parser: 'babel', printWidth: 120, singleQuote: true,
  quoteProps: 'preserve', embeddedLanguageFormatting: 'off' };

function syntax(value) {
  if (typeof value === 'bigint') return { bigint: String(value) };
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(syntax);
  // Associative short-circuit chains retain the exact left-to-right operands.
  // Prettier removes redundant parentheses from a || (b || c).
  if (value.type === 'LogicalExpression') {
    const operands = node => node.type === 'LogicalExpression' && node.operator === value.operator
      ? [...operands(node.left), ...operands(node.right)] : [syntax(node)];
    return { type: value.type, operator: value.operator, operands: operands(value) };
  }
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['start', 'end', 'range', 'loc', 'comments'].includes(key)
      && !(value.type === 'Literal' && key === 'raw'))
    .map(([key, child]) => [key, syntax(child)]));
}

export function assertSameSyntax(before, after, file = 'source') {
  assert.deepEqual(syntax(parseSource(before)), syntax(parseSource(after)),
    `${file}: formatting changed syntax, string values or template text`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || '--check';
  assert(['--check', '--preflight', '--write'].includes(mode), 'Use --check, --preflight or --write');
  const files = sourceFiles(root, ['game3d/js'])
    .filter(file => !['game3d/js/bonds/test.mjs', 'game3d/js/bonds/day1-check.mjs'].includes(file));
  const changes = [];
  for (const file of files) {
    const before = fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
    const after = await prettier.format(before, formatOptions);
    assertSameSyntax(before, after, file);
    if (after !== before) changes.push({ file, after });
  }
  // Finish all syntax checks before any write; a failure leaves the tree intact.
  if (mode === '--write') for (const { file, after } of changes)
    fs.writeFileSync(new URL('../../' + file, import.meta.url), after);
  console.log(`runtime format: ${files.length} files verified; ${changes.length} ${mode === '--write' ? 'formatted' : 'need formatting'}`);
  if (mode === '--check' && changes.length) process.exitCode = 1;
}
