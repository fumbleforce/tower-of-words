import { group, box, cylinder, loop, paper, book, cup, saucer, dynamic } from './shapes.js';
// Each entry returns the exact moving part and its reversible local motion. Static notes still get a readable view.
export function makeObject(id) {
  const root = group();
  let moving = null,
    axis = null,
    amount = 0;
  const note = (lines, w, h) => paper(root, lines, w, h);
  const flat = (o, y = 0.005) => {
    o.rotation.x = -Math.PI / 2;
    o.position.y = y;
    return o;
  };
  if (id === 'umbrella_drain') {
    box(root, 0.008, 0.16, 0.008, '#87938b', 0, 0.08);
    moving = note(['Empty the tray', 'underneath.'], 0.23, 0.15);
    moving.position.y = 0.01;
    axis = 'rotation.y';
    amount = Math.PI;
  } else if (id === 'crate_count') {
    // An empty top crate above the existing return stack, with open sides and no added bottles.
    box(root, 0.43, 0.025, 0.35, '#537c87', 0, -0.01);
    for (const x of [-0.2, 0.2]) box(root, 0.025, 0.17, 0.35, '#537c87', x, 0.08);
    for (const z of [-0.16, 0.16]) box(root, 0.43, 0.06, 0.025, '#537c87', 0, 0.13, z);
    moving = flat(note(['Returned: 12 bottles', '11. One was soy sauce.'], 0.23, 0.16), 0.06);
    axis = 'rotation.x';
    amount = Math.PI;
  } else if (id === 'slipper_pair') {
    // A matched loan pair, visibly unequal lengths, laid within an existing locker opening.
    for (const [x, length] of [
      [-0.066, 0.21],
      [0.066, 0.28],
    ]) {
      box(root, 0.1, 0.025, length, '#648d77', x, 0.02);
      box(root, 0.1, 0.04, length * 0.5, '#86ad91', x, 0.045, -length * 0.19);
    }
    box(root, 0.25, 0.004, 0.015, '#cba58b', 0, 0.07);
    flat(note(['These belong together.', 'Left foot swells after tennis.'], 0.24, 0.12), 0.078);
  } else if (id === 'pool_key_tag') {
    moving = group();
    root.add(moving);
    box(moving, 0.24, 0.075, 0.12, '#e87f38', 0, 0.04);
    loop(moving, 0.035, 0.008, '#939fa5', 0.17, 0.025).rotation.x = Math.PI / 2;
    box(moving, 0.025, 0.013, 0.11, '#939fa5', 0.17, 0.024, 0.07);
    const n = paper(moving, ['Floats with key attached.', 'We checked this time.'], 0.21, 0.1);
    n.rotation.x = Math.PI / 2;
    n.position.y = -0.003;
    axis = 'rotation.x';
    amount = Math.PI;
  } else if (id === 'bench_letter') {
    box(root, 0.28, 0.008, 0.18, '#efeee7');
    moving = group();
    root.add(moving);
    moving.position.z = -0.09;
    const n = paper(moving, ['Mum, I did cook.', 'The photo is before the lid.'], 0.27, 0.17);
    n.rotation.x = -Math.PI / 2;
    n.position.set(0, 0.01, 0.085);
    cylinder(moving, 0.009, 0.003, '#e2ddc7', 0.09, 0.013, 0.11);
    box(root, 0.17, 0.1, 0.11, '#819fad', 0.22, 0.05, 0.07);
    box(root, 0.17, 0.003, 0.14, '#cbd1c8', -0.2, 0.004);
    axis = 'rotation.x';
    amount = -1.65;
  } else if (id === 'ball_tube') {
    cylinder(root, 0.07, 0.35, '#7c9a82');
    cylinder(root, 0.056, 0.005, '#273e39', 0, 0.178);
    for (const y of [-0.12, 0.12]) box(root, 0.08, 0.02, 0.15, '#8a9b9a', 0, y, -0.045);
    moving = note(['Please go round.', 'Wire repair took all morning.'], 0.29, 0.16);
    moving.position.set(0, -0.04, 0.08);
    axis = 'rotation.x';
    amount = -0.65;
  } else if (id === 'catalogue_tabs' || id === 'book_return') {
    moving = book(root);
    axis = 'rotation.z';
    amount = Math.PI * 0.92;
    const words =
      id === 'catalogue_tabs'
        ? ['This one is too high.', 'Same singer. Still too high.']
        : ['Where is the bookshop?', 'Ask if it is open first.'];
    flat(note(words, 0.34, 0.22), 0.051);
    if (id === 'book_return') moving.rotation.z = amount;
    for (const [z, col] of [
      [-0.06, '#aac6d6'],
      [0.08, '#c4d3b2'],
    ])
      box(root, 0.08, 0.005, 0.06, col, 0.2, 0.06, z);
  } else if (id === 'cafe_cup') {
    cup(root);
    moving = saucer(root, 0.2);
    axis = 'position.y';
    amount = 0.2;
    flat(note(['Please bring this back,', 'even with a broken handle.'], 0.18, 0.12), 0.19);
  } else if (id === 'fridge_saucer') {
    for (let i = 0; i < 4; i++) saucer(root, 0.012 + i * 0.018);
    const n = note(['Use these under your cups.', 'We were drawing them. Sorry.'], 0.38, 0.22);
    n.position.set(0, 0.22, -0.24);
    box(root, 0.09, 0.025, 0.004, '#b5c9c0', 0, 0.33, -0.238);
  } else if (id === 'telescope_coin') {
    box(root, 0.16, 0.13, 0.02, '#223942', 0, -0.015, -0.007);
    const n = note(['Coin box removed.', 'Do not test with money.'], 0.15, 0.1);
    n.position.z = 0.005;
    moving = group();
    root.add(moving);
    moving.position.y = 0.065;
    box(moving, 0.17, 0.14, 0.015, '#819dad', 0, -0.07, 0.014);
    axis = 'rotation.x';
    amount = -1.5;
  } else if (id === 'training_lunch') {
    box(root, 0.2, 0.025, 0.14, '#eeeade');
    flat(note(['No pickles.', 'Extra if she does not want them.'], 0.25, 0.14), 0.014);
  } else throw new Error(`Unbuilt flavor find: ${id}`);
  dynamic(root);
  const initial = moving && axis ? moving[axis.split('.')[0]][axis.split('.')[1]] : 0;
  return {
    root,
    moving,
    axis,
    initial,
    amount,
    move(k, returning = false) {
      if (!moving || !axis) return;
      const [field, component] = axis.split('.');
      const opened = id === 'book_return' ? initial : initial + amount;
      const closed = id === 'book_return' ? 0 : initial;
      if (id === 'pool_key_tag') moving.position.y = returning ? 0.18 * (1 - k) : 0.18 * k;
      if (id === 'cafe_cup') moving.position.x = -0.28 * (returning ? 1 - k : k);
      moving[field][component] = returning ? opened + (closed - opened) * k : initial + (opened - initial) * k;
    },
    reset() {
      if (moving && axis) {
        const [a, b] = axis.split('.');
        moving[a][b] = initial;
        if (id === 'pool_key_tag') moving.position.y = 0;
        if (id === 'cafe_cup') moving.position.x = 0;
      }
    },
  };
}
