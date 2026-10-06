import { TRAIN_DETAILS } from './catalog-train.js';
import { SOUTH_HALF_DETAILS } from './catalog-south.js';
import { OFFICE_DETAILS } from './catalog-office.js';
// Labels and registration IDs shared by place factories and structural checks.
export const PLACE_DETAILS = {
  train: TRAIN_DETAILS,
  'gate': {
    'things': {
      'guard': {
        'label': 'Mr. Ishibashi',
        'kind': 'person',
      },
      'kuroda': {
        'label': 'Mr. Hamada',
        'kind': 'person',
      },
      'aoi': {
        'label': 'Aoi',
        'kind': 'person',
      },
      'tama': {
        'label': 'Tama',
        'verb': 'Pet',
        'kind': 'person small',
      },
      'reader_l': {
        'label': 'Card reader',
        'kind': 'thing',
      },
      'reader_r': {
        'label': 'Card reader',
        'kind': 'thing',
      },
      'gate': {
        'label': 'Gate',
        'kind': 'thing',
      },
      'desk': {
        'label': 'Guard desk',
        'kind': 'thing small',
      },
      'guard_monitor': {
        'label': 'Monitor',
        'kind': 'thing small',
      },
      'counter': {
        'label': 'Visitor counter',
        'kind': 'thing small',
      },
      'signin': {
        'label': 'Visitor book',
        'kind': 'thing small',
      },
      'lostfound': {
        'label': 'Lost and found',
        'kind': 'thing small',
      },
      'screen': {
        'label': 'Notice screen',
        'kind': 'thing small',
      },
      'kiosk': {
        'label': 'Coffee machine',
        'kind': 'thing small',
      },
      'bench_l': {
        'label': 'Bench',
        'kind': 'thing small',
      },
      'bench_r': {
        'label': 'Bench',
        'kind': 'thing small',
      },
      'poster_l': { 'label': 'Poster', 'kind': 'thing small', 'pin': 'near' }, // a flat line: its pin only when close
      'poster_r': { 'label': 'Poster', 'kind': 'thing small', 'pin': 'near' }, // a flat line: its pin only when close
      'lift': {
        'label': 'Station exit',
        'kind': 'thing',
      },
      'entrance': {
        'label': 'Entrance',
        'kind': 'thing small',
      },
      'plant': {
        'label': 'Plant',
        'kind': 'thing small',
      },
      'bowl': {
        'label': "Tama's bowl",
        'kind': 'thing small',
      },
      // background office workers (lobby.js extras): talked to through their idle: lines only; the two past the gate
      // are talked to across it until it opens (reachAfter: reach-check.mjs lifts that walk-grid block for them)
      'worker_a': { 'label': 'Office worker', 'kind': 'person', 'reachAfter': 'gate' },
      'worker_b': { 'label': 'Office worker', 'kind': 'person', 'reachAfter': 'gate' },
      'commuter_1': { 'label': 'Office worker', 'kind': 'person' },
      'commuter_2': { 'label': 'Office worker', 'kind': 'person' },
      'commuter_3': { 'label': 'Office worker', 'kind': 'person' },
      // day 2: the two ways out, back to the platform and out to head office's forecourt
      'platform_way': { 'label': 'To the platform', 'kind': 'thing', 'verb': 'Go' },
      'forecourt_way': { 'label': 'Station exit', 'kind': 'thing', 'verb': 'Go' },
    },
    'spots': [
      'entrance_in',
      'bench_l',
      'bench_r',
      'before_gate',
      'after_gate',
      'lift_front',
      'counter_front',
      'desk_front',
      'outside',
      'gate_lockers',
      'gate_staff_door',
    ],
    'seats': ['bench_r', 'bench_l'],
    'zones': ['arch', 'past_gate', 'lift_front', 'platform_way', 'forecourt_way'],
    'people': ['guard', 'kuroda', 'aoi', 'rei', 'tama'],
    'hooks': [
      'reader',
      'gate',
      'cardOk',
      'enter',
      'typing',
      'phone',
      'rush',
      'catTo',
      'newsletter',
      'liftOpen',
      'liftClose',
      'monitorRepair',
    ],
  },
  forecourt: {
    things: {
      station_exit: { label: 'Station', kind: 'thing' },
      office_entrance: { label: 'Head office', kind: 'thing' },
      lift: { label: 'Lift to B2', kind: 'thing' },
      kuro: { label: 'Receptionist', kind: 'person' },
      label_printer: { label: 'Label printer', kind: 'thing small' },
      plaza_lane: { label: 'To the plaza', kind: 'thing', verb: 'Go' },
      garden_bench: { label: 'Garden bench', kind: 'thing', verb: 'Sit' },
      fallen_bicycle: { label: 'Bicycle', kind: 'thing', verb: 'Stand up' },
    },
    spots: [
      'station_exit',
      'office_entrance',
      'lift_front',
      'plaza_lane',
      'forecourt_staff_gate',
      'lobby_model',
      'lobby_island_w',
      'lobby_island_e',
      'lobby_lift_bench',
      'lobby_umbrella',
      'reception_office_door',
      'reception_office',
    ],
    // docs/game/places.md, "Nooks"
    nooks: [
      'forecourt_staff_gate',
      'lobby_model',
      'lobby_island_w',
      'lobby_island_e',
      'lobby_lift_bench',
      'lobby_umbrella',
    ],
    seats: ['garden_bench'],
    zones: ['lift_front', 'station_exit', 'plaza_lane', 'reception_office'],
    people: ['kuro', 'tama'],
    hooks: ['liftOpen', 'liftClose', 'gardenCat', 'bicycle'],
  },
  dorm_court: {
    things: {
      bath: { label: 'Bath', kind: 'thing', verb: 'Look' },
      dorm_entry: { label: 'Dorm entrance', kind: 'thing' },
      stairs: { label: 'To the stairs', kind: 'thing' },
      mailboxes: { label: 'Mailbox 203', kind: 'thing', verb: 'Take mail' },
      street_gate: { label: 'To the street', kind: 'thing', verb: 'Go' }, // day 2: out to the east lane
      tama: { label: 'Tama', verb: 'Pet', kind: 'person small' }, // day 3, the afternoon: asleep (places/day3/)
    },
    spots: ['plaza_entry', 'dorm_entry', 'hall', 'passage', 'bath'],
    seats: [],
    zones: ['hall', 'passage', 'street_exit'],
    people: ['tama'],
    hooks: ['mailbox203'],
  },
  ...SOUTH_HALF_DETAILS, // the shop street, the east lane, the east coast
  dorms: {
    things: {
      door_203: { label: 'Room 203', kind: 'thing' },
      window: { label: 'Window', kind: 'thing' },
      boxes: { label: 'Boxes', kind: 'thing' },
      bed: { label: 'Bed', kind: 'thing' },
      computer: { label: 'Computer', kind: 'thing', verb: 'Look' },
      door_out: { label: 'Front door', kind: 'thing', verb: 'Go out' }, // day 2: out of the room
    },
    spots: ['landing', 'door_203', 'room_entry', 'window_front', 'desk_front'],
    seats: ['desk_chair'],
    zones: ['door_203', 'room_exit'],
    people: [],
    hooks: ['enterRoom'],
  },
  plaza: {
    things: {
      office_lane: { label: 'To head office', kind: 'thing', verb: 'Go' },
      fountain: { label: 'Fountain', kind: 'thing' },
      dorm_lane: { label: 'To the dorms', kind: 'thing' },
      training_door: { label: 'Training centre', kind: 'thing', verb: 'Go in' },
      canteen_table: { label: 'Canteen table', kind: 'thing', verb: 'Sit' },
      canteen_worker: { label: 'Canteen worker', kind: 'person' },
      noticeboard: { label: 'Notice board', kind: 'thing', verb: 'Read' },
      shop_walk: { label: 'To the shop street', kind: 'thing', verb: 'Go' },
      // day 3 (story/day3/plaza.js): Aoi at the board in the morning, its map, Tama in the shade at lunch
      aoi: { label: 'Woman from the train', kind: 'person' },
      board_map: { label: 'Map', kind: 'thing small', verb: 'Look' },
      tama: { label: 'Tama', verb: 'Pet', kind: 'person small' },
    },
    spots: ['office_entry', 'fountain_edge', 'dorm_exit', 'shop_walk', 'plaza_seat_bay', 'plaza_shrine'],
    nooks: ['plaza_seat_bay', 'plaza_shrine'], // docs/game/places.md, "Nooks"
    seats: [],
    zones: ['office_lane', 'dorm_exit', 'shop_walk'],
    people: ['canteen_worker', 'aoi', 'tama'],
    hooks: ['canteenChair', 'boardVisit'],
  },
  office: OFFICE_DETAILS,
};

export const SHARED_THINGS = { mio: { label: 'Mio', kind: 'person' } };
