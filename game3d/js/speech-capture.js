import { frameRms, speechThreshold, voicedDuration, SPEECH_SECONDS } from './speech-signal.js';
// Opened on the first press (that's when the browser asks). Once allowed, a prompt with the mic row opens it as the
// prompt comes up, so the browser's gain control has settled and nothing of the first word is lost to the mic
// starting. It's closed when the prompt goes, so the browser's recording light is on only then.

let mic = null,
  micOpening = null,
  micGen = 0; // mic: { stream, ctx, src, an, proc, chunks, pre, floor, rate, on }
const PRE_S = 0.35; // audio kept from just before the press: people start talking as they press
export function openMic() {
  if (mic) return Promise.resolve(mic);
  if (micOpening) return micOpening;
  const my = micGen;
  micOpening = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    if (my !== micGen) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('mic closed while opening');
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream),
      an = ctx.createAnalyser();
    an.fftSize = 1024;
    const proc = ctx.createScriptProcessor(4096, 1, 1),
      sink = ctx.createGain();
    sink.gain.value = 0;
    const m = {
      stream,
      ctx,
      src,
      an,
      proc,
      chunks: [],
      pre: [],
      hist: [],
      floor: undefined,
      recordingFloor: undefined,
      voiced: 0,
      finish: null,
      draining: null,
      rate: ctx.sampleRate,
      on: false,
    };
    proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0).slice();
      const dt = d.length / m.rate;
      if (m.on) {
        m.chunks.push(d);
        m.voiced += voicedDuration(d, m.rate, m.recordingFloor);
        // ScriptProcessor delivers a whole block at once. Retain the block pending at release.
        m.finish?.();
      } else {
        m.hist.push(...frameRms(d, Math.floor(m.rate * 0.02)));
        while (m.hist.length * 0.02 > 2) m.hist.shift();
        m.floor = Math.min(...m.hist);
        m.pre.push(d);
        while (m.pre.length > 1 && (m.pre.length - 1) * dt >= PRE_S) m.pre.shift();
      }
    };
    src.connect(an);
    src.connect(proc);
    proc.connect(sink);
    sink.connect(ctx.destination);
    mic = m;
    return m;
  })().finally(() => {
    micOpening = null;
  });
  return micOpening;
}
export function closeMic() {
  micGen++;
  if (!mic) return;
  mic.finish?.();
  mic.on = false;
  try {
    mic.stream.getTracks().forEach((t) => t.stop());
    mic.ctx.close();
  } catch {
    /* already gone */
  }
  mic = null;
}
export const micGranted = async () => {
  try {
    return (await navigator.permissions.query({ name: 'microphone' })).state === 'granted';
  } catch {
    return false;
  }
};
// The meter starts moving at the same threshold used for endpointing and recognition.
export function micRead() {
  if (!mic) return { lv: 0, talk: false, heardSpeech: false };
  const a = new Float32Array(mic.an.fftSize);
  mic.an.getFloatTimeDomainData(a);
  const r = frameRms(a, a.length)[0],
    threshold = speechThreshold(mic.on ? mic.recordingFloor : mic.floor);
  return {
    lv: Math.max(0, Math.min(1, (20 * Math.log10(r / threshold)) / 24)),
    talk: r > threshold,
    heardSpeech: mic.voiced >= SPEECH_SECONDS - 1e-8,
  };
}
export function startMic() {
  if (!mic) return null;
  mic.finish?.();
  mic.chunks = mic.pre.splice(0);
  mic.recordingFloor = mic.floor;
  mic.voiced = mic.chunks.reduce((seconds, d) => seconds + voicedDuration(d, mic.rate, mic.recordingFloor), 0);
  mic.draining = null;
  mic.on = true;
  return mic;
}
export function stopMic(m = mic) {
  if (!m?.on) return Promise.resolve();
  if (m.draining) return m.draining;
  m.draining = new Promise((resolve) => {
    const timer = setTimeout(() => m.finish?.(), 250);
    m.finish = () => {
      clearTimeout(timer);
      m.on = false;
      m.finish = null;
      resolve();
    };
  });
  return m.draining;
}
export async function micSamples16k(m = mic) {
  if (!m) return new Float32Array();
  await m.draining;
  const n = m.chunks.reduce((a, c) => a + c.length, 0),
    all = new Float32Array(n);
  let o = 0;
  for (const c of m.chunks) {
    all.set(c, o);
    o += c.length;
  }
  m.chunks = [];
  if (m.rate === 16000) return all;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil((n * 16000) / m.rate)), 16000);
  const buf = off.createBuffer(1, n || 1, m.rate);
  buf.getChannelData(0).set(all);
  const s = off.createBufferSource();
  s.buffer = buf;
  s.connect(off.destination);
  s.start();
  return (await off.startRendering()).getChannelData(0);
}
// for the mic-level test (game3d/tools/speech/level.mjs): the real capture path without the mic row
export const micTest = {
  open: openMic,
  close: closeMic,
  read: micRead,
  take: micSamples16k,
  record: (on) => (on ? startMic() : stopMic()),
};
