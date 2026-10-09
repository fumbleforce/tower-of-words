// Standing data for the people Eric can bond with: tastes, the register they expect, the scenes that gate
// steps 3 to 5, and how they get on with each other. Only what day 1 shows or the walkthroughs
// (notes/walkthrough/) already settle. A story file can add to or override any of it with the same keys
// (story/FORMAT.md, "Sim data").
//
//   likes / dislikes: item ids (sim.js ITEMS, or any id for later items)
//   needs: [{ id, item, said }]: a gift that answers a need; `said` is the flag set when they say it out loud
//   register: 'casual' | 'polite', the Japanese they expect from Eric
//   gates: { 3: flag, 4: flag, 5: flag }: the arc scene each step waits on (default bond<n>_<id>)
//   rel: { other: 'likes' | 'owes' | 'rivals' }: how they stand with another person (one way)
export const CAST = {
  mio: {
    likes: ['coffee'],
    dislikes: ['cornsoup', 'tea'], // walkthrough/mio.md; melon soda is "a bit sweet" but no dislike
    register: 'casual',
    rel: { mori: 'likes' }, // she speaks for him on the train ("Mori-san is going to be so polite") and knows his soup
  },
  mori: {
    likes: ['cornsoup'],
    register: 'polite',
    rel: { mio: 'likes' }, // corrects her 外人 gently, the only time he interrupts
  },
  kenji: {
    likes: ['melon'],
    register: 'casual', // Eric is his senpai, so plain Japanese to him is fine
    rel: { mori: 'likes', mio: 'owes' }, // asks Mori about the new guy; Mio has barred him from the machine room
  },
  guard: { register: 'polite' },
  kuroda: {
    register: 'polite',
    rel: { guard: 'owes' }, // late through the gate every morning; the guard gets him through
  },
  kuro: { register: 'polite' },
  emi: {},
};

// the register of each word Eric can say (for the `register_<id>` flag)
export const WORD_REGISTER = {
  ohayo: 'polite',
  yoroshiku: 'polite',
  sumimasen: 'polite',
  matte: 'casual',
  akete: 'casual',
  kite: 'casual',
  ugoite: 'casual',
  irete: 'casual',
  dashite: 'casual',
  tomatte: 'casual',
};
