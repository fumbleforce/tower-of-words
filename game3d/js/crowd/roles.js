// Shared native body choices, one row per role (Review crowd-everyday-2 for casual-1, older-1 and service-1;
// crowd-pilot-5 for the office pair A and B). Place preparation loads both a row's body and its fallback; the fallback
// is worn if the body fails to load. Clothing variants, props and seat placement remain with the role's caller.
export const EVERYDAY_ROLES = {
  casual: { body: 'casual-1' },
  // the joggers: the casual body in the sport palette (chibi-crowd.js variant of the hoodie)
  sport: { body: 'casual-1' },
  elder: { body: 'older-1' },
  apron: {
    body: 'service-1',
    places: ['bakery', 'konbini', 'canteen', 'plaza', 'ferry_terminal'],
  },
  // the seated residents of the canteen and the ferry terminal (places/canteen.js, ferry-terminal/residents.js), by
  // the chibi base they had: the young man in a shirt as office man A, the older woman in a cardigan as office woman
  // B, the older man in a polo as older-1
  shirt: { body: 'a', places: ['canteen'] },
  cardigan: { body: 'b', places: ['canteen', 'ferry_terminal'] },
  polo: { body: 'older-1', places: ['canteen', 'ferry_terminal'] },
  reader: { body: 'older-1', fallback: 'a', places: ['train'] },
  music: { body: 'casual-1', fallback: 'b', places: ['train'] },
  bun: { body: 'b', places: ['train'] },
  // the train's man with a bag (hidden since Jørgen read the dark standing man as a burglar; places/train.js) in A's
  // grey suit, standing
  stander: { body: 'a', places: ['train'] },
  // the station garden's grounds worker (places/station-garden/), older-1 in a work jacket
  grounds: { body: 'older-1', places: ['shotengai'] },
  // day 3's gym attendant and swimming club member (places/day-cast.js): office workers' bodies, as before
  attendant: { body: 'a', places: ['gym', 'pool'] },
  member: { body: 'b', places: ['pool', 'sports'] },
};
