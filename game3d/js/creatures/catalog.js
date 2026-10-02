// Which birds and small animals are about in each outdoor place, and when (docs/game/places.md, each place's
// "Creatures" table, checked by tools/facts/check.mjs). Plain data, read by the game and the facts check.
//   id     the group's id in the doc
//   kind   pigeon | sparrow | crow | gull (birds), cat, butterfly | dragonfly
//   n      how many on the high graphics tier (medium shows three quarters, low half, at least one)
//   when   day (early morning to the afternoon), evening (after work) or all
//   coat   a cat's coat (models.js COATS)
// The birds' habits are in birds.js; where each place has room for them is surveyed in perches.js.
export const CREATURES = {
  forecourt: [
    { id: 'pigeons', kind: 'pigeon', n: 6, when: 'day' },
    { id: 'sparrows', kind: 'sparrow', n: 4, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'butterflies', kind: 'butterfly', n: 2, when: 'day' },
  ],
  plaza: [
    { id: 'pigeons', kind: 'pigeon', n: 8, when: 'day' },
    { id: 'sparrows', kind: 'sparrow', n: 4, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'butterflies', kind: 'butterfly', n: 3, when: 'day' },
    { id: 'dragonflies', kind: 'dragonfly', n: 3, when: 'day' },
    { id: 'cat', kind: 'cat', n: 1, when: 'evening', coat: 'tabby' },
  ],
  shotengai: [
    { id: 'pigeons', kind: 'pigeon', n: 5, when: 'day' },
    { id: 'sparrows', kind: 'sparrow', n: 3, when: 'day' },
    { id: 'gulls', kind: 'gull', n: 3, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'shop_cat', kind: 'cat', n: 1, when: 'all', coat: 'ginger' },
    { id: 'night_cat', kind: 'cat', n: 1, when: 'evening', coat: 'black' },
  ],
  east_lane: [
    { id: 'sparrows', kind: 'sparrow', n: 5, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'butterflies', kind: 'butterfly', n: 2, when: 'day' },
    { id: 'dragonflies', kind: 'dragonfly', n: 2, when: 'day' },
    { id: 'cat', kind: 'cat', n: 1, when: 'evening', coat: 'tabby' },
  ],
  east_coast: [
    { id: 'gulls', kind: 'gull', n: 5, when: 'day' },
    { id: 'sparrows', kind: 'sparrow', n: 3, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'butterflies', kind: 'butterfly', n: 2, when: 'day' },
    { id: 'dragonflies', kind: 'dragonfly', n: 3, when: 'day' },
  ],
  sports: [
    { id: 'pigeons', kind: 'pigeon', n: 5, when: 'day' },
    { id: 'sparrows', kind: 'sparrow', n: 4, when: 'day' },
    { id: 'crows', kind: 'crow', n: 3, when: 'all' },
    { id: 'butterflies', kind: 'butterfly', n: 2, when: 'day' },
    { id: 'dragonflies', kind: 'dragonfly', n: 4, when: 'day' },
    { id: 'cat', kind: 'cat', n: 1, when: 'evening', coat: 'black' },
  ],
  office_quarter: [
    { id: 'pigeons', kind: 'pigeon', n: 6, when: 'day' },
    { id: 'sparrows', kind: 'sparrow', n: 3, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'cat', kind: 'cat', n: 1, when: 'evening', coat: 'tabby' },
  ],
  // Grok, G-0033: "Sparrows by day, and a cat on a wall after work, not Tama ... Keep them off the sento doorway and
  // off the mailbox bank."
  dorm_court: [
    { id: 'sparrows', kind: 'sparrow', n: 4, when: 'day' },
    { id: 'cat', kind: 'cat', n: 1, when: 'evening', coat: 'tabby' },
  ],
  harbour: [
    { id: 'gulls', kind: 'gull', n: 7, when: 'day' },
    { id: 'night_gulls', kind: 'gull', n: 3, when: 'evening' },
    { id: 'pigeons', kind: 'pigeon', n: 4, when: 'day' },
    { id: 'crows', kind: 'crow', n: 2, when: 'all' },
    { id: 'harbour_cat', kind: 'cat', n: 1, when: 'all', coat: 'ginger' },
  ],
};

// things in a place that creatures keep clear of (3 m round where Eric stands to use them)
export const AVOID = { dorm_court: ['bath', 'dorm_entry', 'mailboxes', 'stairs'] };

export const BIRD_KINDS = ['pigeon', 'sparrow', 'crow', 'gull'];
export const INSECT_KINDS = ['butterfly', 'dragonfly'];
const TIER = { high: 1, medium: 0.75, low: 0.5 };
// how many of a group show on a graphics tier
export const countFor = (n, tier) => Math.max(1, Math.round(n * (TIER[tier] ?? 1)));
// is a group about in this period (sim.js PERIODS)?
export const about = (when, period) => when === 'all' || (when === 'evening') === (period === 'evening');
