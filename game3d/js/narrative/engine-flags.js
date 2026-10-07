// Named engine writes, consumed by runtime key builders and structural checks.
export const ENGINE_WRITES = {
  'game3d/js/narrative/hooks/movement.js': {
    'exact': [],
    'prefix': ['shown_'],
  },
  'game3d/js/narrative/hooks/progression.js': {
    'exact': ['cant_buy'],
    'prefix': ['typed_', 'bought_'],
  },
  'game3d/js/runner.js': {
    'exact': ['place'],
    'prefix': ['talked_'],
  },
  'game3d/js/sim.js': {
    'exact': ['period', 'day', 'gift_reaction'],
    'prefix': ['met_', 'bond_', 'bond2_', 'step_', 'bondready_', 'register_', 'gift_', 'rel_', 'rem_', 'fact_'],
  },
  'game3d/js/places/train.js': {
    'exact': ['arrived'],
    'prefix': [],
  },
  'game3d/js/places/lobby.js': {
    'exact': ['gateOpen', 'cardOk'],
    'prefix': [],
  },
  'game3d/js/places/office.js': {
    'exact': ['chairHome', 'machineOpen'],
    'prefix': [],
  },
  'game3d/js/mastery.js': {
    'exact': [],
    'prefix': ['practice_', 'voiced_'],
  },
};

ENGINE_WRITES['game3d/js/places/day5/delivery-state.js'] = {
  exact: ['d5_delivery_seen', 'd5_last_recipient'],
  prefix: [],
};
ENGINE_WRITES['game3d/js/places/day5/place.js'] = {
  exact: ['d5_kenji_needs_intro', 'd5_mori_needs_intro', 'd3_emi_needs_intro'],
  prefix: [],
};

ENGINE_WRITES['game3d/js/saves/met.js'] = { exact: [], prefix: ['met_'] };

ENGINE_WRITES['game3d/js/period-flags.js'] = { exact: [], prefix: ['period_'] };
ENGINE_WRITES['game3d/js/gameplay/gifts.js'] = { exact: [], prefix: ['gave_'] };
ENGINE_WRITES['game3d/js/finds/index.js'] = { exact: [], prefix: ['found_'] };
ENGINE_WRITES['game3d/js/tickets/model.js'] = { exact: [], prefix: ['ticket_', 'ticketread_'] };
ENGINE_WRITES['game3d/js/clubs/model.js'] = {
  exact: ['clubs_joined'],
  prefix: ['club_', 'clubprog_', 'clubday_', 'clubev_'],
};
ENGINE_WRITES['game3d/js/ui.js'] = { exact: ['say_tip'], prefix: [] };
ENGINE_WRITES['game3d/js/settings.js'] = { exact: ['private_mode'], prefix: [] };

ENGINE_WRITES['game3d/js/saves/day2.js'] = { exact: ['d2_content_revision', 'place'], prefix: [] };

ENGINE_WRITES['game3d/js/places/bakery/trade.js'] = {
  exact: [
    'bakery_order_id',
    'bakery_item',
    'bakery_phase',
    'bakery_cant_pay',
    'bakery_paid_id',
    'bakery_eaten_id',
    'bakery_eat_id',
    'bakery_eat_item',
    'bakery_eat_phase',
  ],
  prefix: [],
};
ENGINE_WRITES['game3d/js/places/bakery/stage.js'] = {
  exact: ['bakery_can_eat', 'bakery_has_curry', 'bakery_has_roll'],
  prefix: [],
};

ENGINE_WRITES['game3d/js/places/bakery/action.js'] = { exact: ['bakery_action_complete'], prefix: [] };

export const KNOW_PREFIX = 'know_';
export function flagKeys(owner) {
  const spec = ENGINE_WRITES[owner];
  if (!spec) throw new Error('Unknown flag owner: ' + owner);
  const keys = Object.freeze(
    Object.fromEntries([...spec.exact.map((key) => [key, key]), ...spec.prefix.map((key) => [key.slice(0, -1), key])]),
  );
  return new Proxy(keys, {
    get(target, key, receiver) {
      if (typeof key === 'symbol') return Reflect.get(target, key, receiver);
      if (!Object.hasOwn(target, key)) throw new Error(`Unknown flag key ${owner}:${key}`);
      return target[key];
    },
  });
}
export function isEngineFlag(name) {
  return (
    name.startsWith(KNOW_PREFIX) ||
    Object.values(ENGINE_WRITES).some(
      (spec) =>
        spec.exact.includes(name) ||
        spec.prefix.some((prefix) => name.startsWith(prefix) && name.length > prefix.length),
    )
  );
}
