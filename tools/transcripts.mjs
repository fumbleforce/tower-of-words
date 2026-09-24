// Dump every scene of every day as a readable branching transcript: speaker: Japanese / English.
// Choices list each option with its branch indented; ifs show both sides. Output: game/notes/transcripts/dayN.md
import fs from 'node:fs';
const { SCENES: D1, CAST, SPELLS } = await import('../game/data/script.js');
const days = { 1: D1 };
for (const d of [2, 3, 4, 5]) days[d] = (await import(`../content/day${d}.js`)).SCENES;
const plain = s => (s || '').replace(/\{([^}|]+)(?:\|[^}]*)?\}/g, '$1');
const name = k => (CAST[k] ? `${CAST[k].en}` : k);
function steps(list, ind, out) {
  for (const st of list || []) {
    const p = '  '.repeat(ind);
    if (st.bg) out.push(`${p}[scene: ${st.bg}]`);
    if (st.clock) out.push(`${p}[clock ${st.clock}]`);
    if (st.narrate) out.push(`${p}(${st.narrate})`);
    if (st.say) out.push(`${p}${name(st.say)}: ${plain(st.jp)}  /  ${st.en || ''}`);
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
    for (const k of ['ifLate', 'if', 'ifTime', 'ifRel']) if (st[k] !== undefined) {
      const cond = k === 'ifTime' ? `time after ${st.ifTime.after}` : k === 'ifRel' ? `${st.ifRel.who} ${'atLeast' in st.ifRel ? '>= ' + st.ifRel.atLeast : '< ' + st.ifRel.below}` : k === 'ifLate' ? `late after ${st.ifLate}` : st.if;
      const t = k === 'ifTime' || k === 'ifRel' ? st[k] : st;
      out.push(`${p}IF ${cond}:`); steps(t.then, ind + 1, out);
      if (t.else) { out.push(`${p}ELSE:`); steps(t.else, ind + 1, out); }
    }
    if (st.choose) {
      out.push(`${p}CHOICE: ${st.choose.prompt || ''}`);
      st.choose.options.forEach((o, i) => { out.push(`${p}  ${i + 1}) You: ${plain(o.jp)}  /  ${o.en}${o.if ? `  [only if ${o.if}]` : ''}`); steps(o.then, ind + 2, out); });
    }
    if (st.spell) {
      const sp = typeof st.spell === 'string' ? SPELLS[st.spell] : st.spell;
      out.push(`${p}SPELL: ${sp.goal} (answer ${sp.answer})`);
      out.push(`${p}  success:`); steps(sp.success, ind + 2, out);
      for (const [k, v] of Object.entries(sp.outcomes || {})) { out.push(`${p}  if cast ${k}:`); steps(v, ind + 2, out); }
    }
    if (st.summary) out.push(`${p}[end of day summary]`);
    if (st.goto) out.push(`${p}→ ${st.goto}`);
  }
}
fs.mkdirSync('game/notes/transcripts', { recursive: true });
for (const [d, sc] of Object.entries(days)) {
  const out = [`# Day ${d}`, ''];
  for (const [id, list] of Object.entries(sc)) { out.push(`## ${id}`); steps(list, 0, out); out.push(''); }
  fs.writeFileSync(`game/notes/transcripts/day${d}.md`, out.join('\n'));
  console.log(`day${d}`, out.length, 'lines');
}
