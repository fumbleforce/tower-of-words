// Named engine writes, consumed by runtime key builders and structural checks.
export const ENGINE_WRITES = {
  'game3d/js/places/mio-lunch/index.js': {
    'exact': ['mio_lunch_offer'],
    'prefix': [],
  },
  'game3d/js/places/mio-lunch/state.js': {
    'exact': ['ms2_mio', 'ms3_mio'],
    'prefix': [],
  },
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

ENGINE_WRITES['game3d/js/gameplay/register-reactions.js'] = { exact: [], prefix: ['regreact_'] };
ENGINE_WRITES['game3d/js/period-flags.js'] = { exact: [], prefix: ['period_'] };
ENGINE_WRITES['game3d/js/gameplay/gifts.js'] = { exact: [], prefix: ['gave_'] };
ENGINE_WRITES['game3d/js/finds/index.js'] = { exact: [], prefix: ['found_'] };
ENGINE_WRITES['game3d/js/tickets/model.js'] = { exact: [], prefix: ['ticket_', 'ticketread_'] };
ENGINE_WRITES['game3d/js/clubs/model.js'] = {
  exact: ['clubs_joined'],
  prefix: ['club_', 'clubprog_', 'clubday_', 'clubev_'],
};
ENGINE_WRITES['game3d/js/ui.js'] = { exact: ['say_tip'], prefix: [] };
ENGINE_WRITES['game3d/js/settings.js'] = { exact: ['private_mode', 'skill_checks'], prefix: [] };

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
ENGINE_WRITES['game3d/js/places/ongoing/art-progress.js'] = { exact: ['art_first_day'], prefix: [] };

ENGINE_WRITES['game3d/js/places/ongoing/index.js'] = {
  exact: [
    'ongoing_workday',
    'ongoing_tennis_day',
    'ongoing_team_day',
    'ongoing_art_day',
    'ongoing_model_day',
    'ongoing_art_ready',
    'ongoing_winter_day',
    'ongoing_winter_ready',
  ],
  prefix: [],
};

ENGINE_WRITES['game3d/js/places/gym.js'] = { exact: ['winter_action_completed'], prefix: [] };
ENGINE_WRITES['game3d/js/places/commons.js'] = { exact: ['art_action_completed'], prefix: [] };

ENGINE_WRITES['game3d/js/places/konbini/trade.js'] = {
  exact: [
    'konbini_basket',
    'konbini_cant_pay',
    'konbini_consumed_id',
    'konbini_count',
    'konbini_food_id',
    'konbini_food_item',
    'konbini_food_phase',
    'konbini_full',
    'konbini_has_milk',
    'konbini_has_riceball',
    'konbini_order_id',
    'konbini_paid_id',
    'konbini_phase',
    'konbini_selected_coffee',
    'konbini_selected_milk',
    'konbini_selected_riceball',
    'konbini_selected_tea',
    'konbini_total',
  ],
  prefix: [],
};
ENGINE_WRITES['game3d/js/places/konbini/action.js'] = { exact: ['konbini_action_complete'], prefix: [] };

ENGINE_WRITES['game3d/js/places/ferry-terminal/action.js'] = { exact: ['ferry_action_complete'], prefix: [] };
ENGINE_WRITES['game3d/js/places/ferry-terminal/activity.js'] = { exact: ['ferry_bag_moved'], prefix: [] };
ENGINE_WRITES['game3d/js/places/ferry-terminal/food-state.js'] = {
  exact: ['ferry_food_phase', 'ferry_food_item', 'ferry_food_id', 'ferry_consumed_id'],
  prefix: ['ferry_has_'],
};
ENGINE_WRITES['game3d/js/investigations/sender/state.js'] = {
  exact: ['sender_state', 'sender_offered', 'sender_partial', 'sender_compared', 'sender_delivered'],
  prefix: [],
};
ENGINE_WRITES['game3d/js/investigations/sender/hook.js'] = {
  exact: ['sender_action_ok', 'sender_available'],
  prefix: [],
};
ENGINE_WRITES['game3d/js/investigations/sender/index.js'] = {
  exact: [
    'sender_action_ok',
    'sender_available',
    'sender_complaint_heard',
    'sender_remark_heard',
    'sender_failed',
    'sender_wants_mori',
  ],
  prefix: [],
};

ENGINE_WRITES['game3d/js/places/canteen/action.js'] = { exact: ['canteen_dining_complete'], prefix: [] };
ENGINE_WRITES['game3d/js/places/canteen/meal-state.js'] = {
  exact: [
    'canteen_order_id',
    'canteen_meal',
    'canteen_meal_phase',
    'canteen_meal_seat',
    'canteen_paid_id',
    'canteen_eaten_id',
    'canteen_delivered_id',
  ],
  prefix: [],
};
ENGINE_WRITES['game3d/js/places/canteen/stage.js'] = {
  exact: [
    'canteen_staff_present',
    'canteen_service_open',
    'canteen_paid',
    'canteen_outstanding',
    'canteen_player_at_shared',
    'canteen_curry_present',
    'canteen_recommendation_ready',
    'canteen_diner_busy',
  ],
  prefix: [],
};
ENGINE_WRITES['game3d/js/places/canteen/diners.js'] = { exact: ['canteen_container_closed'], prefix: [] };

export const KNOW_PREFIX = 'know_';
ENGINE_WRITES['game3d/js/places/station-garden/index.js'] = {
  exact: ['garden_worker_busy', 'garden_worker_done', 'garden_bench_free'],
  prefix: [],
};

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
