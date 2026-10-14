// Voice capture through mountVoice's real DOM events, audio buffers and browser resampler.
// The worker is a transcript stub: this tests what reaches ASR, not recognition accuracy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob, gpuWaitOptions } from '../../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../../tools/bible/check-scope.mjs';
import { publicResearchContext } from '../../test/support/research-integration-evidence.mjs';
const base = (process.env.BASE || 'game3d').replace(/^\/+|\/+$/g, '');
const origin = `http://127.0.0.1:${process.env.PORT || 8771}`;
const output = path.resolve(process.env.OUT || 'game3d/shots/speech-capture', `${Date.now()}-${process.pid}`);
fs.mkdirSync(output, { recursive: true });
await withBrowserJob('speech-capture-regression', async browser => {
  for (const viewport of [{ width: 1366, height: 860 }, { width: 390, height: 844 }]) {
    const errors = [];
    const context = await publicResearchContext(browser, viewport, errors);
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/speech-regression.html', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/${base}/css/style.css"><style>body{background:#141820}</style><div id="talk" class="typing"><div class="tp"><div class="tp-word"><div class="tp-jp">待って</div><div class="tp-ro">${[...'matte'].map(c => `<span class="lt">${c}</span>`).join('')}</div><div class="tp-en">wait</div></div><div class="tp-ans"><input class="tp-in" placeholder="Type it in romaji or say it"><div class="tp-hint"></div><button class="tp-cancel">Never mind</button></div></div></div>` }));
      await page.goto(`${origin}/${base}/speech-regression.html`);
      const result = await page.evaluate(async ({ base, phone }) => {
        window.__FULL__ = false;
        window.__settings = { voiceInput: 'device', voiceModel: 'moon' };
        document.body.classList.toggle('phone', phone);
        let clock = 100, nextRaf = 0;
        const rafs = new Map();
        Object.defineProperty(performance, 'now', { value: () => clock });
        window.requestAnimationFrame = fn => { rafs.set(++nextRaf, fn); return nextRaf; };
        window.cancelAnimationFrame = id => rafs.delete(id);
        const tick = (ms = 34) => { clock += ms; const callbacks = [...rafs.values()]; rafs.clear(); callbacks.forEach(fn => fn(clock)); };
        const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
        const runs = [];
        let stops = 0, closed = 0, current, level = 0;
        Object.defineProperty(navigator.permissions, 'query', { value: async () => ({ state: 'prompt' }) });
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => ({ getTracks: () => [{ stop: () => stops++ }] }) });
        class MicContext {
          sampleRate = 48000; state = 'running'; destination = {};
          constructor() { current = this; }
          createMediaStreamSource() { return { connect() {} }; }
          createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: samples => samples.fill(level) }; }
          createScriptProcessor() { return this.proc = { connect() {} }; }
          createGain() { return { gain: {}, connect() {} }; }
          close() { closed++; }
        }
        window.AudioContext = MicContext;
        window.Worker = class {
          postMessage(data) {
            if (data.type === 'load') queueMicrotask(() => this.onmessage({ data: { type: 'ready', device: 'wasm', ms: 0 } }));
            else {
              runs.push([...data.samples]);
              queueMicrotask(() => this.onmessage({ data: { type: 'text', id: data.id, text: 'まって', ms: 0 } }));
            }
          }
        };
        const speech = await import(`/${base}/js/speech.js`);
        const capture = await import(`/${base}/js/speech-capture.js`);
        await speech.loadRecogniser();
        const host = document.querySelector('.tp');
        let cleanup, hits = 0;
        const mount = () => { cleanup = speech.mountVoice(host, 'matte', { phone, ja: '待って', onHit: () => hits++ }); };
        const feed = (seconds, amplitude) => {
          const samples = Float32Array.from({ length: Math.round(seconds * 48000) }, (_, i) => amplitude * Math.sin(2 * Math.PI * 200 * i / 48000));
          level = amplitude / Math.sqrt(2);
          current.proc.onaudioprocess({ inputBuffer: { getChannelData: () => samples } });
        };
        const press = async (key = false) => {
          clock += 100;
          if (key) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }));
          else host.querySelector('.vc-mic').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          await settle();
        };
        const release = (key = false) => {
          if (key) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyV' }));
          else host.querySelector('.vc-mic').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        };
        const state = () => host.querySelector('.vc')?.dataset.state;
        const waitState = async expected => { const until = Date.now() + 5000; while (state() !== expected && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 5)); if (state() !== expected) throw new Error(`Expected ${expected}, got ${state()}`); };
        // Quiet ending after a loud syllable, plus the audio block still pending when released.
        mount(); await capture.openMic(); feed(.3, 0);
        await press(!phone); feed(.6, .02); tick(600); feed(.74, .0018); tick(740);
        release(!phone);
        if (runs.length) throw new Error('Transcribed before draining pending audio');
        feed(.06, .0018); await waitState('hit');
        const first = runs[0], length = first.length;
        const tail = Math.sqrt(first.slice(-900).reduce((sum, v) => sum + v * v, 0) / 900);
        await new Promise(resolve => setTimeout(resolve, 540));
        const firstHits = hits;
        cleanup();
        // Cold first permission with loud steady noise: no known room floor.
        mount(); await press(); feed(1, .02); tick(1000); release(); feed(.085, .02);
        await waitState('miss'); const noiseRuns = runs.length; cleanup();
        // A short soft word with a known quiet room and no gaps inside the word.
        mount(); await capture.openMic(); feed(.3, 0); await press(); feed(.12, .0008); tick(300); release(); feed(.085, 0);
        await waitState('hit'); const shortRuns = runs.length; cleanup();
        // Tap endpoint at 30 FPS: soft voice lasts beyond the old loudness bar and 0.9s timer.
        mount(); await capture.openMic(); feed(.3, 0); await press(); tick(34); release();
        for (let i = 0; i < 36; i++) { feed(.034, .0008); tick(); }
        const duringSoft = state();
        for (let i = 0; i < 30; i++) { feed(.034, 0); tick(); await settle(); }
        feed(.085, 0); await waitState('hit'); const tapRuns = runs.length;
        cleanup();
        const shortTaps = [];
        for (const gapped of [false, true]) {
          mount(); await capture.openMic(); feed(.3, 0); await press(); tick(10); release();
          if (gapped) { feed(.04, .0008); feed(.02, 0); feed(.04, .0008); }
          else feed(.08, .0008);
          // Voice can fall entirely between animation frames. Endpointing uses audio duration.
          feed(.02, 0); tick(100);
          for (let i = 0; i < 30; i++) { feed(.034, 0); tick(); await settle(); }
          feed(.085, 0); await waitState('hit'); shortTaps.push(state()); cleanup();
        }
        // A late audio block after unmount must never complete a word in the next prompt.
        mount(); await capture.openMic(); feed(.3, 0); await press(); feed(.2, .02); tick(400); release();
        const old = current; cleanup(); mount(); await capture.openMic();
        old.proc.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(4096).fill(.02) } });
        await new Promise(resolve => setTimeout(resolve, 300));
        const cancelledRuns = runs.length; cleanup();
        // Browser recognition can finish before the audio callback: retry waits for the drain.
        window.__settings.voiceInput = 'browser';
        let browserStops = 0;
        window.SpeechRecognition = class {
          start() {}
          stop() { browserStops++; queueMicrotask(() => { this.onresult({ resultIndex: 0, results: [{ 0: { transcript: 'nope' }, length: 1, isFinal: true }] }); this.onend(); }); }
        };
        mount(); await capture.openMic(); feed(.3, 0); await press(); feed(.2, .0008); tick(400); release(); await settle();
        const browserPending = state();
        await press();
        feed(.085, 0); await waitState('miss');
        await press(); feed(.2, .0008); tick(400); const browserRetry = state(); release(); feed(.085, 0); await waitState('miss');
        cleanup();
        window.__settings.voiceInput = 'device';
        mount(); await capture.openMic(); feed(.3, 0); await press(); feed(.2, .0008); tick(400);
        window.__captureFinish = async () => { release(); feed(.085, 0); await waitState('hit'); };
        window.__captureCleanup = cleanup;
        return { length, tail, firstHits, noiseRuns, shortRuns, duringSoft, tapRuns, cancelledRuns, shortTaps, browserPending, browserRetry, browserStops, stops, closed };
      }, { base, phone: viewport.width < 700 });
      assert.equal(result.length, 27200, 'the complete 1.7s clip reached ASR at 16kHz');
      assert.ok(result.tail > .001, 'soft trailing syllable survived the pending input block');
      assert.equal(result.firstHits, 1);
      assert.equal(result.noiseRuns, 1, 'cold loud noise never reached the worker');
      assert.equal(result.shortRuns, 2);
      assert.equal(result.duringSoft, 'listening');
      assert.equal(result.tapRuns, 3);
      assert.equal(result.cancelledRuns, 5);
      assert.deepEqual(result.shortTaps, ['hit', 'hit']);
      assert.equal(result.browserPending, 'thinking');
      assert.equal(result.browserRetry, 'listening');
      assert.equal(result.browserStops, 2);
      assert.equal(result.stops, result.closed);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, `${viewport.width}-listening.png`) });
      await page.evaluate(() => window.__captureFinish());
      await page.screenshot({ path: path.join(output, `${viewport.width}-hit.png`) });
      fs.writeFileSync(path.join(output, `${viewport.width}-capture.json`), JSON.stringify(result, null, 2));
      await page.evaluate(() => window.__captureCleanup());
      console.log(`PASS mountVoice ${viewport.width}x${viewport.height}: ${JSON.stringify(result)}`);
    } finally { await context.close(); }
  }
  const context = await publicResearchContext(browser, { width: 1366, height: 860 });
  try {
    const page = await context.newPage();
    await page.route('**/speech-regression.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div class="tp"><input class="tp-in"></div>' }));
    await page.goto(`${origin}/${base}/speech-regression.html`);
    const realCapture = await page.evaluate(async base => {
      window.__FULL__ = false;
      window.__settings = { voiceInput: 'device', voiceModel: 'moon' };
      const AudioContextClass = window.AudioContext;
      const sourceContext = new AudioContextClass({ sampleRate: 48000 });
      await sourceContext.resume();
      const oscillator = sourceContext.createOscillator(), gain = sourceContext.createGain(), destination = sourceContext.createMediaStreamDestination();
      oscillator.frequency.value = 200;
      gain.gain.value = 0;
      oscillator.connect(gain); gain.connect(destination); oscillator.start();
      Object.defineProperty(navigator.permissions, 'query', { value: async () => ({ state: 'prompt' }) });
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => destination.stream });
      let samples;
      window.Worker = class {
        postMessage(data) {
          if (data.type === 'load') queueMicrotask(() => this.onmessage({ data: { type: 'ready', device: 'wasm', ms: 0 } }));
          else { samples = data.samples; queueMicrotask(() => this.onmessage({ data: { type: 'text', id: data.id, text: 'まって', ms: 0 } })); }
        }
      };
      const speech = await import(`/${base}/js/speech.js`), capture = await import(`/${base}/js/speech-capture.js`);
      await speech.loadRecogniser();
      const cleanup = speech.mountVoice(document.querySelector('.tp'), 'matte');
      try {
        await capture.openMic();
        await new Promise(resolve => setTimeout(resolve, 450));
        document.querySelector('.vc-mic').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        const start = sourceContext.currentTime;
        gain.gain.setValueAtTime(.02, start); gain.gain.setValueAtTime(.0008, start + .4); gain.gain.setValueAtTime(0, start + 1.2);
        await new Promise(resolve => setTimeout(resolve, 1200));
        document.querySelector('.vc-mic').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        const until = Date.now() + 5000;
        while (!samples && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
        if (!samples) throw new Error('Real WebAudio capture did not reach the worker');
        let lastVoice = 0, peak = 0;
        for (let i = 0; i < samples.length; i++) { if (Math.abs(samples[i]) > .0004) lastVoice = i; peak = Math.max(peak, Math.abs(samples[i])); }
        return { seconds: samples.length / 16000, lastVoice: lastVoice / 16000, peak, rate: sourceContext.sampleRate };
      } finally { cleanup(); oscillator.stop(); await sourceContext.close(); }
    }, base);
    assert.ok(realCapture.seconds > 1.4 && realCapture.seconds < 2, JSON.stringify(realCapture));
    assert.ok(realCapture.lastVoice > 1.4, 'real processor retained soft voice through release');
    assert.equal(realCapture.rate, 48000);
    console.log(`PASS real MediaStream -> ScriptProcessor ->16kHz: ${JSON.stringify(realCapture)}`);
  } finally { await context.close(); }
  const asrContext = await publicResearchContext(browser, { width: 1366, height: 860 });
  // Model downloads redirect within the public Hugging Face CDN. Validate every hop;
  // all local requests still use the protected-source guard above.
  await asrContext.route(/^https:\/\/(?:huggingface\.co|[^/]+\.hf\.co)\//, async route => {
    let target = route.request().url();
    for (let hop = 0; hop < 6; hop++) {
      const url = new URL(target);
      if (url.protocol !== 'https:' || !(url.hostname === 'huggingface.co' || url.hostname.endsWith('.hf.co')) || blockedSource(target, true))
        throw new Error('Model redirect left the public model hosts');
      const response = await route.fetch({ url: target, maxRedirects: 0, timeout: 60000 });
      if (response.status() >= 300 && response.status() < 400) { target = new URL(response.headers().location, target).href; continue; }
      return route.fulfill({ response });
    }
    throw new Error('Too many model redirects');
  });
  try {
    const page = await asrContext.newPage();
    await page.route('**/speech-regression.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
    await page.goto(`${origin}/${base}/speech-regression.html`);
    const cases = await page.evaluate(async base => {
      window.__FULL__ = false;
      window.__settings = { voiceInput: 'device', voiceModel: 'base' };
      const speech = await import(`/${base}/js/speech.js`);
      await speech.loadRecogniser({ model: 'base', device: 'wasm' });
      const results = [];
      for (const id of ['kite', 'matte']) {
        const raw = await speech.toMono16k(await (await fetch(`/${base}/audio/word-${id}.mp3`)).arrayBuffer());
        for (const scale of [1, .003]) {
          const samples = new Float32Array(raw.length + 9600);
          samples.set(raw.map(v => v * scale), 4800);
          const result = await speech.judge(samples, id, undefined, 0);
          results.push({ id, scale, hit: result.hit, text: result.text, by: result.by, ms: result.ms });
        }
      }
      const noise = Float32Array.from({ length: 16000 }, (_, i) => .03 * Math.sin(2 * Math.PI * 200 * i / 16000));
      results.push({ id: 'noise', ...(await speech.judge(noise, 'matte')) });
      results.push({ id: 'silence', ...(await speech.judge(new Float32Array(16000), 'matte', undefined, 0)) });
      return results;
    }, base);
    for (const result of cases) {
      if (['noise', 'silence'].includes(result.id)) { assert.equal(result.hit, false); assert.equal(result.reason, 'quiet'); }
      else assert.equal(result.hit, true, JSON.stringify(result));
    }
    fs.writeFileSync(path.join(output, 'asr.json'), JSON.stringify(cases, null, 2));
    console.log(`PASS real Whisper base (WASM): ${JSON.stringify(cases)}`);
  } finally { await asrContext.close(); }

}, gpuWaitOptions(900, 180000));
console.log(`artifacts: ${output}`);
