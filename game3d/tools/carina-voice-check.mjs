// Real runtime keys and media playback, with fresh public settings on both viewport sizes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { voiceLines } from './voice-manifest.mjs';
const base = process.env.BASE || 'game3d';
const out = new URL('../shots/carina-voice-approved/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const { carina } = await voiceLines({ mcs: ['carina'] });
const words = carina.filter(e => e.key.startsWith('carina-'));
const samples = [1, 2, 3, 4, 5].map(day => carina.find(e => e.day === day && e.speaker === 'carina' && e.key.startsWith('ln-') && e.text.length > 12 && e.text.length < 85));
const pilot = process.argv.includes('--pilot');
const named = carina.find(e => e.speaker !== 'carina' && e.own && e.text.includes('Carina'));
const overheard = carina.find(e => e.own && e.overheard);
assert.ok(samples.every(Boolean));
await withBrowserJob('carina-voice-playback', async browser => {
  for (const [width, height] of [[390, 844], [1366, 860]]) {
    const opened = await openGame(browser, { mode: 'title', viewport: { width, height }, url: `http://127.0.0.1:8771/${base}/index.html?mc=carina&q=0`, beforeNavigate: async page => {
      await page.addInitScript(() => {
        globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ voiceOn: true, privateMode: false, music: 0, ambience: 0, master: 0.7, voice: 0.8 }));
        globalThis.__playedVoice = [];
        const play = globalThis.HTMLMediaElement.prototype.play;
        globalThis.HTMLMediaElement.prototype.play = function (...args) {
          const entry = { src: this.src, playing: false, ended: false, duration: null, volume: this.volume, error: null, pauses: [] };
          globalThis.__lastVoice = this;
          if (this.src.includes('/audio/')) {
            globalThis.__playedVoice.push(entry);
            this.addEventListener('playing', () => { entry.playing = true; entry.duration = this.duration; }, { once: true });
            this.addEventListener('ended', () => { entry.ended = true; }, { once: true });
            this.addEventListener('error', () => { entry.error = this.error?.message; }, { once: true });
            this.addEventListener('pause', () => { entry.pauses.push(this.currentTime); });
          }
          return play.apply(this, args);
        };
      });
    } });
    const { page } = opened;
    await page.locator('body').click({ position: { x: 3, y: 3 } });
    const records = await page.evaluate(async ({ base, entries }) => {
      const audio = await import('/' + base + '/js/audio/core.js');
      const keys = await import('/' + base + '/js/narrative/voice-keys.js');
      const mc = await import('/' + base + '/js/mc.js');
      const results = [];
      for (const entry of entries) {
        const key = entry.key.startsWith('carina-') ? 'eric-' + entry.key.slice(7) : keys.lineClip(entry.speaker === 'carina' ? 'eric' : entry.speaker, entry.text, entry.overheard);
        const before = globalThis.__playedVoice.length;
        await audio.voice(key, { muffle: entry.overheard });
        // Also observe media completion: voice() has a bounded startup/finish timeout.
        const media = globalThis.__lastVoice;
        if (!media.ended) await Promise.race([
          new Promise(resolve => media.addEventListener('ended', resolve, { once: true })),
          new Promise(resolve => setTimeout(resolve, 15000)),
        ]);
        await new Promise(resolve => setTimeout(resolve, 0));
        results.push({ expected: entry.key, input: key, played: globalThis.__playedVoice.slice(before), protagonist: mc.MC.id });
      }
      audio.stopVoice(0);
      return results;
    }, { base, entries: [...words, ...(pilot ? samples.slice(0, 1) : [...samples, named, overheard])] });
    for (const r of records) {
      assert.equal(r.protagonist, 'carina');
      assert.equal(r.played.length, 1, r.expected);
      const p = r.played[0];
      assert.ok(p.src.includes('/' + r.expected + '.mp3'), `${r.expected}: ${p.src}`);
      assert.ok(p.playing && p.ended && p.duration > 0.15 && p.volume > 0, JSON.stringify(r));
    }
    assert.deepEqual(opened.errors, []);
    fs.writeFileSync(`${out}/${width}-${pilot ? 'pilot' : 'playback'}.json`, JSON.stringify(records, null, 2));
    await opened.close();
  }
}, { timeoutMs: 285000 });
console.log('Carina runtime playback passed at phone and desktop sizes.');
