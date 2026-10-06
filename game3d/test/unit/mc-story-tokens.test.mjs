import test from 'node:test';
import assert from 'node:assert/strict';
import { expandMc, PROTAGONISTS } from '../../js/mc.js';
import train from '../../story/train.js';
import office from '../../story/office.js';
import courtyard from '../../story/dorm_court.js';
import { storySets, voiceLines } from '../../tools/voice-manifest.mjs';

const forMc = (story, id) => expandMc(structuredClone(story), PROTAGONISTS[id]);
function strings(value) {
  if (typeof value === 'string') return [value];
  return value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
}

test('Carina introduces herself by name and keeps the saved train reply node', () => {
  const c = forMc(train, 'carina'), e = forMc(train, 'eric');
  const choice = c.nodes.sit.find(step => step.choice).choice[0];
  assert.equal(choice.text, '“I\'m Carina.”');
  assert.equal(choice.go, 'its_eric');
  assert.deepEqual(c.nodes[choice.go], e.nodes.its_eric);
  const description = c.nodes.sit.find(step => step.text?.includes('ten years')).text;
  assert.ok(description.includes('“the new girl”. Only, you stay new girl'));
  assert.equal(e.nodes.sit.find(step => step.choice).choice[0].text, '“I\'m Eric.”');
});

test('colleagues, paper labels and the mailbox use the chosen protagonist', () => {
  const c = forMc(office, 'carina'), e = forMc(office, 'eric');
  assert.ok(c.nodes.kenji_first.some(step => step.text?.startsWith('Carina-san?')));
  assert.ok(c.nodes.emi_drops_in.some(step => step.text?.startsWith('You must be Carina.')));
  assert.ok(strings(c.nodes.ending).includes("Okay, I'm going home. Um... Carina?"));
  for (const node of ['lunch_end', 'end_ticket', 'desk_look', 'inout_board']) {
    assert.ok(strings(c.nodes[node]).some(text => text.includes('CARINA')), node);
    assert.ok(strings(e.nodes[node]).some(text => text.includes('ERIC')), node);
  }
  assert.equal(forMc(courtyard, 'carina').nodes.mailboxes[1], '> カリーナ · karīna · Carina');
  assert.equal(forMc(courtyard, 'eric').nodes.mailboxes[1], '> エリック · erikku · Eric');
});

test('public day 1–5 scene text contains no Eric identity when Carina plays', async () => {
  for (const { day, files } of storySets()) for (const { name, load } of files) {
    if (!load) continue;
    const story = forMc(await load(), 'carina');
    for (const text of strings(story.nodes)) {
      // Actor ids and voice keys remain stable; this check targets visible identity text.
      if (text === 'eric' || text.startsWith('eric-')) continue;
      assert.doesNotMatch(text, /\bEric\b|エリック|\berikku\b|\bnew guy\b/i, `${day}:${name}: ${text}`);
      assert.ok(!text.includes('{mc.'), `${day}:${name}: ${text}`);
    }
  }
});

test('newly personalized lines have Carina keys and retain their original NPC speakers', async () => {
  const { carina } = await voiceLines();
  const expected = {
    'ln-yzzqmx-carina': 'mio', 'ln-2o5x1j-carina': 'kenji',
    'ln-754za5-carina': 'emi', 'ln-bv1y2f-carina': 'mio',
    'ln-r98ztf-carina': 'kenji', 'ln-1i72sjc-carina': 'kenji',
    'oh-18g7z40-carina': 'mori', 'ln-p60qe1-carina': 'kenji',
  };
  for (const [key, speaker] of Object.entries(expected)) {
    const entry = carina.find(line => line.key === key);
    assert.equal(entry?.speaker, speaker, key);
    assert.equal(entry.own, true, key);
  }
});
