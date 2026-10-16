import test from 'node:test';
import assert from 'node:assert/strict';
import {madeByAgent, lightboxHtml} from '../web/gallery.js';

// A compose.mjs render names its owner and round; Jørgen's own render names neither.
const agentRender = () => ({id: 'r1-1', n: 3, seed: 7, w: 64, h: 64, file: '2026-10-16/r1-1.webp', thumb: '2026-10-16/r1-1.webp',
  status: 'done', positive: 'a reader by a window', negative: '', compose: {}, owner: 'claude-main/imagegen-owner-round',
  round: 'island/private/rewards/skimpy/aoi-3/round-1'});
const ownRender = () => ({id: 'ui-1', n: 4, seed: 8, w: 64, h: 64, file: '2026-10-16/ui-1.webp', thumb: '2026-10-16/ui-1.webp',
  status: 'done', positive: 'a reader by a window', negative: '', compose: {}});
const ctx = {i: 0, n: 1, pinned: false, raw: false, styleName: 'Soft', base: ''};

test('an owned render is made by an agent, and so is an agent row; Jørgen\'s own is not', () => {
  assert.equal(madeByAgent(agentRender()), true);
  assert.equal(madeByAgent({source: 'agent', owner: 'backfill'}), true);
  assert.equal(madeByAgent(ownRender()), false);
  assert.equal(madeByAgent(undefined), false);
});

test('the lightbox names the owner and round of an agent render, and Jørgen for his own', () => {
  const agent = lightboxHtml(agentRender(), ctx);
  assert.match(agent, /<span>Made by<\/span><span>claude-main\/imagegen-owner-round<\/span><span>Round<\/span>/);
  assert.match(agent, /island\/private\/rewards\/skimpy\/aoi-3\/round-1/);
  assert.doesNotMatch(agent, /Jørgen \(dashboard\)/);
  assert.match(agent, /Style<\/span>/, 'a compose render keeps its style line');
  const own = lightboxHtml(ownRender(), ctx);
  assert.match(own, /<span>Made by<\/span><span>Jørgen \(dashboard\)<\/span>/);
  assert.doesNotMatch(own, /<span>Round<\/span>/);
});
