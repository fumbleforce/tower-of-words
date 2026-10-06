// The existing canteen's ground floor, available whenever the plaza is reachable. No new story beat.
export default {
  start: 'arrive',
  on: { 'talk:canteen_exit': 'to_plaza', 'talk:canteen_seat_w': 'sit_w', 'talk:canteen_seat_e': 'sit_e' },
  nodes: {
    arrive: [{ do: 'goal', text: 'Return to the fountain plaza.' }],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    sit_w: [{ do: 'sit', who: 'eric', at: 'canteen_seat_w' }],
    sit_e: [{ do: 'sit', who: 'eric', at: 'canteen_seat_e' }],
  },
};
