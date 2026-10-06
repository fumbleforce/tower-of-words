// #231 authoring pack. Merge each entry's nodes/on into its place only when its day/if applies.
// Props are read or handled in place, never album finds. No `find`, money or period hook.
// Claude places the targets at these existing nooks and implements flavorFind's physical states.
export const FINDS = [
  {
    id: 'umbrella_drain', from: 3, place: 'forecourt', at: 'forecourt_staff_gate',
    label: 'Umbrella stand', node: 'flavor_umbrella',
    staging: 'Frame a small handwritten card tied to the stand. Its reverse can be turned over in place; leave the umbrellas untouched.',
  },
  {
    id: 'crate_count', from: 3, place: 'shotengai', at: 'shotengai_back_alley',
    label: 'Crate tally', node: 'flavor_crates',
    staging: 'A delivery tally is tucked into the upper empty crate. The pencilled correction on its back belongs to the same card.',
  },
  {
    id: 'slipper_pair', from: 3, place: 'gym', at: 'gym_lockers',
    label: 'Borrowed slippers', node: 'flavor_slippers',
    staging: 'Two visibly different sizes in one cubby. The rubber band holds a paired-loan note; no attendant is required.',
  },
  {
    id: 'pool_key_tag', from: 3, until: 3, place: 'pool', at: 'pool_lost_property',
    if: "period == 'evening' && club_swimming", label: 'Key tag', node: 'flavor_key',
    staging: 'A large orange float is tied to the cupboard key on the table. Rotate it to reveal the words on its underside. Keep it here.',
  },
  {
    id: 'bench_letter', from: 4, place: 'sports', at: 'sports_grove_bench',
    label: 'Folded paper', node: 'flavor_letter',
    staging: 'A folded letter lies beside a lunch wrapper, weighted by its empty carton. Unfold only the outside flap, then refold it. No personal name or address is exposed.',
  },
  {
    id: 'ball_tube', from: 4, place: 'sports', at: 'court_corner',
    label: 'Ball tube', node: 'flavor_ball_tube',
    staging: 'An empty tennis-ball tube is fastened to the corner post. Tilt its attached pencil note without detaching anything.',
  },
  {
    id: 'catalogue_tabs', from: 4, place: 'karaoke', at: 'karaoke_bench',
    label: 'Tabbed catalogue', node: 'flavor_catalogue',
    staging: 'Open the catalogue to two paper tabs. The first printed title has been covered by a pencilled instruction; the second tab answers it.',
  },
  {
    id: 'cafe_cup', from: 4, place: 'east_lane', at: 'east_lane_footpath',
    label: 'Cafe cup', node: 'flavor_cup',
    staging: 'An empty reusable cup sits at the bench end, with a saucer over it. Lift the saucer to read the small cafe stamp and return it.',
  },
  {
    id: 'book_return', from: 5, place: 'dorm_commons', at: 'commons_books',
    label: 'Book return slip', node: 'flavor_book',
    staging: 'A language phrasebook lies open with its return slip as a bookmark. Show the margin correction next to the bookshop phrase, then close it.',
  },
  {
    id: 'fridge_saucer', from: 5, place: 'dorm_commons', at: 'commons_fridge',
    label: 'Saucer note', node: 'flavor_saucer',
    staging: 'A note is taped above a stack of clean saucers on the fridge, with a short reply written directly below. No food is taken.',
  },
  {
    id: 'telescope_coin', from: 5, place: 'east_coast', at: 'east_coast_lookout',
    label: 'Coin-return flap', node: 'flavor_coin',
    staging: 'The telescope still has its established free-use sign and taped slot. Lift its coin-return flap to reveal a repair note inside, then close it. No loose coin or wallet award.',
  },
  {
    id: 'training_lunch', from: 5, place: 'plaza', at: 'plaza_seat_bay',
    label: 'Lunch order sheet', node: 'flavor_lunch',
    staging: 'An old office lunch-order sheet has been folded under a short bench leg as a shim. The exposed edge is readable without pulling it out; keep the bench stable.',
  },
];
const look = (id, lines) => [
  { if: 'flavor_' + id + '_seen', then: [{ end: true }] },
  { do: 'flavorFind', id, state: 'look' }, ...lines,
  { do: 'flavorFind', id, state: 'putBack' },
  { set: 'flavor_' + id + '_seen' }, { do: 'cam', back: true }, { do: 'save' },
];
export const NODES = {
  flavor_umbrella: look('umbrella_drain', [
    '> “Please empty the tray underneath. Dry umbrellas don’t mean the tray is dry.”',
    { say: 'eric', emo: 'curious', text: 'I’d have missed that tray.' },
  ]),
  flavor_crates: look('crate_count', [
    '> “Returned: 12 bottles.” On the back: “11. One was your soy sauce.”',
  ]),
  flavor_slippers: look('slipper_pair', [
    '> “These belong together. His left foot swells after tennis.”',
    { say: 'eric', emo: 'warm', text: 'Fair enough. I nearly put them in separate cubbies.' },
  ]),
  flavor_key: look('pool_key_tag', [
    '> Under the float: “It floats with the key attached. We checked this time.”',
  ]),
  flavor_letter: look('bench_letter', [
    '> “Mum, I did cook. The photo is before I put the lid on.” The flap has a spot of dried rice on it.',
    { say: 'eric', emo: 'warm', text: 'I’ll leave that under the carton.' },
  ]),
  flavor_ball_tube: look('ball_tube', [
    '> “If your ball goes through here, please go round. The wire repair took all morning.”',
    { say: 'eric', emo: 'dry', text: 'I wasn’t going to fit through there anyway.' },
  ]),
  flavor_catalogue: look('catalogue_tabs', [
    '> First tab: “This one is too high.” Next tab: “Same singer. Still too high.”',
  ]),
  flavor_cup: look('cafe_cup', [
    '> The cafe stamp says “Please bring this back, even if you broke the handle.”',
    { say: 'eric', emo: 'curious', text: 'I wonder how many of these end up here.' },
  ]),
  flavor_book: look('book_return', [
    '> Beside “Where is the bookshop?” someone has written: “Ask whether it’s open first.”',
    { say: 'eric', emo: 'warm', text: 'Somebody found that out the hard way.' },
  ]),
  flavor_saucer: look('fridge_saucer', [
    '> “Please use these under your cups while drawing.” Reply: “We were drawing them. Sorry.”',
  ]),
  flavor_coin: look('telescope_coin', [
    '> “Coin box removed. This flap still sticks. Please don’t put money in to test it.”',
  ]),
  flavor_lunch: look('training_lunch', [
    '> The visible order reads “No pickles.” Under it: “Extra pickles if she doesn’t want them.”',
    { say: 'eric', emo: 'warm', text: 'I’d better leave that in place.' },
  ]),
};
