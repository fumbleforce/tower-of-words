import source from '../day3/gym.js';
import CLUBS from '../clubs.js';
import { winterNodes } from './winter.js';
import { fanNodes } from '../day4/fan.js';
import { interactions, place } from './shared.js';
const repairs = interactions(source, [
  'talk:booking_terminal', 'talk:attendant', 'talk:gym_printer', 'say:ugoite:booking_terminal', 'talk:gym_board',
]);
export default place('gym', {
  on: {
    ...repairs.on,
    'talk:emi': { if: 'ongoing_winter_day && period_evening && club_swimming && ongoing_winter_ready', node: 'ongoing_winter' },
    'talk:kuro': { if: 'ongoing_winter_day && period_evening && club_swimming && ongoing_winter_ready', node: 'ongoing_winter' },
    'talk:desk_fan': 'd4_fan',
    'say:ugoite:desk_fan': { if: "!period_evening && know_ugoite && d4_fan_requested && !d4_fan_done", node: 'd4_fan_magic' },
  },
  nodes: {
    ...repairs.nodes, ...fanNodes, ...winterNodes,
    club_swimming_intro: structuredClone(CLUBS.nodes.club_swimming_intro),
    club_swimming_1: [{ go: 'ongoing_winter' }],
    club_swimming_2: [{ go: 'ongoing_winter' }],
    // The repaired terminal prints today's list, not the opening Saturday's outdoor swim.
    d3_print: [
      { say: 'attendant', overheard: true, emo: 'polite', text: '{dashite}。' },
      { do: 'bookingRepair', state: 'print' },
      { do: 'cam', on: 'attendant', zoom: 1.2 },
      { if: '!know_dashite', then: [{ call: 'd3_dashite_word' }] },
      { do: 'bookingRepair', state: 'check' },
      { say: 'attendant', overheard: true, emo: 'warm', text: '最後の行まで、ちゃんと出てます。' },
      { say: 'eric', emo: 'warm', text: 'The last booking is on here now. Could you check the date too?' },
      { do: 'gesture', who: 'attendant', kind: 'nod', to: 'gym_printer' },
      { say: 'attendant', overheard: true, emo: 'polite', text: 'ありがとうございました。', clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
      { do: 'bow', who: 'attendant' },
      { set: 'd3_booking_done' }, { do: 'ticket', close: 'T-0004' },
      { do: 'cam', back: true }, { do: 'ongoingGoal' }, { do: 'save' },
    ],
    d3_winter_setup: [{ do: 'ongoingSetup', state: 'winterClub' }],
  },
});
