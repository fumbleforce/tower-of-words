// Dump every scene of every day as a readable branching transcript: speaker: Japanese / English.
// Choices list each option with its branch indented; ifs show both sides. Output: game/notes/transcripts/dayN.md
import fs from 'node:fs';
const { SCENES: D1, CAST, SPELLS } = await import('../game/data/script.js');
const days = { 1: D1 };
for (const d of [2, 3, 4, 5]) days[d] = (await import(`../content/day${d}.js`)).SCENES;
const plain = s => (s || '').replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');
const name = k => (CAST[k] ? `${CAST[k].en}` : k);
// Pacing lint: spoken lines over 24 characters (punctuation not counted) are flagged in the transcript.
const len = s => plain(s).replace(/[、。？！…「」　\s・]/g, '').length;
const lint = [];
let reiUnnamed = false;
function steps(list, ind, out) {
  for (const st of list || []) {
    const p = '  '.repeat(ind);
    if (st.bg) out.push(`${p}[scene: ${st.bg}${['carriage', 'reveal', 'doors', 'platform'].includes(st.bg) ? ', placeholder art' : ''}]`);
    if ('insert' in st) out.push(`${p}[${st.insert ? `prop on screen: ${st.insert}` : 'prop closes'}]`);
    if ('hand' in st) out.push(`${p}[${st.hand ? `your phone: ${st.hand.mode}${st.hand.mode === 'photo' ? ` from ${name(st.hand.from)}: ${plain(st.hand.jp)}  /  ${st.hand.en}  → Keep this photo` : st.hand.mode === 'voicemail' ? ' (tap Play)' : ''}` : 'phone closes'}]`);
    if (st.tone) out.push(`${p}[sound: ${st.tone}]`);
    if (st.findEntrance) out.push(`${p}[Emi's photo shown; tap the matching entrance: ${st.findEntrance.prompt}]`);
    if (st.autosave) out.push(`${p}[autosave]`);
    if (st.clock) out.push(`${p}[clock ${st.clock}]`);
    if (st.narrate) out.push(`${p}(${st.narrate})`);
    if (st.say) {
      const n = len(st.jp), who = st.say === 'rei' && reiUnnamed ? 'Woman' : name(st.say);
      if (st.cap) out.push(`${p}(${st.cap})`);
      out.push(`${p}${who}${st.via ? ` (${st.via})` : st.off ? ' (voice only)' : ''}${st.expr ? ` [${st.expr}]` : ''}: ${plain(st.jp)}  /  ${st.en || ''}${st.cue ? `  [tap cue: ${st.cue === 'tap' ? '"Tap a word for help."' : '"Tap again for the meaning." after the first tap'}]` : ''}${n > 24 ? `  ⚠ ${n} chars` : ''}`);
      if (st.alt) out.push(`${p}  (supported version, if help was needed on 3+ lines: ${plain(st.alt.jp)}  /  ${st.alt.en})`);
      if (n > 24) lint.push(plain(st.jp));
    }
    if (st.sign) out.push(`${p}[${st.sign.kind || 'sign'}] ${plain(st.sign.jp)}  /  ${st.sign.en}`);
    if (st.noise) out.push(`${p}[noise +${st.noise}]`);
    if (st.sus) out.push(`${p}[suspicion ${Object.entries(st.sus).map(([k, v]) => `${k} +${v}`).join(', ')}]`);
    if (st.set) { out.push(`${p}[set ${Object.entries(st.set).map(([k, v]) => (v === false ? `${k} = false` : k)).join(', ')}]`); if ('reiNamed' in st.set) reiUnnamed = !st.set.reiNamed; }
    if (st.unset) out.push(`${p}[unset ${st.unset.join(', ')}]`);
    if (st.time) out.push(`${p}[time +${st.time}]`);
    if (st.stamp) out.push(`${p}[stamp ${st.stamp}]`);
    if (st.show) out.push(`${p}[show ${st.show}${st.expr ? ' ' + st.expr : ''}]`);
    if (st.hideAll) out.push(`${p}[everyone leaves the frame]`);
    if (st.msg) out.push(`${p}[message from ${name(st.msg.from)}] ${plain(st.msg.jp)}  /  ${st.msg.en}`);
    if (st.task) out.push(`${p}[task: ${plain(st.task)}]`);
    if (st.pin) out.push(`${p}[pin: ${st.pin.prompt} ${st.pin.fields.map(f => `${f.labelEn || plain(f.label)} → ${(f.en || f.options.map(plain))[f.answer]}`).join('; ')}]`);
    if (st.elevator) out.push(`${p}[elevator to ${st.elevator.target}]`);
    if (st.menu) out.push(`${p}[menu: ${st.menu.items.map(i => `${plain(i.jp)} ${i.price}`).join(', ')}]`);
    if (st.pay) out.push(`${p}[pay from wallet ${st.pay.wallet.join('/')}]`);
    if (st.learnSpell) out.push(`${p}[learn spell ${st.learnSpell.form}]`);
    if (st.reward) out.push(`${p}[reward: ${st.reward.caption}]`);
    if (st.freeTalk) { out.push(`${p}[free talk with ${name(st.freeTalk.with)}: ${st.freeTalk.goal}] fallback:`); steps(st.freeTalk.fallback, ind + 1, out); }
    if (st.freeReply) { out.push(`${p}[typed reply: ${st.freeReply.prompt}]`); steps(st.freeReply.then, ind + 1, out); }
    if (st.findLabel) out.push(`${p}[find label: ${st.findLabel.options.map(plain).join(' | ')} → ${plain(st.findLabel.options[st.findLabel.answer])}]`);
    for (const k of ['ifLate', 'if', 'ifTime', 'ifRel', 'ifNoise', 'ifCasts', 'ifWithin', 'ifSupport']) if (st[k] !== undefined) {
      const cond = k === 'ifSupport' ? 'the player needed help on 3+ lines (supported version)' : k === 'ifTime' ? `time after ${st.ifTime.after}` : k === 'ifRel' ? `${st.ifRel.who} ${'atLeast' in st.ifRel ? '>= ' + st.ifRel.atLeast : '< ' + st.ifRel.below}` : k === 'ifLate' ? `late after ${st.ifLate}`
        : k === 'ifNoise' ? `noise >= ${st.ifNoise}` : k === 'ifCasts' ? `casts so far <= ${st.ifCasts}` : k === 'ifWithin' ? `back within ${st.ifWithin.min} min of ${st.ifWithin.since}` : st.if;
      const t = k === 'ifTime' || k === 'ifRel' || k === 'ifWithin' || k === 'ifSupport' ? st[k] : st;
      out.push(`${p}IF ${cond}:`); steps(t.then, ind + 1, out);
      if (t.else) { out.push(`${p}ELSE:`); steps(t.else, ind + 1, out); }
    }
    if (st.choose) {
      out.push(`${p}CHOICE${st.choose.chat ? ' (chat)' : ''}${st.choose.until ? ` (comes back until ${st.choose.until})` : ''}: ${plain(st.choose.prompt || '')}`);
      st.choose.options.forEach((o, i) => { out.push(`${p}  ${i + 1}) ${o.act ? `[${o.act}]${o.says ? ` You: ${plain(o.says)}` : ''}` : `You${st.choose.where === 'phone' ? ' (voice reply)' : ''}: ${plain(o.jp)}  /  ${o.en}`}${o.alt ? `  (supported: ${plain(o.alt.jp)} / ${o.alt.en}, only if ${o.alt.needKnown} is known)` : ''}${o.if ? `  [only if ${o.if}]` : ''}${o.magic ? '  [kotodama]' : ''}${o.retry ? '  [back to the choice]' : ''}`); steps(o.then, ind + 2, out); });
    }
    if (st.spell) {
      const sp = typeof st.spell === 'string' ? SPELLS[st.spell] : st.spell;
      out.push(`${p}SPELL: ${sp.goal} (verbs ${sp.verbs.map(v => v.key).join(', ')}; answer ${sp.answer}${st.witnesses != null ? `; witnesses ${st.witnesses}` : ''})`);
      if (sp.hints) out.push(`${p}  hints: ${sp.hints.join(' → ')}`);
      out.push(`${p}  cast ${sp.answer} (works):`); steps(sp.success, ind + 2, out);
      for (const [k, v] of Object.entries(sp.pass || {})) { out.push(`${p}  cast ${k} (works, overdone):`); steps(v, ind + 2, out); }
      for (const [k, v] of Object.entries(sp.outcomes || {})) { out.push(`${p}  cast ${k}${k === 'default' ? ' (anything else)' : ''} (${sp.noRetry ? 'back to the choice' : 'retry'}):`); steps(v, ind + 2, out); }
      if (sp.giveUp) { out.push(`${p}  stop, or out of voice:`); steps(sp.giveUp, ind + 2, out); }
    }
    if (st.summary) out.push(`${p}[end of day summary]`);
    if (st.goto) out.push(`${p}→ ${st.goto}`);
  }
}
fs.mkdirSync('game/notes/transcripts', { recursive: true });
for (const [d, sc] of Object.entries(days)) {
  const out = [`# Day ${d}`, ''];
  for (const [id, list] of Object.entries(sc)) { out.push(`## ${id}`); steps(list, 0, out); out.push(''); }
  if (d === '1' && lint.length) out.push('', '## Pacing lint', ...lint.map(l => `- over 24 characters: ${l}`));
  fs.writeFileSync(`game/notes/transcripts/day${d}.md`, out.join('\n'));
  console.log(`day${d}`, out.length, 'lines');
}
