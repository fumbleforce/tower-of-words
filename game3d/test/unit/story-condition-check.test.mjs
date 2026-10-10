import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('the actual story checker rejects invalid condition syntax and characters', () => {
  const story = new URL('../../story/train.js', import.meta.url).href;
  const checker = new URL('../../tools/story-check.mjs', import.meta.url).href;
  for (const [expression, diagnostic] of [['n &&', "condition doesn't parse"], ['n % 2', 'condition has odd characters']]) {
    // Mutate only the child process's module instance, leaving shared story files intact.
    const program = `
      const { default: story } = await import(${JSON.stringify(story)});
      const entry = story.on['talk:mio'][0];
      if (!entry || typeof entry.if !== 'string') throw new Error('Missing condition fixture');
      entry.if = ${JSON.stringify(expression)};
      await import(${JSON.stringify(checker)});
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', program],
      { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert(result.stdout.includes(`${diagnostic}: ${expression}`), result.stdout + result.stderr);
  }
});
