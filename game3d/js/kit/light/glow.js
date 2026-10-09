// The night glow of one place: everything that lights up after dark (lamps, lit windows, signs, lit glass) is
// registered here once, while it is in its daytime state, and set(night) switches all of it either way. Going back
// to day puts every value back exactly as it was built (notes/lighting-system.md).
//
// A builder returns its glows as a list of entries, and the place's rig takes them (rig.glow.add(...entries)):
//   { mat, night: { color, emissive, emissiveIntensity } }   a material that glows; only the keys given change
//   { show: mesh }                                             a mesh drawn only at night (lit window panes)
//   { pool: mesh, night: k }                                   a lamp's light pool (outdoor/parts.js pools): k at
//                                                              night, times the look's pool gain
//   { set(night, look) }                                       anything else: called with the switch and the look
// The same material registered twice is recorded once, so a shared material keeps its true daytime values.

const KEYS = ['color', 'emissive', 'emissiveIntensity'];
const copyOf = (v) => (v && v.clone ? v.clone() : v);
function assign(m, key, v) {
  if (v == null) return;
  if (m[key] && m[key].set && m[key].copy) {
    if (typeof v === 'object' && v.isColor) m[key].copy(v);
    else m[key].set(v);
  } else m[key] = v;
}

export function glowSet() {
  const mats = new Map(), // material -> { day, night }
    shows = new Set(),
    pools = new Map(), // mesh -> { k: daytime strength, night }
    custom = [];
  const set = {
    add(...entries) {
      for (const e of entries.flat()) {
        if (!e) continue;
        if (e.mat) {
          const rec = mats.get(e.mat);
          if (rec) Object.assign(rec.night, e.night);
          else {
            const day = {};
            for (const k of KEYS) day[k] = copyOf(e.mat[k]);
            mats.set(e.mat, { day, night: { ...e.night } });
          }
        } else if (e.show) shows.add(e.show);
        else if (e.pool) pools.set(e.pool, { k: e.pool.userData.k, night: e.night });
        else if (e.set) custom.push(e);
      }
      return set;
    },
    // night: true lights everything; look: the period's look (its `pool` gain)
    set(night, look = {}) {
      for (const [m, { day, night: lit }] of mats) {
        for (const k of KEYS) if (k in lit) assign(m, k, night ? lit[k] : day[k]);
      }
      for (const mesh of shows) mesh.visible = !!night;
      for (const [mesh, { k, night: kn }] of pools) {
        mesh.userData.gain = night ? (look.pool ?? 1) : 1;
        mesh.userData.set(night ? kn : k);
      }
      for (const e of custom) e.set(!!night, look);
    },
    get size() {
      return mats.size + shows.size + pools.size + custom.length;
    },
  };
  return set;
}
