import { withStationGarden } from './conversations/station-worker.js';
// The shop street and the seafront, a side trip off the plaza (docs/game/places.md). Its shops are shut for now:
// each door says so, but the karaoke box's door opens onto its front desk. The central path returns to the plaza;
// after work the east arcade mouth leads up the dorm street to the courtyard.
export default withStationGarden({
  start: 'arrive',
  on: {
    'talk:office_lane': 'to_forecourt',
    'zone:office_exit': 'to_forecourt',
    'talk:plaza_lane': 'to_plaza',
    'zone:plaza_exit': 'to_plaza',
    'talk:dorm_lane': [{ if: 'going_home', node: 'to_dorms' }],
    'zone:dorm_exit': [{ if: 'going_home', node: 'to_dorms' }],
    'talk:bike_shop': 'shut',
    'talk:store': 'shut',
    'talk:bakery': 'shut',
    'talk:bakery_door': 'shut',
    'talk:game_centre': 'shut',
    'talk:karaoke': 'to_karaoke',
    'talk:izakaya': 'shut',
  },
  goal: { plaza_lane: '!going_home', dorm_lane: 'going_home' },
  nodes: {
    to_forecourt: [{ do: 'trip', to: 'forecourt' }],
    arrive: [
      {
        if: 'going_home',
        then: [{ do: 'goal', text: 'The dorms are up the street, east of the arcade.' }],
        else: [{ do: 'goal', text: 'Head office is north past the bicycle parking. Take its lift down to B2.' }],
      },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    to_karaoke: [{ do: 'trip', to: 'karaoke' }],
    to_dorms: [{ do: 'trip', to: 'dorm_court' }],
  },
});
