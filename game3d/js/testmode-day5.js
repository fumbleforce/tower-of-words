// Monday fast route: reception, lunch booth, optional B2 delivery, then an explicit Sleep.
import { day3Tick } from './testmode-day3.js';
import { missingBeats } from './testmode-beats.js';
export const DAY5_ROUTE = [
  ['dorms', 'door_out'],
  ['dorms', 'stairs_down'],
  ['dorm_court', 'street_gate'],
  ['east_lane', 'plaza_lane'],
  ['plaza', 'office_lane'],
  ['forecourt', 'kuro', ['Use the wider label format']],
  ['forecourt', 'plaza_lane'],
  ['plaza', 'dorm_lane'],
  ['east_lane', 'dorm_gate'],
  ['dorm_court', 'stairs'],
  ['dorms', 'computer', ['Spend the rest of the morning']],
  ['dorms', 'door_out'],
  ['dorms', 'stairs_down'],
  ['dorm_court', 'street_gate'],
  ['east_lane', 'plaza_lane'],
  ['plaza', 'shop_walk'],
  ['shotengai', 'karaoke'],
  ['karaoke', 'karaoke_stairs'],
  ['karaoke_booth', 'song_terminal', ['Hold the stop key']],
  ['karaoke_booth', 'booth_door'],
  ['karaoke', 'karaoke_door'],
  ['shotengai', 'plaza_lane'],
  ['plaza', 'dorm_lane'],
  ['east_lane', 'dorm_gate'],
  ['dorm_court', 'stairs'],
  ['dorms', 'computer', ['Rest until evening']],
  ['dorms', 'door_out'],
  ['dorms', 'stairs_down'],
  ['dorm_court', 'street_gate'],
  ['east_lane', 'plaza_lane'],
  ['plaza', 'office_lane'],
  // from day 3 the forecourt has no lift pin (story/day5/forecourt.js): the head office door takes him to the lift
  ['forecourt', 'office_entrance'],
  ['office', 'vending', ['Yes, if they want', 'Finish with that first drink']],
  ['office', 'lift'],
  ['forecourt', 'plaza_lane'],
  ['plaza', 'dorm_lane'],
  ['east_lane', 'dorm_gate'],
  ['dorm_court', 'stairs'],
  ['dorms', 'bed', ['Sleep.']],
];
// Monday's required beats: the label fix with Kuro at reception (T-0007, morning or afternoon) and the lift down to B2
// for the evening reveal (d5_reveal_done is set when the reveal ends with both colleagues watching). A run passes only
// when the game has recorded both as done. testmode.js asks for them at the end of the day, as it does for day 3.
export const DAY5_REQUIRED_BEATS = [
  { flag: 'd5_label_done', beat: 'the label fix with Kuro at reception (T-0007)', place: 'forecourt' },
  { flag: 'd5_reveal_done', beat: 'the lift down to B2 and the evening reveal with Kenji and Mori', place: 'office' },
];
export function day5MissingBeats(flags, places) {
  return missingBeats(DAY5_REQUIRED_BEATS, flags, places, 'day 5 required beat');
}
export function day5Tick(game, T, R) {
  const sleepOnly = new URLSearchParams(location.search).get('route') === 'sleep';
  const route = sleepOnly
    ? [
        ['dorms', 'computer', ['Rest until evening']],
        ['dorms', 'bed', ['Sleep.']],
      ]
    : DAY5_ROUTE;
  return day3Tick(game, T, R, route);
}
// The embedded game retains its own timing. Tap only its expected next action after it is ready.
export function day5DeliveryTick() {
  const frame = document.querySelector('iframe[title="Kotodama at B2"]');
  if (!frame) return false;
  const doc = frame.contentDocument;
  const target = doc?.querySelector('.hint-glow');
  if (target && !target.disabled) target.click();
  return true;
}
