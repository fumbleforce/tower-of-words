// Real runtime keys and media playback, with fresh public settings on both viewport sizes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { voiceLines } from './voice-manifest.mjs';
const base = process.env.BASE || 'game3d';
const out = new URL('../shots/kenji-day2-voice/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const lines = await voiceLines({ mcs: ['eric', 'carina'] });
const targets = new Set(['ln-6eq1lk', 'ln-r98ztf-carina', 'ln-1le032r', 'ln-1i72sjc-carina', 'ln-15wgpbm', 'ln-p60qe1-carina', 'ln-cce3tm', 'ln-1v75la1']);
await withBrowserJob('kenji-day2-voice-playback', async browser => {
  for (const [width, height, protagonist] of [[390, 844, 'carina'], [1366, 860, 'eric']]) {
    const entries = lines[protagonist].filter(e => e.day === 2 && e.speaker === 'kenji' && targets.has(e.key));
    assert.equal(entries.length, 5);
    const forbidden = [];
    const opened = await openGame(browser, { mode: 'title', viewport: { width, height }, url: `http://127.0.0.1:8771/${base}/index.html?mc=${protagonist}&q=0`, beforeNavigate: async page => {
      await page.route('**/island/private/**', r => { forbidden.push(r.request().url()); return r.abort(); });
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
        const key = keys.lineClip(entry.speaker, entry.text, entry.overheard);
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
    }, { base, entries });
    for (const r of records) {
      assert.equal(r.protagonist, protagonist);
      assert.equal(r.played.length, 1, r.expected);
      const p = r.played[0];
      assert.ok(p.src.includes('/' + r.expected + '.mp3'), `${r.expected}: ${p.src}`);
      assert.ok(p.playing && p.ended && p.duration > 0.15 && p.volume > 0, JSON.stringify(r));
    }
    assert.deepEqual(opened.errors, []);
    assert.deepEqual(forbidden, []);
    fs.writeFileSync(`${out}/${width}-playback.json`, JSON.stringify(records, null, 2));
    await opened.close();
  }
}, { timeoutMs: 285000 });
console.log('Kenji day-two runtime playback passed for both protagonists and viewport sizes.');
