// Energy gates prevent silence from reaching a recogniser that can invent words.
// A live recording uses the room measured before the press, never its own syllables.
export const SPEECH_MIN = 0.00035;
export const speechThreshold = (floor = 0) => Math.max(SPEECH_MIN, floor * 2);
export function frameRms(samples, size) {
  const frames = [];
  for (let i = 0; i < samples.length; i += size) {
    const end = Math.min(samples.length, i + size);
    let energy = 0;
    for (let j = i; j < end; j++) energy += samples[j] * samples[j];
    frames.push(Math.sqrt(energy / (end - i)));
  }
  return frames;
}
export const SPEECH_SECONDS = 0.08;
export function voicedDuration(samples, rate = 16000, floor = 0) {
  const size = Math.max(1, Math.floor(rate * 0.02)),
    frames = frameRms(samples, size),
    threshold = speechThreshold(floor);
  return frames.reduce(
    (seconds, rms, i) => seconds + (rms > threshold ? Math.min(size, samples.length - i * size) / rate : 0),
    0,
  );
}
export function hasSpeech(samples, rate = 16000, floor) {
  // Files and a first press without room history use their quiet frames as a fallback.
  if (floor === undefined) {
    const sorted = frameRms(samples, Math.max(1, Math.floor(rate * 0.02))).sort((a, b) => a - b);
    floor = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  }
  return voicedDuration(samples, rate, floor) >= SPEECH_SECONDS - 1e-8;
}
// Keep this export for bench callers. Quiet consonants and trailing syllables belong to the recording too.
export const trimSilence = (samples) => samples;
