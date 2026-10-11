// Later-day authored notices and scene props do not ship. Shared callers keep their public APIs.
const repair = name => `export function ${name}() {
  return { async hook() {}, restore() {}, update() {}, snapshot: () => ({}), load() {}, magicTargets: () => [] };
}\n`;
export const DAY1_STUBS = {
  'game3d/js/places/day3/signs.js': 'export function placeSigns() {}\n',
  'game3d/js/places/day4/props.js': `export function sundayProps() {
    return { things: {}, sync() {}, snapshot: () => ({}), load() {}, async setup() {} };
  }\n`,
  'game3d/js/places/day5/delivery.js': 'export async function delivery() { return false; }\n',
  'game3d/js/places/day5/notices.js': 'export function mondayNotices() {}\n',
  'game3d/js/places/day5/commons.js': 'export function mondayCommons() { return { async hook() {}, restore() {} }; }\n',
  'game3d/js/places/day5/labels.js': repair('labelRepair'),
  'game3d/js/places/day5/selector.js': repair('selectorRepair'),
  'game3d/js/places/ongoing/index.js': `export function attachOngoing(game, place) {
    place.ongoingPeriod = () => {}; place.ongoing = async () => {};
  }
export function installOngoing(game) {
    for (const key of ['ongoingSetup', 'ongoingGoal', 'artVisit']) game.hooks[key] = () => {};
  }\n`,
  'game3d/js/places/ongoing/karaoke-stage.js': `export function createKaraokeStage() {
    return { async act() {}, update() {}, snapshot: () => ({}), restore() {}, leave() {} };
  }\n`,
};
export const LATER_ENGINE = new Set(['game3d/js/places/ongoing/karaoke-props.js', 'game3d/js/places/ongoing/karaoke-actions.js']);
