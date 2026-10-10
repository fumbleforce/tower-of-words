// What each selectable thing's action menu does right now, worked out from the story and the thing itself rather than
// from the menu code, so a menu row that does nothing shows up (issue #128). Runs in the page: pass `menuEffects` to
// page.evaluate, or install `sampleMenuEffects` to record every moment of a played day.
//
// A thing is selectable when its marker is enabled. Its effects: a person (Talk always does something: their talk,
// idle line or a nod), an act or look of its own, a talk: entry that holds now with a non-empty node, being the goal,
// or Say: a word Eric knows with a say: entry for it (or for anything). A thing has no generic reply to a word any
// more (Jørgen, 2026-10-10), so a thing with nothing of its own is a fault. Say counts only where the menu offers it
// (during the first minutes, only at the goal).
// Faults: selectable with no effect at all ("nothing"), or an E row whose use does nothing ("E does nothing").
export async function menuEffects() {
  const G = globalThis.__game;
  const at = (p) => new URL(p, globalThis.location.href).href;
  const { known, SAYABLE } = await import(at('js/lang.js'));
  const { isPerson } = await import(at('js/gameplay/idle-talk.js'));
  const ob = globalThis.__onboard || {};
  const R = G.runner;
  const out = [];
  for (const m of G.markers.list) {
    if (!m.enabled()) continue;
    const fx = [];
    const person = isPerson(G, m);
    if (person) fx.push('talk');
    if (m.act) fx.push('act');
    if (m.look) fx.push('look');
    const node = R.resolve('talk:' + m.id, { peek: true });
    const talkNode = !!node && (G.story.nodes?.[node]?.length ?? 1) > 0;
    if (!person && talkNode) fx.push('talk:' + node);
    const goal = !!m.goal?.();
    if (goal) fx.push('goal');
    const sayOpen = !ob.active || ob.sayUsed || goal;
    const words = SAYABLE.filter((w) => known.has(w) && (R.has(`say:${w}:${m.id}`) || R.has(`say:${w}:*`)));
    const use = G.canUse(m);
    if (sayOpen && words.length) fx.push('say:' + words.join('/'));
    const faults = [];
    if (!fx.length) faults.push('nothing');
    if (use && !(person || m.act || m.look || talkNode)) faults.push('E does nothing');
    out.push({ id: m.id, label: m.label, fx, faults, node });
  }
  return { place: G.place?.name, goal: G.ui.goalText || '', out };
}

// sample the menus through a played day (every 150 ms while no scene runs); read the log from globalThis.__menuFx
export function sampleMenuEffects(src) {
  const fn = new Function(`return (${src})`)();
  const log = (globalThis.__menuFx = { samples: 0, faults: {}, selectable: {} });
  let running = false;
  setInterval(async () => {
    const G = globalThis.__game;
    if (running || !G?.place || G.busy || !G.markers) return;
    running = true;
    try {
      const r = await fn();
      log.samples++;
      const sel = (log.selectable[r.place] ||= {});
      for (const t of r.out) {
        sel[t.id] = t.fx.join(' ') || '(none)';
        for (const f of t.faults) {
          const k = `${r.place} ${t.id}: ${f}`;
          log.faults[k] ||= `goal "${r.goal}", talk node ${t.node}, effects: ${t.fx.join(' ') || 'none'}`;
        }
      }
    } finally {
      running = false;
    }
  }, 150);
}
