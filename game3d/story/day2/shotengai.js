import { withStationGarden } from '../conversations/station-worker.js';
import { direction, shut, sayFallbacks, fallbackNodes } from './shared.js';
export default withStationGarden({
  start: 'd2_arrive',
  on: {
    'talk:bakery_door': 'd2_shut',
    'talk:office_lane': 'd2_to_forecourt',
    'zone:office_exit': 'd2_to_forecourt',
    'talk:plaza_lane': 'd2_to_lane',
    'zone:plaza_exit': 'd2_to_lane',
    'talk:bike_shop': 'd2_shut',
    'talk:store': 'd2_shut',
    'talk:bakery': [{ if: '!d2_bakery_seen', node: 'd2_bakery' }, 'd2_shut'],
    'talk:game_centre': 'd2_shut',
    'talk:karaoke': 'd2_shut',
    'talk:izakaya': 'd2_izakaya',
    'talk:kenji': [{ if: 'd2_shift_done && !d2_met_kenji', node: 'd2_meet_kenji' }, 'd2_kenji_wait'],
    ...sayFallbacks,
  },
  goal: { kenji: 'd2_shift_done && !d2_met_kenji && !d2_party_done', izakaya: 'd2_met_kenji && !d2_party_done' },
  nodes: {
    d2_arrive: [{ do: 'partySetup' }, ...direction('office_lane', 'office_lane', 'izakaya', 'plaza_lane')],
    d2_meet_kenji: [
      { say: 'kenji', emo: 'bright', text: '{mc.name}! This way. Mori-san is there.' },
      { set: 'd2_met_kenji' },
      { do: 'goal', text: 'Join the department inside the izakaya.', at: 'izakaya' },
      { do: 'save' },
    ],
    d2_kenji_wait: [{ say: 'kenji', emo: 'bright', text: 'Mori-san has table. Come in!' }],
    d2_izakaya: [{ if: 'd2_shift_done', then: [{ set: 'd2_met_kenji' }, { do: 'trip', to: 'izakaya' }], else: shut }],
    d2_to_forecourt: [{ do: 'trip', to: 'forecourt' }],
    d2_to_lane: [{ do: 'trip', to: 'east_lane' }],
    d2_bakery: [
      { do: 'cam', on: 'bakery', zoom: 1.2 },
      '> The board says bread can be delivered to the dorm manager’s window.',
      {
        if: 'found_bakery_flyer',
        then: [{ say: 'eric', emo: 'warm', text: 'So this is the place on that flyer.' }],
        else: [{ say: 'eric', emo: 'warm', text: 'That would save a wet walk before work.' }],
      },
      { set: 'd2_bakery_seen' },
      { do: 'cam', back: true },
    ],
    d2_shut: shut,
    ...fallbackNodes,
  },
});
