import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDocBudgets, expandPattern, fileFindings } from '../../../tools/check/doc-budgets.mjs';

const text = value => Buffer.from(value, 'utf8');

test('a file over its ceiling is named with its size and limit, and the fix is to cut it', () => {
  const [finding] = fileFindings('CLAUDE.md', text('a'.repeat(3001)), 3000);
  assert.equal(finding, 'CLAUDE.md is 3001 bytes, over its 3000-byte limit; cut it or move detail into a linked doc; '
    + 'do not raise the limit');
  assert.deepEqual(fileFindings('CLAUDE.md', text('a'.repeat(3000)), 3000), []);
});

test('ceilings count bytes, so Japanese text weighs three bytes a character', () => {
  assert.equal(fileFindings('AGENTS.md', text('あ'.repeat(33)), 100).length, 0);
  assert.equal(fileFindings('AGENTS.md', text('あ'.repeat(34)), 100).length, 1);
});

test('agent and skill files carry no dated provenance from Jørgen', () => {
  assert.deepEqual(fileFindings('.claude/agents/builder.md', text('intro\n(Jørgen, 2026-09-29) said no\n'), 4500), [
    '.claude/agents/builder.md:2: dated provenance "Jørgen, 2026-09-29"; state the rule; history lives in git',
  ]);
  assert.equal(fileFindings('.codex/agents/builder.toml', text('Jørgen 2026-10-01: no\n'), 4500).length, 1);
  const prompts = 'Jørgen approves every asset. Reviewed 2026-10-01.\n';
  assert.deepEqual(fileFindings('art/PROMPTS.md', text(prompts), 13000), []);
});

test('GUIDE.md carries no date at all, and one line gives one finding', () => {
  assert.deepEqual(fileFindings('GUIDE.md', text('# Guide\n- Rule one.\n- Rule two (2026-10-01).\n'), 20000), [
    'GUIDE.md:3: date "2026-10-01"; state the rule; history lives in git',
  ]);
  assert.equal(fileFindings('GUIDE.md', text('Jørgen 2026-10-01: rule\n'), 20000).length, 1);
});

test('patterns cover the files they name, and a pattern that names nothing is reported', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-budgets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, body) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), body);
  };
  write('GUIDE.md', 'short\n');
  write('.claude/agents/a.md', 'ok\n');
  write('.claude/agents/b.md', 'x'.repeat(51));
  write('.claude/agents/c.txt', 'not budgeted\n'.repeat(100));
  write('.claude/skills/one/SKILL.md', 'ok\n');
  write('.claude/skills/one/reference.md', 'not budgeted\n'.repeat(1000));
  write('.claude/skills/two/notes.md', 'not a skill file\n');
  assert.deepEqual(expandPattern(root, '.claude/skills/*/SKILL.md'), ['.claude/skills/one/SKILL.md']);
  const budgets = { unit: 'bytes', limits: {
    'GUIDE.md': 100,
    '.claude/agents/*.md': 50,
    '.claude/skills/*/SKILL.md': 50,
    'notes/MISSING.md': 100,
    '.codex/agents/*.toml': 50,
  } };
  const { findings, checked } = checkDocBudgets(root, budgets);
  assert.equal(checked, 4);
  assert.equal(findings.length, 3);
  assert.match(findings.join('\n'), /notes\/MISSING\.md matches no file; remove its ceiling/);
  assert.match(findings.join('\n'), /\.codex\/agents\/\*\.toml matches no file; remove its ceiling/);
  assert.match(findings.join('\n'), /^\.claude\/agents\/b\.md is 51 bytes, over its 50-byte limit/m);
  assert.throws(() => checkDocBudgets(root, { limits: { 'GUIDE.md': 0 } }), /positive whole number of bytes/);
});
