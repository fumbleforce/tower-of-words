import { WORDS } from '../../lang.js';
import { voice, voiceThenBeat, playMusic } from '../../ui.js';
import { sim, setPeriod, meet, buy, take, save } from '../../sim.js';
import { NEXT } from '../../places/definitions.js';
import { showEnd } from '../../end.js';
import { flags } from '../state.js';
import { flagKeys } from '../engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/narrative/hooks/progression.js');

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
    await ui.typePrompt(word, pr);
    const spoken = voice(WORDS[word].voice || '');
    complete(() => {
      game.runner.learnCmd(word);
      flags[ENGINE_KEYS.typed + word] = true;
    });
    await voiceThenBeat(spoken, 350);
  };
  H.period = ({ to }) => {
    setPeriod(to, game);
    if (to === 'evening') playMusic('night');
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
  H.end = () => {
    game.ended = true;
    game.after = async () => {
      await game.wait(500);
      showEnd(game);
    };
  };
}
