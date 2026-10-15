import test from 'node:test';
import assert from 'node:assert/strict';
import {isExternal, originalGeneration, provenanceHtml, localSettingsHtml, externalReplayNotice, providerLabel, externalSourceExplanationHtml, localOriginalPromptHtml} from '../web/provenance.js';
import {lightboxHtml, compareHtml} from '../web/gallery.js';
import {standaloneComposition} from '../../subplots/web/image-standalone.js';

const external = () => ({id: 'external-one', n: 1, source: 'agent', status: 'done', file: 'fixture.png', thumb: 'fixture.webp',
  positive: 'Exact <prompt>', seed: null, model_file: null, steps: null, cfg: null, sampler: null, scheduler: null,
  provenance: {schema: 1, kind: 'external', engine: 'image_gen.imagegen', import_id: 'fixture-one',
    requested: {prompt: 'Exact <prompt>', referenced_image_paths: ['first.png', 'second.png'], transparent_background: false},
    observed: {file: 'result.png'}, unavailable: ['seed', 'steps', 'sampler'], replay: false,
    output: {path: 'original.png', sha256: 'a'.repeat(64), width: 1200, height: 600},
    references: [{path: 'first.png', sha256: 'b'.repeat(64), width: 200, height: 300}, {path: 'second.png', sha256: 'c'.repeat(64), width: 400, height: 500}]}});

test('external original recipes round-trip through standalone composition without invented controls or mutable aliases', () => {
  const job = external(), original = originalGeneration(job, {readOnlySource: true});
  const roundtrip = JSON.parse(JSON.stringify(standaloneComposition({original})));
  assert.deepEqual(roundtrip.original.provenance, job.provenance);
  assert.deepEqual(roundtrip.original.generation, job);
  assert.equal(roundtrip.original.seed, null);
  job.provenance.requested.prompt = 'changed';
  assert.equal(original.provenance.requested.prompt, 'Exact <prompt>');
  assert.equal(original.generation.provenance.requested.prompt, 'Exact <prompt>');
});

test('both shared lightbox hosts expose external settings and exclude local replay actions', () => {
  for (const base of ['', '/api/subplots/image']) {
    const html = lightboxHtml(external(), {i: 0, n: 1, base});
    for (const text of ['Requested settings', 'Observed provider result', 'Recorded references (in order)', 'SHA-256', '1200 × 600', 'image_gen.imagegen', 'OpenAI image generator']) assert.ok(html.includes(text), text);
    for (const action of ['sameseed', 'newseeds', 'copyseed']) assert.ok(!html.includes(`data-a="${action}"`), action);
    for (const action of ['star', 'fav', 'pin', 'del']) assert.ok(html.includes(`data-a="${action}"`), action);
    assert.ok(html.indexOf('first.png') < html.indexOf('second.png'));
    assert.ok(html.includes('Exact &lt;prompt&gt;'));
    assert.ok(!html.includes('<prompt>'));
    assert.ok(!html.includes('Seed</span>'));
    assert.ok(!html.includes('Prompt strength (CFG)'));
    assert.ok(html.includes(`src="${base}/out/fixture.png"`));
  }
  assert.ok(compareHtml([external()]).includes('Requested settings'));
  assert.equal(localSettingsHtml(external()), '');
  assert.equal(provenanceHtml({}), '');
  assert.equal(isExternal({source: 'agent'}), false);
});

test('local source settings retain sampler, scheduler, zero values, version refs and tool settings', () => {
  const job = {id: 'local', seed: 0, cfg: 0, scheduler: 'karras', sampler: 'euler', steps: 20,
    presets: {style: {id: 's', v: 3}}, compose: {blockOverrides: {style: {s: {quality: 'recorded words'}}}},
    start: {image: 'source.png', denoise: 0.6}, control: {file: 'guide.bin', strength: 0.7}, loras: [{file: 'lora.bin', weight: 0.5}]};
  const original = originalGeneration(job, {start: 'original.png'});
  assert.deepEqual(original.generation, job);
  assert.equal(original.start, 'original.png');
  assert.equal(original.cfg, 0);
  assert.ok(localSettingsHtml(original.generation).includes('karras'));
  assert.ok(localSettingsHtml(original.generation).includes('&quot;v&quot;: 3'));
  job.compose.blockOverrides.style.s.quality = 'changed';
  assert.equal(original.generation.compose.blockOverrides.style.s.quality, 'recorded words');
});

test('generation timestamps distinguish tool receipts, source file times and import times', () => {
  const job = external();
  job.at = '2026-10-16T00:00:00Z';
  job.imported_at = '2026-10-16T00:01:00Z';
  job.provenance.generated_at = null;
  job.provenance.timestamp_source = 'not_recorded';
  let html = provenanceHtml(job);
  assert.ok(html.includes('Generation time</span><span class="mono" style="overflow-wrap:anywhere;min-width:0">Not recorded'));
  assert.ok(html.includes('Imported at'));
  assert.ok(html.includes(job.imported_at));
  assert.ok(!html.includes(job.at));
  job.provenance.generated_at = '2026-10-15T22:00:00Z';
  job.provenance.timestamp_source = 'source_file_mtime';
  html = provenanceHtml(job);
  assert.ok(html.includes('Source file timestamp'));
  assert.ok(html.includes('Generation time</span><span class="mono" style="overflow-wrap:anywhere;min-width:0">Not recorded'));
  assert.ok(html.includes('source_file_mtime'));
  assert.ok(html.includes('Source file modification time (source_file_mtime)'));
  job.provenance.timestamp_source = 'tool_receipt';
  html = provenanceHtml(job);
  assert.ok(html.includes('Generation time</span><span class="mono" style="overflow-wrap:anywhere;min-width:0">' + job.provenance.generated_at));
  assert.ok(!html.includes('Source file timestamp'));
});

test('external source explanation names the provider and deliberate switch without offering provider replay', () => {
  assert.ok(externalReplayNotice.includes('See Original generation settings'));
  assert.ok(!externalReplayNotice.includes('available in Settings'));
  assert.equal(providerLabel(external()), 'OpenAI image generator');
  const html = externalSourceExplanationHtml(external());
  assert.ok(html.includes('external-source-notice'));
  assert.ok(html.includes('Made with OpenAI image generator'));
  assert.ok(html.includes('original settings are read-only'));
  assert.ok(html.includes('switch to the local generator'));
  assert.ok(html.includes('queued when you press Generate'));
  assert.ok(html.includes('data-new-local-generation'));
  assert.ok(!html.includes('data-a="sameseed"'));
});

test('partial historical receipts disclose missing evidence without inventing requests or references', () => {
  const job = external();
  assert.ok(!provenanceHtml(job).includes('This historical record is incomplete'));
  job.provenance.observed.request_completeness = 'partial';
  job.provenance.references = [];
  const html = provenanceHtml(job);
  assert.ok(html.includes('This historical record is incomplete'));
  assert.ok(html.includes('Recorded references (in order)'));
  assert.ok(html.includes('No image references recorded'));
  assert.ok(!html.includes('References in request order'));
});

test('standalone original stays historical while the current prompt changes; scene loaded fields remain editable', () => {
  const original = {positive: 'Historical positive', negative: 'Historical negative', seed: 0, cfg: 0};
  const c = {original, override: {positive: 'Changed current positive', negative: 'Changed current negative'}};
  const historical = localOriginalPromptHtml(c, {readOnly: true});
  assert.ok(historical.includes('<h3>Original prompt</h3>'));
  assert.ok(historical.includes('data-recorded-prompt="positive" readonly'));
  assert.ok(historical.includes('data-recorded-prompt="negative" readonly'));
  assert.ok(historical.includes('Historical positive'));
  assert.ok(historical.includes('Historical negative'));
  assert.ok(!historical.includes('Changed current'));
  assert.ok(historical.includes('data-use-original'));
  assert.ok(historical.includes('Use original prompt'));
  const loaded = localOriginalPromptHtml(c);
  assert.ok(loaded.includes('<h3>Loaded prompt</h3>'));
  assert.ok(loaded.includes('data-original="positive"'));
  assert.ok(loaded.includes('Changed current positive'));
  assert.ok(loaded.includes('Historical positive'));
  assert.ok(loaded.includes('These fields edit the current prompt'));
  assert.deepEqual(original, {positive: 'Historical positive', negative: 'Historical negative', seed: 0, cfg: 0});
});

test('library action handlers reject synthetic external replay events before queueing or loading defaults', async () => {
  const prior = globalThis.document;
  globalThis.document = {addEventListener() {}};
  try {
    const {createLibrary} = await import('../../subplots/web/library.js');
    const notices = [], calls = [];
    const lib = createLibrary({notice: (...args) => notices.push(args), reuse: () => calls.push('reuse'),
      generate: () => calls.push('generate'), use: () => calls.push('use'), actions: {scene() {}, character() {}}});
    for (const action of ['sameseed', 'newseeds', 'reuse', 'copyseed']) lib.act(action, external());
    assert.equal(notices.length, 4);
    assert.deepEqual(calls, []);
    lib.act('use', external());
    assert.deepEqual(calls, ['use']);
    const card = lib.cardHtml(external(), 0);
    assert.ok(card.includes('View original settings'));
    assert.ok(card.includes('Create scene'));
    assert.ok(card.includes('Create character'));
    assert.ok(!card.includes('data-lib="reuse"'));
  } finally { globalThis.document = prior; }
});
