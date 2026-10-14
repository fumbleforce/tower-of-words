import test from 'node:test';
import assert from 'node:assert/strict';
import { hasSpeech, trimSilence, speechThreshold } from '../../js/speech-signal.js';
const rate = 16000;
const tone = (seconds, amplitude) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin(2 * Math.PI * 200 * i / rate));
const join = (...chunks) => Float32Array.from(chunks.flatMap(chunk => [...chunk]));
test('quiet speech and a short word survive without silent gaps when the room is known', () => {
  assert.equal(hasSpeech(tone(.12, .0008), rate, 0), true);
  assert.equal(hasSpeech(tone(.14, .02), rate, 0), true);
  assert.equal(hasSpeech(tone(.04, .02), rate, 0), false);
  assert.equal(hasSpeech(join(tone(.04, .0008), tone(.02, 0), tone(.04, .0008)), rate, 0), true);
});
test('the complete quiet ending reaches recognition after a louder syllable', () => {
  const samples = join(tone(.3, 0), tone(.6, .02), tone(.8, .0018), tone(.3, 0));
  assert.equal(hasSpeech(samples, rate, 0), true);
  assert.equal(trimSilence(samples), samples);
  assert.equal(samples.length, 32000);
});
test('silence, constant room noise and doubled steady ambient noise are rejected', () => {
  assert.equal(hasSpeech(tone(1, 0), rate, 0), false);
  for (const level of [.0001, .003, .1]) {
    const samples = tone(1, level);
    assert.equal(hasSpeech(samples), false, `uncalibrated level ${level}`);
    assert.equal(hasSpeech(samples, rate, level / Math.sqrt(2)), false);
    // The gain can settle after the press. A twofold level change remains below the onset bar.
    assert.equal(hasSpeech(tone(1, level * 1.99), rate, level / Math.sqrt(2)), false);
  }
});
test('long speech does not recalibrate against its own syllables', () => {
  const samples = join(tone(.35, .0001), tone(4, .0008));
  assert.equal(hasSpeech(samples, rate, .0001), true);
  assert.equal(speechThreshold(.0001), .00035);
});
