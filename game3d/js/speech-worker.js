// On-device speech recognition for voice input: Whisper (or Moonshine) through transformers.js, off the main thread
// so the game and the level meter keep running while it thinks. Loaded by speech.js as a module worker.
// Messages in:  { type: 'load', model, device, dtype }  |  { type: 'run', id, samples (Float32Array, 16 kHz mono), candidates? { wordId: [forms] }, score? }
//   (score: true scores the candidates against the last recording, no samples needed)
// Messages out: { type: 'progress', file, loaded, total } | { type: 'ready', ms, device } | { type: 'text', id, text, ms, free?, scores? } | { type: 'error', message }
// transformers.js 4.3.0 (Apache-2.0) from jsDelivr, pinned; the browser caches it with the model and the runtime.
// (Not vendored: GitHub's push protection flags the minified bundle as a secret.)
import { pipeline, env, AutoProcessor, AutoTokenizer, MoonshineForConditionalGeneration, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js';

// models and the runtime come from the Hugging Face hub and jsDelivr once, then from the browser's cache
env.allowLocalModels = false;
env.useBrowserCache = true;

let run = null;   // (samples, maxTokens) => text


async function build(model, device, dtype, progress_callback) {
  if (/whisper/i.test(model)) {
    const asr = await pipeline('automatic-speech-recognition', model, { device, dtype: dtype || defaultDtype(device), progress_callback });
    keepWhisper(asr);
    return async (s, max_new_tokens) => ((await asr(s, { language: 'japanese', task: 'transcribe', max_new_tokens })).text || '');
  }
  // Moonshine Tiny JA: its ONNX export wants masks transformers.js doesn't send (the encoder's attention_mask, the
  // decoder's encoder_attention_mask). Each session gets a wrapper that adds a mask of all ones.
  const [m, proc, tok] = await Promise.all([
    MoonshineForConditionalGeneration.from_pretrained(model, { device, dtype: dtype || 'q8', progress_callback }),
    AutoProcessor.from_pretrained(model), AutoTokenizer.from_pretrained(model),
  ]);
  addMask(m, 'model', 'attention_mask', (f) => f.input_values);
  addMask(m, 'decoder_model_merged', 'encoder_attention_mask', (f) => f.encoder_hidden_states, 2);
  return async (s, max_new_tokens) => {
    const out = await m.generate({ ...(await proc(s)), max_new_tokens });
    return tok.decode(out[0], { skip_special_tokens: true });
  };
}

function addMask(m, key, name, like, rank) {
  const t = m.sessions[key]; if (!t || !t.inputNames.includes(name)) return;
  const run = t.run.bind(t);
  m.sessions[key] = new Proxy(t, { get(o, k) {
    if (k === 'inputNames') return o.inputNames.filter((n) => n !== name);
    if (k === 'run') return (feeds, ...r) => {
      const ref = like(feeds), dims = rank ? ref.dims.slice(0, rank) : ref.dims, n = dims.reduce((a, b) => a * b, 1);
      return run({ ...feeds, [name]: new ref.constructor('int64', new BigInt64Array(n).fill(1n), dims) }, ...r);
    };
    const x = o[k]; return typeof x === 'function' ? x.bind(o) : x;
  } });
}

// Whisper can also be asked how likely each candidate word is for this audio (forced decoding). That catches a
// learner's accent when the free transcript comes out as some other word (よろしく heard as 喜悔しましょう):
// the words he could be saying are scored against what the model would write on its own.
let wh = null;   // { model, processor, tokenizer, prefix, eot }
function keepWhisper(asr) {
  const g = asr.model.generation_config, tok = asr.tokenizer;
  const id = (t) => (tok.model && tok.model.tokens_to_ids ? tok.model.tokens_to_ids.get(t) : undefined) ?? tok.encode(t, { add_special_tokens: false })[0];
  const prefix = [g.decoder_start_token_id ?? id('<|startoftranscript|>'), (g.lang_to_id || {})['<|ja|>'] ?? id('<|ja|>'), (g.task_to_id || {}).transcribe ?? id('<|transcribe|>'), g.no_timestamps_token_id ?? id('<|notimestamps|>')];
  wh = { model: asr.model, processor: asr.processor, tokenizer: tok, prefix, eot: g.eos_token_id ?? id('<|endoftext|>') };
}
// mean log-probability per token of `text` (plus the end token) given the encoded audio
async function logprob(enc, text) {
  const ids = [...wh.prefix, ...wh.tokenizer.encode(text, { add_special_tokens: false }), wh.eot];
  const dec = new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
  const { logits } = await wh.model({ encoder_outputs: enc, decoder_input_ids: dec });
  const V = logits.dims[2], d = logits.data; let sum = 0;
  for (let p = wh.prefix.length - 1; p < ids.length - 1; p++) {
    let mx = -Infinity; for (let v = 0; v < V; v++) mx = Math.max(mx, d[p * V + v]);
    let z = 0; for (let v = 0; v < V; v++) z += Math.exp(d[p * V + v] - mx);
    sum += d[p * V + ids[p + 1]] - mx - Math.log(z);
  }
  return sum / (ids.length - wh.prefix.length);
}
// free transcript plus a score for each candidate: { text, free, scores: { id: best mean log-prob over its forms } }
async function transcribeAndScore(samples, candidates, max_new_tokens) {
  const t0 = performance.now();
  const { input_features } = await wh.processor(samples);
  const mi = await wh.model._prepare_encoder_decoder_kwargs_for_generation({ inputs_tensor: input_features, model_inputs: { input_features }, model_input_name: 'input_features', generation_config: wh.model.generation_config });
  const enc = mi.encoder_outputs;
  const out = await wh.model.generate({ inputs: input_features, encoder_outputs: enc, language: 'japanese', task: 'transcribe', max_new_tokens });
  const text = wh.tokenizer.decode(out[0], { skip_special_tokens: true }).trim();
  last = { enc, text };
  const textMs = Math.round(performance.now() - t0);
  if (!candidates) return { text, textMs };
  return { text, textMs, ...(await scoreLast(candidates)) };
}
// scores for the last recording (the encoder output is kept, so this is decoder passes only)
let last = null;
async function scoreLast(candidates) {
  const t0 = performance.now(), { enc, text } = last;
  const free = text ? await logprob(enc, text) : -Infinity;
  const scores = {};
  for (const [id, forms] of Object.entries(candidates || {})) { let b = -Infinity; for (const f of forms) b = Math.max(b, await logprob(enc, f)); scores[id] = +b.toFixed(3); }
  return { free: +free.toFixed(3), scores, scoreMs: Math.round(performance.now() - t0) };
}

async function load({ model, device, dtype }) {
  const t0 = performance.now();
  let dev = device || 'auto';
  if (dev === 'auto') dev = (await hasWebGPU()) ? 'webgpu' : 'wasm';
  const progress_callback = (p) => { if (p.status === 'progress') postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total }); };
  try { run = await build(model, dev, dtype, progress_callback); }
  catch (e) {
    if (dev !== 'webgpu') throw e;
    dev = 'wasm';                                            // a WebGPU adapter that can't run it: fall back
    run = await build(model, dev, null, progress_callback);
  }
  // one short warm-up, so the first real answer isn't the slow one
  await run(new Float32Array(16000 * 0.5), 4);
  postMessage({ type: 'ready', ms: Math.round(performance.now() - t0), device: dev });
}
function defaultDtype(dev) { return dev === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : { encoder_model: 'q8', decoder_model_merged: 'q8' }; }
async function hasWebGPU() { try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch { return false; } }

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') await load(data);
    else if (data.type === 'run') {
      const t0 = performance.now();
      if (data.score) {
        const r = last ? await scoreLast(data.candidates) : { scores: {} };
        postMessage({ type: 'text', id: data.id, text: last ? last.text : '', ...r, ms: Math.round(performance.now() - t0) });
      } else if (wh) {
        const r = await transcribeAndScore(data.samples, data.candidates, 32);
        postMessage({ type: 'text', id: data.id, ...r, ms: Math.round(performance.now() - t0) });
      } else {
        const text = (await run(data.samples, 32)).trim();
        postMessage({ type: 'text', id: data.id, text, ms: Math.round(performance.now() - t0) });
      }
    }
  } catch (e) { postMessage({ type: 'error', id: data.id, message: String(e && e.message || e) }); }
};
