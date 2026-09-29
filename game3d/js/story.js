// Story helpers: speakers, offering a command in a line, default reactions, walking people around.
import * as THREE from 'three';
import { ui, voice, sfx } from './ui.js';
import { WORDS, learn, cmdHTML, lineHTML } from './lang.js';
import { walkPose, HIP } from './cast.js';
import { personStep } from './move.js';

export const WHO = {
  aoi: { name: 'Aoi', color: '#e79fb0' },
  mio: { name: 'Mio', role: 'you', color: '#5fc6bf' },
  guard: { name: 'Mr. Ishibashi', role: 'security', color: '#8ea2c8' },
  kuroda: { name: 'Mr. Kuroda', role: 'accounts', color: '#b3a58f' },
  emi: { name: 'Emi', role: 'your team lead', color: '#e0906f' },
  kenji: { name: 'Kenji', role: 'your team', color: '#9fb6d8' },
  yui: { name: 'Yui', role: 'your team', color: '#d7b27e' },
  sota: { name: 'Sota', role: 'your team', color: '#9cc39a' },
  mori: { name: 'Mr. Mori', role: 'section chief', color: '#b9a3d3' },
  ann: { name: 'Announcement', color: '#9aa9bd' },
};

// A line that hands Mio a command: one big button with the Japanese, reading and English.
// Resolves once she has said it.
export async function offerCmd(who, line, id, { voiceKey } = {}) {
  await ui.choose(who, line, [{ html: cmdHTML(id), cls: 'cmdchip' }], { voiceKey });
  voice(WORDS[id].voice);
  if (learn(id)) {
    sfx('word');
    ui.refreshWords();
    ui.toast(`New command: <span class="jp">${WORDS[id].ja}</span> <span class="gl">${WORDS[id].ro}, ${WORDS[id].en}</span>`, 3200);
  }
  await new Promise((r) => setTimeout(r, 500));
}

// What happens when you say a command to something that has no special reaction.
export function defaultReaction(item, id) {
  const n = item.label;
  const person = /person/.test(item.kind || '');
  const P = {
    matte: [`${n} waits politely for the rest of the sentence. There isn't one.`, `${n} freezes for a second. "...Yes?"`],
    akete: [`${n} looks at you. "Open... what, exactly?"`, `${n} opens their mouth to answer, then closes it again.`],
    kite: [`${n} takes one step toward you. "Yes? Something wrong?"`, `${n} leans over. You didn't actually need anything.`],
    ugoite: [`${n} shuffles a little to the side. "Sorry, was I in the way?"`, `${n} stretches, as if that's what you meant.`],
    ohayo: [`${n} nods back. "Ohayō gozaimasu."`, `${n} bows a little and says it back.`],
    yoroshiku: [`${n} looks surprised, then bows. "Yoroshiku onegaishimasu."`, `${n} returns the bow, a little deeper than yours.`],
    sumimasen: [`${n} waits, eyebrows up, for whatever comes next.`, `${n} looks where you're pointing, then back at you.`],
    irete: [`${n} glances at the kettle, then at you. "Is that a hint?"`, `${n} looks around for a cup that isn't there.`],
    dashite: [`${n} pats their pockets. "I don't have anything. Sorry."`, `${n} holds out an empty hand, unsure.`],
    tomatte: [`${n} stops, mid-thought. "...What did I do?"`, `${n} freezes, then laughs. "Was I doing something?"`],
  };
  const T = {
    matte: ['It waits. It was already waiting.', 'Nothing moves. Then again, nothing was moving.'],
    akete: ["It doesn't open. Some things are just shut.", 'It stays closed. It seems a little smug about it.'],
    kite: ['It stays where it is. Fair enough.', "It doesn't come. It has nowhere to be."],
    ugoite: ["Nothing happens. It isn't that kind of thing.", 'It sits there. You feel slightly silly.'],
    ohayo: ["It doesn't say good morning back.", 'Good morning to it, then.'],
    yoroshiku: ['It accepts your bow in silence.', 'A polite start. It says nothing.'],
    sumimasen: ['You apologise to it. It seems to accept.', 'Nobody minds.'],
    irete: ['There is nothing here to pour.', 'It does not make tea. Few things do.'],
    dashite: ['Nothing comes out.', 'It keeps what it has.'],
    tomatte: ['It was already stopped.', 'It stops even harder, somehow.'],
  };
  const list = (person ? P : T)[id] || ['Nothing happens.'];
  item._n = (item._n || 0) + 1;
  return list[item._n % list.length];
}

// a person walking along waypoints (chibi rig), resolves on arrival
export function walkPerson(rig, pts, { speed = 1.2, blobM } = {}) {
  return new Promise((res) => {
    const path = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
    let ph = 0;
    rig._walk = (dt) => {
      const p = rig.root.position, t = path[0];
      if (!t) { walkPose(rig, 0, 0); rig.hips.position.y = HIP; rig._walk = null; res(); return; }
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      if (d < 0.05) { path.shift(); return; }
      const s = Math.min(d, speed * dt);
      // people keep their distance: hold back behind someone, slide round them (move.js personStep)
      const [qx, qz] = personStep(window.__game, rig, p.x, p.z, p.x + (t.x - p.x) / d * s, p.z + (t.z - p.z) / d * s, dt);
      p.x = qx; p.z = qz;
      const want = Math.atan2(t.x - p.x, t.z - p.z);
      let a = want - rig.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
      rig.root.rotation.y += a * Math.min(1, dt * 10);
      ph += dt * 9.5; walkPose(rig, ph, 1);
      if (blobM) blobM.position.set(p.x, 0.004, p.z);
    };
  });
}
export function stepPeople(list, dt) { for (const r of list) if (r && r._walk) r._walk(dt); }

// turn a rig's head toward a point, smoothly
export function lookAt(rig, x, z, k = 1) {
  const p = rig.root.position;
  const want = Math.atan2(x - p.x, z - p.z) - rig.root.rotation.y;
  const a = Math.atan2(Math.sin(want), Math.cos(want));
  rig.head.rotation.y += (THREE.MathUtils.clamp(a, -1.1, 1.1) * 0.7 * k - rig.head.rotation.y) * 0.1;
}

export { lineHTML };
