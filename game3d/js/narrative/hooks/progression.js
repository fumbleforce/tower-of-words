import { WORDS, iconHTML } from '../../lang.js';
import { voice, voiceThenBeat, playMusic } from '../../ui.js';
import { sim, setPeriod, meet, buy, take, save, PERIODS } from '../../sim.js';
import { NEXT, canTravel } from '../../places/definitions.js';
import { showEnd } from '../../end.js';
import { flags } from '../state.js';
import { flagKeys } from '../engine-flags.js';
import { settings } from '../../settings.js';
const ENGINE_KEYS = flagKeys('game3d/js/narrative/hooks/progression.js');
// a taught word under its line, as the typing prompt shows it (kana with its play button, romaji, English)
function wordCard(id) {
  const w = WORDS[id];
  return `<div class="tp tp-shown"><div class="tp-word">${iconHTML(id, 'wi tp-ico')}<div class="tp-jp"><span class="jp" data-w="${id}">${w.ja}</span></div><div class="tp-ro">${w.ro}</div><div class="tp-en">${w.en}</div></div></div>`;
}

export function installProgressionHooks(game, { travel }) {
  const H = game.hooks;
  const ui = game.ui;
  // typing prompt: Eric types the romaji of a new word, then says it (voiced) and knows it
  H.type = async ({ word, prompt, from }, complete = (apply) => apply()) => {
    game.setHurry(false);
    if (from && game.sim && !game.sim.taught[word]) game.sim.taught[word] = from;
    if (!WORDS[word]) {
      console.warn('type: unknown word', word);
      return;
    }
    let pr = prompt;
    if (prompt) {
      const i = prompt.indexOf(': ');
      if (i > 0 && /^\w+$/.test(prompt.slice(0, i)))
        pr = { who: game.runner.speaker(prompt.slice(0, i)), whoId: prompt.slice(0, i), text: prompt.slice(i + 2) };
      else pr = { who: null, text: prompt.replace(/^>\s*/, '') };
    }
    // Settings > Skip skill checks: the prompt is a line with the word under it, passed without counting as practice
    if (settings.skipChecks) await ui.say(pr?.who || null, pr?.text || '', { whoId: pr?.whoId, card: wordCard(word) });
    else await ui.typePrompt(word, pr);
    game.lastSaid = word; // the next kotodama shows it rising off what it caught
    const spoken = voice(WORDS[word].voice || '');
    complete(() => {
      game.runner.learnCmd(word);
      flags[ENGINE_KEYS.typed + word] = true;
    });
    await voiceThenBeat(spoken, 350);
  };
  // { do: 'period', to: 'lunch' }, or to: 'next' (the next period of the day: a free day's chair, notes/days3-5-outline.md)
  H.period = ({ to }) => {
    const p = to === 'next' ? PERIODS[PERIODS.indexOf(sim.period) + 1] : to;
    if (!p) return; // after work there is no next period: Sleep moves the day on
    setPeriod(p, game);
    game.place?.onPeriod?.(p); // the place's light for the new period (outdoors, the room's window)
    if (p === 'evening') playMusic('night');
  };
  // a story can change the loop: { hook: 'music', name: 'calm' | 'office' | 'lively' | 'night' | null }
  H.music = ({ name }) => playMusic(name || null);
  H.meet = ({ who }) => {
    meet(game, who);
    ui.refreshPeople(sim.met.size);
  };
  H.buy = ({ item }) => {
    if (buy(game, item)) flags[ENGINE_KEYS.bought + item] = true;
    else flags[ENGINE_KEYS.cant_buy] = true;
  };
  H.take = ({ item }) => take(item);
  H.save = () => save(game);
  H.next = () => {
    game.transition = { from: game.place.name, to: NEXT[game.place.name], phase: 'leaving' };
    game.after = () => travel(game.transition.to);
  };
  // a side trip to a neighbouring chunk ({ do: 'trip', to: 'plaza' }), the same watched walk as next
  H.trip = ({ to }) => {
    const from = game.place.name;
    if (!canTravel(from, to, sim.day)) {
      console.warn('trip: no way from', from, 'to', to);
      return;
    }
    game.transition = { from, to, phase: 'leaving' };
    game.after = () => travel(to);
  };
  H.end = () => {
    game.ended = true;
    game.after = async () => {
      await game.wait(500);
      showEnd(game);
    };
  };
}
