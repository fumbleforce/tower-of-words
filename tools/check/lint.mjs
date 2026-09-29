import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { parse } from 'espree';
import { sourceFiles } from './source-files.mjs';
import { visitSource } from '../lib/source-data.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

// A baseline occurrence includes its surrounding tokens, not a line number.
// Whitespace changes do not retire debt or authorize a different unused binding.
export function diagnosticContext(source, message, sourceType = 'module') {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType, tokens: true, loc: true });
  const tokens = ast.tokens;
  const index = tokens.findIndex(token => token.loc.start.line === message.line
    && token.loc.start.column === message.column - 1);
  assert(index >= 0, 'Lint finding has no corresponding source token');
  const context = tokens.slice(Math.max(0, index - 5), index + 6)
    .map(token => [token.type, token.type === 'String'
      ? parse(token.value, { ecmaVersion: 'latest' }).body[0].expression.value : token.value]);
  let scopes = [];
  visitSource(ast, (node, ancestors) => {
    if (node.type !== 'Identifier' || typeof node.name !== 'string' || node.loc.start.line !== message.line
      || node.loc.start.column !== message.column - 1) return;
    scopes = ancestors.flatMap((ancestor, index) => {
      if (!/^(Function|Class|ArrowFunction)/.test(ancestor.type)) return [];
      const parent = ancestors[index - 1];
      return [[ancestor.type, ancestor.id?.name || parent?.id?.name
        || parent?.key?.name || parent?.key?.value || '<anonymous>']];
    });
  });
  return createHash('sha256').update(JSON.stringify({ scopes, context })).digest('hex');
}

const key = entry => JSON.stringify([entry.file, entry.ruleId, entry.message, entry.context]);
export function compareLint(findings, baseline) {
  const allowed = new Map();
  assert(baseline.owner && baseline.review, 'Lint inventory needs an owner and review reference');
  for (const entry of baseline.entries) {
    assert.equal(entry.ruleId, 'no-unused-vars', 'Only existing unused bindings may be baselined');
    const id = key(entry);
    allowed.set(id, (allowed.get(id) || 0) + 1);
  }
  const failures = [];
  for (const finding of findings) {
    const id = key(finding);
    if (allowed.get(id)) allowed.set(id, allowed.get(id) - 1);
    else failures.push(`${finding.file}:${finding.line}:${finding.column}: ${finding.message}`);
  }
  for (const [id, count] of allowed) if (count)
    failures.push(`Remove resolved or changed lint debt from the inventory: ${id} (${count})`);
  return failures;
}

export async function lintInventory(files) {
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(files);
  const findings = [];
  for (const result of results) {
    const file = path.relative(root, result.filePath).split(path.sep).join('/');
    const source = fs.readFileSync(result.filePath, 'utf8');
    const config = await eslint.calculateConfigForFile(result.filePath);
    for (const message of result.messages) findings.push({ file, ruleId: message.ruleId,
      message: message.message, line: message.line, column: message.column,
      context: message.ruleId === 'no-unused-vars'
        ? diagnosticContext(source, message, config.languageOptions.sourceType) : null });
  }
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = sourceFiles(root, ['game3d', 'tools', 'bible'])
    .filter(file => !file.split('/').includes('shots'));
  files.push(...fs.readdirSync(root).filter(file => /\.[cm]?js$/.test(file)));
  const findings = await lintInventory(files);
  if (process.argv.includes('--inventory')) console.log(JSON.stringify(findings, null, 2));
  else {
    const baseline = JSON.parse(fs.readFileSync(new URL('./lint-baseline.json', import.meta.url), 'utf8'));
    const failures = compareLint(findings, baseline);
    assert(!failures.length, failures.join('\n'));
    console.log(`lint: ${files.length} files; ${findings.length} inventoried unused bindings; no new findings`);
  }
}
