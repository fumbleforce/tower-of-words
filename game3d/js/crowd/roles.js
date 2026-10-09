// Shared native body choices, one row per role. Clothing variants, props and seat placement remain with the role's
// caller. A row's fallback is used while its body isn't installed: main has only the office pair A and B so far, so
// the train uses A and B until the casual-1 and older-1 bodies from crowd-everyday-2 are integrated (#353).
export const EVERYDAY_ROLES = {
  reader: { body: 'older-1', fallback: 'a', places: ['train'] },
  music: { body: 'casual-1', fallback: 'b', places: ['train'] },
  bun: { body: 'b', places: ['train'] },
};
