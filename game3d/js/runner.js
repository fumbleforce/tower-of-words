import { newFrame, readCheckpoint } from './narrative/checkpoint.js';
import { flagKeys } from './narrative/engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/runner.js');
import { DEFAULT_SPEAKERS } from './narrative/speakers.js';
import { MC, PLAYER_ID, expandMc } from './mc.js';
import { storyPath } from './days.js';
// Runs the story files (game3d/story/*.js, format in game3d/story/FORMAT.md) against a place.
import { voiceThenBeat } from './ui.js';
import { ui, voice, sfx, setFace, newScene } from './ui.js';
import { WORDS, learn, known, cmdHTML, lineHTML, SAYABLE } from './lang.js';
import { recordHeard } from './narrative/heard-record.js';
import { choiceIcon } from './ui/pin-tip.js';
import { walkClear } from './movement/doorways.js';
import { flags, cond } from './narrative/state.js';
export { flags, cond } from './narrative/state.js';
import { lineClip, audioKeys } from './narrative/voice-keys.js';
import { playAmbient } from './narrative/ambient-lines.js';

import { KEEP_TALK, DURABLE_HOOKS, PERIOD_HOOKS, WORLD_HOOKS } from './narrative/hook-kinds.js';
export class Runner {
  constructor(game) {
    this.game = game;
    this.story = null;
    this.place = null;
    this.onceDone = new Set();
    this.frames = [];
    this.queued = [];
    this.effectDepth = 0;
  }

  async load(name) {
    const tryImport = async (p) => {
      try {
        return (await import(p)).default;
      } catch (e) {
        if (!/Failed to fetch|Cannot find|404|error loading/i.test(String(e))) console.error(e);
        return null;
      }
    };
    // Later days have their own stories and no travel dialogue.
    const day = this.game.sim?.day || 1;
    // {mc.name} and the other protagonist tokens are filled in once, before anything reads the lines (mc.js)
    if (day > 1 && name === 'transitions') return {};
    if (day > 1) return expandMc((await tryImport(storyPath(name, day))) || { nodes: {}, on: {} });
    const s = (await tryImport(`../story/${name}.js`)) ||
      (await tryImport(`../story/placeholder/${name}.js`)) || { nodes: {}, on: {} };
    return expandMc(s);
  }
  use(place, story) {
    this.place = place;
    this.story = story;
    flags[ENGINE_KEYS.place] = place.name;
    this.speakers = { ...DEFAULT_SPEAKERS, ...(story.speakers || {}) };
    this.speakers[PLAYER_ID] = { ...this.speakers[PLAYER_ID], name: MC.name }; // a story file's `eric` too (mc.js)
  }
  speaker(id) {
    return this.speakers[id] || { name: id };
  }

  // find what should run for a trigger key; returns a node name or null
  // resolve(key, { peek: true }) only looks: has() must never use up a `once` trigger (it's asked every frame by the
  // Say chip, the markers and the zones; a peek used to spend them, so the real trigger found nothing)
  resolve(key, opts) {
    const t = this.entry(key, opts);
    return t ? t.node : null;
  }
  // the matching trigger entry itself, so a caller can read its options (a give: entry with keep: true is a refusal)
  entry(key, { peek = false } = {}) {
    const on = (this.story && this.story.on) || {};
    let v = on[key];
    if (v === undefined) return null;
    const list = Array.isArray(v) ? v : [v];
    for (const e of list) {
      const t = typeof e === 'string' ? { node: e } : e;
      if (t.once && this.onceDone.has(key + '>' + t.node)) continue;
      if (!cond(t.if)) continue;
      if (t.once && !peek) this.onceDone.add(key + '>' + t.node);
      return t;
    }
    return null;
  }
  has(key) {
    return !!this.resolve(key, { peek: true });
  }
  // run a trigger inside a beat (locks walking); returns true if something ran
  trigger(key, { beat = true } = {}) {
    this.game.onTrigger?.(key);
    const node = this.resolve(key);
    if (!node) return false;
    // a new beat starts everyone on their neutral face: a face set on a line lasts for its scene only. It used to
    // last all day, so the listening portrait kept an old look (Jørgen: at the copier Eric looked surprised, still
    // from "Nineteen ninety-six?" in the ticket scene, and Mori flustered from the jam)
    const go = async () => {
      newScene(this.story.nodes[node]);
      await walkClear(this.game); // never a scene with Eric in a doorway (movement/doorways.js)
      await this.run(node, { trigger: key });
    };
    // an event during a scene, or while Eric says a word (#81), waits for it to end
    if (!beat) go();
    else if ((this.game.busy || this.game.saying) && /^(event|zone|near):/.test(key)) this.enqueue(node, key);
    else this.game.beat(go);
    return true;
  }

  enqueue(node, trigger = null, persist = true) {
    const queued = { node, trigger };
    this.queued.push(queued);
    this.game.queue.push(async () => {
      this.queued.splice(this.queued.indexOf(queued), 1);
      newScene(this.story.nodes[node]);
      await walkClear(this.game);
      await this.run(node, { trigger });
    });
    if (persist) this.persist();
  }

  get currentNode() {
    return this.frames.at(-1)?.node || '';
  }
  snapshot() {
    return {
      onceDone: [...this.onceDone],
      execution: this.recoveryError
        ? structuredClone(this.pendingExecution)
        : this.frames.length
          ? structuredClone({ v: 3, place: this.place.name, frames: this.frames })
          : this.pendingExecution || null,
      ...(this.queued.length ? { queued: structuredClone(this.queued) } : {}),
    };
  }
  restore(data) {
    this.recoveryError = null;
    this.onceDone = new Set(data?.onceDone || []);
    this.pendingExecution = data?.execution || null;
    this.pendingQueue = Array.isArray(data?.queued) ? data.queued : [];
  }
  async resume() {
    const frames = readCheckpoint(this.pendingExecution, this.place.name, this.story);
    if (this.pendingExecution && !frames) {
      this.failRecovery('This saved scene has changed and cannot be resumed.');
      return false;
    }
    this.pendingExecution = null;
    for (const queued of this.pendingQueue || []) {
      if (
        queued &&
        Array.isArray(this.story.nodes[queued.node]) &&
        (queued.trigger === null || typeof queued.trigger === 'string')
      ) {
        this.enqueue(queued.node, queued.trigger, false);
      }
    }
    this.pendingQueue = [];
    if (!frames?.at(-1)?.staging) this.game.resumeWalks?.();
    if (frames) await this.run(frames[0].node, { restored: frames });
    else if (this.queued.length) await this.game.queue.shift()();
    else return false;
    return true;
  }
  persist() {
    this.onCheckpoint?.();
  }
  failRecovery(message) {
    if (this.recoveryError) return;
    this.pendingExecution ||= this.snapshot().execution;
    this.recoveryError = message;
    this.game.onRecoveryError?.(message);
  }
  // Simulation operations may save internally. Their state and journal entry must be saved together.
  effect(context, key, fn) {
    const frame = context?.frame;
    if (!frame) return fn();
    if (frame.done.includes(key)) return;
    this.effectDepth++;
    let completed = false;
    try {
      const result = fn();
      if (result?.then) throw new Error('Checkpoint effect must be synchronous: ' + key);
      frame.done.push(key);
      completed = true;
      return result;
    } finally {
      this.effectDepth--;
      if (!this.effectDepth) {
        this.savePending = false;
        if (completed) this.persist();
      }
    }
  }
  async run(node, { restored = null, trigger = null, replace = null } = {}) {
    const steps = this.story.nodes[node];
    if (!steps) {
      console.warn('missing node', node);
      return;
    }
    const frame = restored?.[0] || newFrame(node, steps, trigger || replace?.trigger);
    if (!restored) frame.staging = this.game.captureStaging?.() || null;
    const continuing = restored?.length > 1;
    const context = {
      frame,
      replaying: !!restored && !continuing && !!frame.staging,
      targets: continuing ? structuredClone(frame.cursors) : [],
      children: restored?.slice(1) || [],
    };
    frame.cursors = [];
    if (replace) this.frames.splice(this.frames.indexOf(replace), 1, frame);
    else this.frames.push(frame);
    try {
      if (context.replaying) this.game.restoreStaging(frame.staging);
      if (!continuing) {
        (this.trace = this.trace || []).push(node);
        if (this.trace.length > 20) this.trace.shift();
        this.effect(context, 'entry', () => this.onNodeStart?.(node));
        this.game.onNode?.(node, 'start');
      }
      await this.steps(steps, context);
      this.game.onNode?.(node, 'end');
      if (this.frames.includes(frame)) {
        const talk = /^talk:(.+)$/.exec(frame.trigger || '');
        if (talk) flags[ENGINE_KEYS.talked + talk[1]] = true;
      }
    } catch (error) {
      this.failRecovery('The scene could not finish.');
      throw error;
    } finally {
      const index = this.frames.indexOf(frame);
      if (index >= 0) this.frames.splice(index, 1);
    }
    if (!this.frames.length && !this.recoveryError) this.persist();
  }
  // returns 'go' when a jump happened, 'end' to stop
  async steps(list, context = null, path = []) {
    const target = context?.targets.find((c) => JSON.stringify(c.path) === JSON.stringify(path));
    const cursor = { path, index: target?.index || 0, phase: target?.phase || 'step' };
    context?.frame.cursors.push(cursor);
    try {
      for (let index = cursor.index; index < list.length; index++) {
        cursor.index = index;
        cursor.phase = index === target?.index ? target.phase : 'step';
        const key = JSON.stringify([...path, index]);
        const result = await this.step(list[index], context, key, cursor);
        if (result === 'end' || result === 'go') return result;
      }
      return null;
    } catch (error) {
      // Capture suspended callers before unwinding removes their cursor paths.
      this.failRecovery('The scene could not finish.');
      throw error;
    } finally {
      if (context) context.frame.cursors.splice(context.frame.cursors.indexOf(cursor), 1);
    }
  }
  async call(node, context, key, cursor) {
    if (context?.frame.done.includes(key + ':call')) {
      if (context.replaying && context.frame.worldAfter[key + ':call'])
        this.game.restoreStaging(context.frame.worldAfter[key + ':call']);
      return;
    }
    const restored = context?.children.length ? context.children.splice(0) : null;
    await this.run(restored?.[0].node || node, { restored });
    if (context) {
      context.frame.worldAfter[key + ':call'] = this.game.captureStaging?.() || null;
      context.frame.done.push(key + ':call');
    }
    this.persist();
  }
  async jump(node, context) {
    await this.run(node, { replace: context?.frame || null });
    return 'go';
  }
  async step(s, context = null, key = '', cursor = { phase: 'step', path: [], index: 0 }) {
    this.lastStep = s;
    if (typeof s === 'string') return this.line(s);
    if (s.face && s.say) setFace(s.say, s.face);
    if (s.say) return this.sayLine(s.say, s.text, s.voice, s.name, s);
    if (s.choice) return this.choice(s, context, key, cursor);
    if (s.offer) return this.offer(s, context, key);
    if (s.learn) {
      this.effect(context, key + ':learn', () => {
        if (this.game.sim && !this.game.sim.taught[s.learn])
          this.game.sim.taught[s.learn] = s.from || this.game.talkingTo;
        this.learnCmd(s.learn);
      });
      return null;
    }
    const continuing = cursor.phase;
    if (continuing === 'step') {
      if (s.set !== undefined)
        this.effect(context, key + ':set', () => {
          if (typeof s.set === 'string') flags[s.set] = true;
          else Object.assign(flags, s.set);
        });
      if (s.unset)
        this.effect(context, key + ':unset', () => {
          flags[s.unset] = false;
        });
      if (s.inc)
        this.effect(context, key + ':inc', () => {
          flags[s.inc] = (flags[s.inc] || 0) + 1;
        });
    }
    if (continuing !== 'call') {
      if (s.if !== undefined && (s.then || s.else)) {
        const branches = context?.frame.branches;
        const yes = branches && Object.hasOwn(branches, key) ? branches[key] : cond(s.if);
        if (branches) branches[key] = yes;
        cursor.phase = 'branch';
        const branch = yes ? 'then' : 'else';
        const result = await this.steps(s[branch] || [], context, [...cursor.path, cursor.index, branch]);
        if (result) return result;
      }
      if (s.go) return this.jump(s.go, context);
    }
    if (s.call) {
      cursor.phase = 'call';
      await this.call(s.call, context, key, cursor);
    }
    if (s.wait) await this.game.wait(s.wait);
    if (s.do && !KEEP_TALK.has(s.do)) ui.closeTalk();
    if (s.do) await this.hook(s, context, key);
    if (s.end) return 'end';
    return null;
  }
  async line(str) {
    if (str.startsWith('>')) {
      await ui.say(null, str.replace(/^>\s*/, ''));
      return null;
    }
    const i = str.indexOf(': ');
    if (i > 0 && /^\w+$/.test(str.slice(0, i))) return this.sayLine(str.slice(0, i), str.slice(i + 2));
    await ui.say(null, str);
    return null;
  }
  async sayLine(who, text, voiceKey, name, s = {}) {
    const sp = name ? { ...this.speaker(who), name, role: '' } : this.speaker(who);
    this.game.talkingTo = who;
    voiceKey ||= lineClip(who, text, s.overheard); // the protagonist's own clip, the shared one, or none
    if (voiceKey && s.overheard && !audioKeys.has(voiceKey)) voiceKey = null;
    this.game.setHurry?.(false);
    const shown = ui.say(sp, text, {
      voiceKey,
      overheard: !!s.overheard,
      clear: s.clear,
      whoId: who,
      face: s.face,
      en: s.en,
    });
    if (s.overheard && window.__test) recordHeard(text, voiceKey);
    await shown;
    return null;
  }
  async choice(s, context, key, cursor) {
    const choices = context?.frame.choices;
    let selected = choices && Object.hasOwn(choices, key) ? choices[key] : null;
    if (selected === null) {
      const opts = s.choice.filter((o) => cond(o.if));
      let who = null,
        text = '',
        whoId = null;
      if (s.prompt) {
        const i = s.prompt.indexOf(': ');
        if (i > 0 && /^\w+$/.test(s.prompt.slice(0, i))) {
          whoId = s.prompt.slice(0, i);
          who = this.speaker(whoId);
          text = s.prompt.slice(i + 2);
        } else text = s.prompt.replace(/^>\s*/, '');
      }
      this.game.setHurry?.(false);
      const pick = await ui.choose(
        who,
        text,
        opts.map((o) => ({ html: choiceIcon(o.icon) + lineHTML(o.text) })),
        { keepLine: !s.prompt, whoId },
      );
      selected = s.choice.indexOf(opts[pick]);
      if (choices) choices[key] = selected;
    }
    const o = s.choice[selected];
    if (!o) throw new Error('Saved choice no longer exists');
    if (o.set)
      this.effect(context, key + ':choice-set', () => {
        if (typeof o.set === 'string') flags[o.set] = true;
        else Object.assign(flags, o.set);
      });
    if (o.call) {
      cursor.phase = 'choice-call';
      await this.call(o.call, context, key, cursor);
    }
    if (o.go) return this.jump(o.go, context);
    return null;
  }
  async offer(s, context, key) {
    if (context?.frame.done.includes(key + ':offer')) return null;
    let who = null,
      text = '',
      whoId = null;
    if (s.line) {
      const i = s.line.indexOf(': ');
      if (i > 0 && /^\w+$/.test(s.line.slice(0, i))) {
        whoId = s.line.slice(0, i);
        who = this.speaker(whoId);
        text = s.line.slice(i + 2);
      } else text = s.line.replace(/^>\s*/, '');
    }
    await ui.choose(who, text, [{ html: cmdHTML(s.offer), cls: 'cmdchip' }], { voiceKey: s.voice, whoId });
    const spoken = voice(WORDS[s.offer].voice);
    this.game.mioSays?.(s.offer);
    this.effect(context, key + ':offer', () => {
      this.game.sim?.taught &&
        !this.game.sim.taught[s.offer] &&
        who &&
        (this.game.sim.taught[s.offer] = s.from || s.line.slice(0, s.line.indexOf(': ')));
      this.learnCmd(s.offer);
    });
    await voiceThenBeat(spoken, 350);
    return null;
  }
  learnCmd(id) {
    // the Say tip comes with the first word he can say (外人 gaijin is only understood, never said to anyone)
    const sayable = SAYABLE.includes(id),
      first = sayable && !SAYABLE.some((w) => known.has(w));
    if (learn(id)) {
      if (first) setTimeout(() => ui.introSay(), 600);
      if (this.game.learned) this.game.learned(WORDS[id].cmd ? 'command' : 'word');
      else sfx('word');
      ui.refreshWords();
      ui.toast(
        `${sayable ? 'New command' : 'New word'}: <span class="jp">${WORDS[id].ja}</span> <span class="gl">${WORDS[id].ro}, ${WORDS[id].en}</span>`,
        3400,
      );
    }
  }
  async hook(s, context, key) {
    const h = this.game.hooks[s.do] || (this.place.hooks && this.place.hooks[s.do]);
    if (!h) {
      console.warn('unknown hook', s.do);
      return;
    }
    if (DURABLE_HOOKS.has(s.do) || PERIOD_HOOKS.has(s.do)) {
      if (PERIOD_HOOKS.has(s.do) && context?.replaying && context.frame.done.includes(key + ':hook')) {
        const world = context.frame.worldAfter[key + ':hook'];
        if (world) this.game.restoreStaging(world);
      } else
        this.effect(context, key + ':hook', () => {
          const result = h(s);
          if (PERIOD_HOOKS.has(s.do) && context)
            context.frame.worldAfter[key + ':hook'] = this.game.captureStaging?.() || null;
          return result;
        });
    } else if (WORLD_HOOKS.has(s.do) && context) {
      if (context.frame.done.includes(key + ':hook') && !context.replaying) return;
      await h(s);
      if (!context.frame.done.includes(key + ':hook')) context.frame.done.push(key + ':hook');
      this.persist();
    } else if (s.do === 'type') {
      if (context?.frame.done.includes(key + ':hook')) return;
      await h(s, (apply) => this.effect(context, key + ':hook', apply));
    } else await h(s);
  }
  // captions nobody taps, while something else happens (narrative/ambient-lines.js)
  ambient(lines, gap = 2800) {
    return playAmbient(this, lines, gap);
  }
}
