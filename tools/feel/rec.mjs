// Record what the game actually outputs (Web Audio master) for N seconds: node rec.mjs <out.webm> <place> <secs> [events json]
// events: [[t, "js expression"], ...] run in the page at t seconds after the first tap.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out, place, secs, ev = '[]', extra = ''] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await p.addInitScript(() => {
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst, ...a) {
    const r = orig.call(this, dst, ...a);
    if (dst instanceof AudioDestinationNode) {
      const c = dst.context;
      if (!c.__rec) { c.__rec = c.createMediaStreamDestination(); const mr = new MediaRecorder(c.__rec.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 }); const chunks = []; mr.ondataavailable = (e) => chunks.push(e.data); window.__recStop = () => new Promise((ok) => { mr.onstop = async () => { const bl = new Blob(chunks); const buf = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768)); ok(btoa(s)); }; mr.stop(); }); mr.start(250); }
      orig.call(this, c.__rec);
    }
    return r;
  };
  // <audio> voice clips: route through Web Audio too so they're recorded
  const P = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { try { if (!this.__routed && window.__game) { const c = window.__sfxCtx; if (c) { const s = c.createMediaElementSource(this); s.connect(c.destination); this.__routed = true; } } } catch (e) { } return P.call(this); };
});
await p.goto(`http://127.0.0.1:8779/game3d/index.html?q=0&skip&place=${place}${extra}`);
await p.waitForFunction(() => window.__game && window.__game.place, null, { timeout: 90000 });
await p.mouse.click(500, 650);
await p.evaluate(async () => { const m = await import('./js/sfx.js'); window.__sfxCtx = m.ctx(); });
const t0 = Date.now();
const events = JSON.parse(ev);
for (const [t, js] of events) { const w = t * 1000 - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.evaluate(js).catch((e) => errs.push('ev: ' + e.message)); }
const w = +secs * 1000 - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w);
const b64 = await p.evaluate(() => window.__recStop ? window.__recStop() : null);
if (b64) fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(errs.length ? 'ERR ' + errs.slice(0, 5).join(' | ') : 'ok', b64 ? 'recorded' : 'no audio graph');
await b.close();
