// Optional world-story session. The standalone game keeps its original tutorial and shifts.
import { THINGS, SHIFTS, LINES } from './data.js';

export function configureStory(config) {
  if (!config || !['first', 'rounds'].includes(config.mode)) throw new Error('Invalid Kotodama story mode');
  const contract = config.contract;
  THINGS.melon = { kind: 'item', ...contract.first.item };
  THINGS.vend.makes = [...new Set([...THINGS.vend.makes, 'melon'])];
  THINGS.kenji.likes = [...new Set([...THINGS.kenji.likes, 'melon'])];
  LINES.ask.kenji.melon = ['{メロンソーダを|meron sooda o|melon soda} {ください|kudasai|please}。', 'Melon soda, please.'];
  LINES.launched.mio = [config.launchedMio, config.launchedMio];
  SHIFTS.forEach((shift, i) => {
    shift.people = [...contract.people];
    shift.time = '18:00';
    shift.script = shift.script.map(requests => requests.filter(([who]) => contract.people.includes(who)));
    shift.story = true;
    shift.round = i + 1;
  });
  SHIFTS[0].script[0] = [[contract.first.request.who, contract.first.request.item]];
  if (config.mode === 'first') {
    SHIFTS[0].turns = 1;
    SHIFTS[0].script = [SHIFTS[0].script[0]];
    SHIFTS[0].rate = 0;
  }
  let lastRecipient = '', closed = false;
  const send = (event) => {
    if (closed) return;
    closed = true;
    globalThis.parent.postMessage({ type: 'amakawa-kotodama', session: config.session, event, lastRecipient }, location.origin);
  };
  return {
    mode: config.mode,
    guide: contract.first.guide.map(s => ({ text: s.text, taps: [s.tap === 'dashite' ? ['fire'] : ['ni', 'o'].includes(s.tap) ? ['p', s.tap] : ['thing', s.tap]] })),
    delivered(result) {
      const served = result.deliveries.filter(d => d.kind === 'serve' && contract.people.includes(d.to));
      if (served.length) lastRecipient = served.at(-1).to;
      if (config.mode === 'first' && served.some(d => d.to === 'kenji' && d.what === 'melon')) {
        send(contract.first.successEvent);
        return true;
      }
      return false;
    },
    leave() { send(config.mode === 'first' ? contract.first.cancelEvent : contract.repeat.exitEvent); },
  };
}

export function storyConfig() {
  if (globalThis.parent === window || !new URLSearchParams(location.search).has('story')) return Promise.resolve(null);
  return new Promise(resolve => {
    const receive = e => {
      if (e.source !== globalThis.parent || e.origin !== location.origin || e.data?.type !== 'amakawa-kotodama-start') return;
      removeEventListener('message', receive);
      resolve(e.data.config);
    };
    addEventListener('message', receive);
    globalThis.parent.postMessage({ type: 'amakawa-kotodama-ready' }, location.origin);
  });
}
