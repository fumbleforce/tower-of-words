// Reads a command built from tiles: which machine it is said to, what comes out (を), where it goes
// (に, or にも for "to … too"), and whether it is polite. Also writes the English for a command and
// the one line that explains what a command said when it went wrong.

import { THINGS, VERBS } from './data.js';

/**
 * tokens: [{ t: 'n', id } | { t: 'p', p: 'o'|'ni'|'to'|'nimo' }], machine: the machine spoken to.
 * ctx: { last: the previous command this turn (for にも), moReady }.
 * Returns { ok: true, machine, what, to, mo } or { ok: false, need } with a short hint.
 */
export function parse(tokens, machine, ctx = {}) {
  if (!tokens.length) return { ok: false, need: 'Tap someone who wants something, or a drink on a machine.' };
  const groups = [];
  let cur = [];
  for (const tok of tokens) {
    if (tok.t === 'n') {
      cur.push(tok.id);
    } else if (tok.p === 'to') {
      continue;
    } else {
      groups.push({ nouns: cur, p: tok.p });
      cur = [];
    }
  }
  const last = tokens[tokens.length - 1];
  if (last.t === 'n') return { ok: false, need: `${THINGS[last.id].jp} needs a particle: を for what comes out, に for who gets it.` };
  if (last.p === 'to') return { ok: false, need: 'と joins two words: tap the next one.' };
  if (!machine) return { ok: false, need: 'Tap a machine, or a drink on one, to say who you are talking to.' };
  const what = groups.filter(g => g.p === 'o');
  const to = groups.filter(g => g.p === 'ni' || g.p === 'nimo');
  if (what.length > 1) return { ok: false, need: 'One を per command. Join things with と: コーラと コーヒーを.' };
  if (to.length > 1) return { ok: false, need: 'One に per command. Join people with と: ケンジさんと ミオさんに.' };
  const mo = to.length === 1 && to[0].p === 'nimo';
  if (mo) {
    if (!ctx.last || ctx.last.machine !== machine) return { ok: false, need: 'にも repeats your last command for someone else. Say a command to this machine first.' };
    if (!ctx.moReady) return { ok: false, need: 'One にも after each command.' };
  }
  if (!what.length && !mo) return { ok: false, need: 'What should come out? Give it を.' };
  const whatIds = what.length ? what[0].nouns : ctx.last.what;
  return { ok: true, machine, what: whatIds, to: to.length ? to[0].nouns : [], mo };
}

const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = s => s[0].toUpperCase() + s.slice(1);

/** How a thing is named in English: "a cola", "Kenji", "the fridge", "everyone". */
export function nameEn(id, article = true) {
  const t = THINGS[id];
  if (t.kind === 'item') return article ? t.a : t.en;
  if (t.kind === 'machine') return `the ${t.en}`;
  return t.en;
}

/** The command in plain English, as literally as it reads. */
export function english(cmd, polite = false) {
  const m = THINGS[cmd.machine];
  const allTea = cmd.what.every(id => id === 'tea');
  const whatEn = list(cmd.what.map(id => nameEn(id)));
  const verb = m.verb === 'irete' && !allTea ? `put ${whatEn} in` : `${VERBS[m.verb].en} ${whatEn}`;
  let to = '';
  if (cmd.to.length) {
    const people = cmd.to.every(id => ['person', 'cat', 'all'].includes(THINGS[id].kind));
    to = ` ${people ? 'for' : 'into'} ${list(cmd.to.map(id => nameEn(id, false)))}`;
  }
  return `${cap(m.en)}, ${verb}${to}${cmd.mo ? ' too' : ''}${polite ? ', please' : ''}.`;
}

/** The English for the command so far, while it is being built (null when there is nothing yet). */
export function draft(tokens, machine) {
  const groups = [];
  let cur = [];
  for (const tok of tokens) {
    if (tok.t === 'n') cur.push(tok.id);
    else if (tok.p !== 'to') {
      groups.push({ nouns: cur, p: tok.p });
      cur = [];
    }
  }
  const bits = groups.map(g => {
    const names = list(g.nouns.map(id => nameEn(id, g.p === 'o')));
    return g.p === 'o' ? `what: ${names}` : g.p === 'nimo' ? `to ${names} too` : `to ${names}`;
  });
  if (cur.length) bits.push(`${list(cur.map(id => nameEn(id)))} …`);
  if (!bits.length && !machine) return null;
  return (machine ? `${cap(THINGS[machine].en)}: ` : '') + bits.join(' · ');
}

/**
 * One line after a command that did not go as wanted: what the particles said, in plain words.
 * res: the resolved command (sim.js). Returns the English line, or null when all went well.
 */
export function afterword(cmd, res) {
  const kinds = new Set(res.deliveries.map(d => d.kind));
  const firstOf = k => res.deliveries.find(d => d.kind === k);
  if (kinds.has('launch')) {
    const d = firstOf('launch');
    const where = d.to ? nameEn(d.to, false) : 'the tray';
    return `を marks what comes out: ${THINGS[d.what].en}. に marks where it goes: ${d.to ? where : 'nowhere, so the tray'}.`;
  }
  if (kinds.has('dodge')) return 'Tama is a cat. Cats don’t take orders, not even from Eric.';
  if (kinds.has('none')) {
    const d = firstOf('none');
    const t = THINGS[d.what];
    if (t.kind === 'item') return `The ${THINGS[cmd.machine].en} has no ${t.en}. ${cap(t.en)} comes from the ${THINGS[t.from].en}.`;
    return `The ${THINGS[cmd.machine].en} can’t put out ${nameEn(d.what)}.`;
  }
  if (kinds.has('into')) {
    const d = firstOf('into');
    return `に marks where it goes, so the ${THINGS[d.what].en} went into ${nameEn(d.to)}.`;
  }
  if (kinds.has('tray')) return 'Nothing had に, so nobody gets it: it dropped into the tray.';
  if (kinds.has('spare')) {
    const d = firstOf('spare');
    const want = res.wanted[d.to];
    const who = THINGS[d.to].en;
    return want ? `${who} asked for ${THINGS[want].en}, not ${THINGS[d.what].en}.` : `${who} didn’t ask for anything.`;
  }
  return null;
}
