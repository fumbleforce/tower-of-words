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
function steps(list, ind, out) {
  for (const st of list || []) {
    const p = '  '.repeat(ind);
    if (st.bg) out.push(`${p}[scene: ${st.bg}]`);
    if (st.clock) out.push(`${p}[clock ${st.clock}]`);
    if (st.narrate) out.push(`${p}(${st.narrate})`);
    if (st.say) { const n = len(st.jp); out.push(`${p}${name(st.say)}${st.off ? ' (voice only)' : ''}${st.expr ? ` [${st.expr}]` : ''}: ${plain(st.jp)}  /  ${st.en || ''}${n > 24 ? `  ⚠ ${n} chars` : ''}`); if (n > 24) lint.push(plain(st.jp)); }
    if (st.sign) out.push(`${p}[${st.sign.kind || 'sign'}] ${plain(st.sign.jp)}  /  ${st.sign.en}`);
    if (st.onboarding) out.push(`${p}[phone: new-hire app: welcome, name for the ID card, island map, room 203, ID card, then the Japanese check or a preset]`);
    if (st.noise) out.push(`${p}[noise +${st.noise}]`);
    if (st.sus) out.push(`${p}[suspicion ${Object.entries(st.sus).map(([k, v]) => `${k} +${v}`).join(', ')}]`);
    if (st.set) out.push(`${p}[set ${Object.keys(st.set).join(', ')}]`);
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
    for (const k of ['ifLate', 'if', 'ifTime', 'ifRel', 'ifNoise', 'ifCasts', 'ifWithin']) if (st[k] !== undefined) {
      const cond = k === 'ifTime' ? `time after ${st.ifTime.after}` : k === 'ifRel' ? `${st.ifRel.who} ${'atLeast' in st.ifRel ? '>= ' + st.ifRel.atLeast : '< ' + st.ifRel.below}` : k === 'ifLate' ? `late after ${st.ifLate}`
        : k === 'ifNoise' ? `noise >= ${st.ifNoise}` : k === 'ifCasts' ? `casts so far <= ${st.ifCasts}` : k === 'ifWithin' ? `back within ${st.ifWithin.min} min of ${st.ifWithin.since}` : st.if;
      const t = k === 'ifTime' || k === 'ifRel' || k === 'ifWithin' ? st[k] : st;
      out.push(`${p}IF ${cond}:`); steps(t.then, ind + 1, out);
      if (t.else) { out.push(`${p}ELSE:`); steps(t.else, ind + 1, out); }
    }
    if (st.choose) {
      out.push(`${p}CHOICE${st.choose.chat ? ' (chat)' : ''}${st.choose.until ? ` (comes back until ${st.choose.until})` : ''}: ${plain(st.choose.prompt || '')}`);
      st.choose.options.forEach((o, i) => { out.push(`${p}  ${i + 1}) You: ${plain(o.jp)}  /  ${o.en}${o.if ? `  [only if ${o.if}]` : ''}${o.magic ? '  [kotodama]' : ''}${o.retry ? '  [back to the choice]' : ''}`); steps(o.then, ind + 2, out); });
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
