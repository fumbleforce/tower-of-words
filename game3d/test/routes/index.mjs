import arrival from './arrival.mjs';
import office from './office.mjs';
export default [...arrival, ...office, {
  id: 'continue-midday', description: 'Reload a real unfinished lunch autosave and finish without replaying its caller.',
  seed: { place: 'office', period: 'lunch', node: 'mio_lunch_end',
    flags: { greeted_mori: true, kenji_intro: true, machine_open: true, chair_back: true, got_ticket: true,
      copier_done: true, ticket_closed: true, lunch_on: true, lunch_mio: true, mio_warm: 1 },
    inv: ['tea'], yen: 870 },
  resumeAt: 'mio_bond', choices: [], actions: [],
  expect: { nodes: ['mio_lunch_end', 'mio_bond', 'lunch_end'], flags: { mio_bond_done: true, afternoon_on: true },
    known: ['tomatte'], period: 'afternoon', inv: ['tea'], yen: 870 },
}];
