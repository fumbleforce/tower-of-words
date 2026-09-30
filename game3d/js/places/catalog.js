import { TRAIN_DETAILS } from './catalog-train.js';
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
      // background office workers (lobby.js extras): talked to through their idle: lines only
      'worker_a': { 'label': 'Office worker', 'kind': 'person' },
      'worker_b': { 'label': 'Office worker', 'kind': 'person' },
      'commuter_1': { 'label': 'Office worker', 'kind': 'person' },
      'commuter_2': { 'label': 'Office worker', 'kind': 'person' },
      'commuter_3': { 'label': 'Office worker', 'kind': 'person' },
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
    ],
    'seats': ['bench_r', 'bench_l'],
    'zones': ['arch', 'past_gate', 'lift_front'],
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
    ],
  },
  forecourt: {
    things: {
      station_exit: { label: 'Station', kind: 'thing' },
      office_entrance: { label: 'Head office', kind: 'thing' },
      lift: { label: 'Lift to B2', kind: 'thing' },
      kuro: { label: 'Receptionist', kind: 'person' },
      plaza_lane: { label: 'To the plaza', kind: 'thing', verb: 'Go' },
      garden_bench: { label: 'Garden bench', kind: 'thing', verb: 'Sit' },
      fallen_bicycle: { label: 'Bicycle', kind: 'thing', verb: 'Stand up' },
    },
    spots: ['station_exit', 'office_entrance', 'lift_front', 'plaza_lane'],
    seats: ['garden_bench'],
    zones: ['lift_front', 'plaza_lane'],
    people: ['kuro', 'tama'],
    hooks: ['liftOpen', 'liftClose', 'gardenCat', 'bicycle'],
  },
  dorm_court: {
    things: {
      bath: { label: 'Bath', kind: 'thing', verb: 'Listen' },
      dorm_entry: { label: 'Dorm entrance', kind: 'thing' },
      stairs: { label: 'To the stairs', kind: 'thing' },
      mailboxes: { label: 'Mailbox 203', kind: 'thing', verb: 'Take mail' },
    },
    spots: ['plaza_entry', 'dorm_entry', 'hall', 'passage', 'bath'],
    seats: [],
    zones: ['hall', 'passage'],
    people: [],
    hooks: ['bathSong', 'mailbox203'],
  },
  dorms: {
    things: {
      door_203: { label: 'Room 203', kind: 'thing' },
      window: { label: 'Window', kind: 'thing' },
      boxes: { label: 'Boxes', kind: 'thing' },
      bed: { label: 'Bed', kind: 'thing' },
    },
    spots: ['landing', 'door_203', 'room_entry', 'window_front'],
    seats: [],
    zones: ['door_203'],
    people: [],
    hooks: ['enterRoom'],
  },
  plaza: {
    things: {
      office_lane: { label: 'To head office', kind: 'thing', verb: 'Go' },
      fountain: { label: 'Fountain', kind: 'thing' },
      dorm_lane: { label: 'To the dorms', kind: 'thing' },
      canteen_table: { label: 'Canteen table', kind: 'thing', verb: 'Sit' },
      canteen_worker: { label: 'Canteen worker', kind: 'person' },
      noticeboard: { label: 'Notice board', kind: 'thing', verb: 'Read' },
    },
    spots: ['office_entry', 'fountain_edge', 'dorm_exit'],
    seats: [],
    zones: ['office_lane', 'dorm_exit'],
    people: ['canteen_worker'],
    hooks: ['canteenChair'],
  },
  'office': {
    'things': {
      'emi': {
        'label': 'Emi',
        'kind': 'person',
      },
      'kenji': {
        'label': 'Kenji',
        'kind': 'person',
      },
      'rei': {
        'label': 'Rei',
        'kind': 'person',
      },
      'aoi': {
        'label': 'Aoi',
        'kind': 'person',
      },
      'mori': {
        'label': 'Mr. Mori',
        'kind': 'person',
      },
      'tama': {
        'label': 'Cat',
        'verb': 'Pet',
        'kind': 'person small',
      },
      'covered': {
        'label': 'Covered desk',
        'kind': 'thing small',
      },
      'covered_monitor': {
        'label': 'Covered monitor',
        'kind': 'thing small',
      },
      'box_crowns': {
        'label': 'Box',
        'kind': 'thing small',
      },
      'cups': {
        'label': 'Cups',
        'kind': 'thing small',
      },
      'nameplate': {
        'label': 'Nameplate',
        'kind': 'thing small',
      },
      'my_desk': {
        'label': 'Your desk',
        'kind': 'thing',
      },
      'my_chair': {
        'label': 'Your chair',
        'kind': 'thing',
        'verb': 'Push to your desk',
      },
      'lift': {
        'label': 'Lift',
        'kind': 'thing small',
      },
      'vending': {
        'label': 'Vending machine',
        'kind': 'thing small',
      },
      'bench': {
        'label': 'Bench',
        'kind': 'thing small',
      },
      'stairs': {
        'label': 'Stairs',
        'kind': 'thing small',
      },
      'office_door': {
        'label': 'Office door',
        'kind': 'thing small',
      },
      'inout_board': { 'label': 'In/out board', 'kind': 'thing small', 'pin': 'near' }, // a flat line: its pin only when close
      'clock': {
        'label': 'Clock',
        'kind': 'thing small',
      },
      'whiteboard': {
        'label': 'Whiteboard',
        'kind': 'thing small',
      },
      'calendar': {
        'label': 'Calendar',
        'kind': 'thing small',
      },
      'water_cooler': {
        'label': 'Water cooler',
        'kind': 'thing small',
      },
      'cabinets': {
        'label': 'Cabinets',
        'kind': 'thing small',
      },
      'fan': {
        'label': 'Fan',
        'kind': 'thing small',
      },
      'boxes': {
        'label': 'Boxes',
        'kind': 'thing small',
      },
      'chief_desk': {
        'label': "Mr. Mori's desk",
        'kind': 'thing small',
      },
      'machine_door': {
        'label': 'Machine room',
        'kind': 'thing small',
      },
      'racks': {
        'label': 'Server racks',
        'kind': 'thing small',
      },
      'fire_exit': {
        'label': 'Fire exit',
        'kind': 'thing small',
      },
      'noticeboard': {
        'label': 'Noticeboard',
        'kind': 'thing small',
      },
      'extinguisher': {
        'label': 'Extinguisher',
        'kind': 'thing small',
      },
      'hydrant': {
        'label': 'Hydrant',
        'kind': 'thing small',
      },
      'copier': {
        'label': 'Copier',
        'kind': 'thing',
      },
      'fax': {
        'label': 'Fax',
        'kind': 'thing small',
      },
      'paper_shelf': {
        'label': 'Paper shelf',
        'kind': 'thing small',
      },
      'worktable': {
        'label': 'Worktable',
        'kind': 'thing small',
      },
      'coffee_machine': {
        'label': 'Coffee machine',
        'kind': 'thing',
      },
      'kettle': {
        'label': 'Kettle',
        'kind': 'thing small',
      },
      'fridge': {
        'label': 'Fridge',
        'kind': 'thing small',
      },
      'microwave': {
        'label': 'Microwave',
        'kind': 'thing small',
      },
      'kitchen_table': {
        'label': 'Table',
        'kind': 'thing small',
      },
      'toilet_m': {
        'label': "Men's toilet",
        'kind': 'thing small',
      },
      'toilet_f': {
        'label': "Women's toilet",
        'kind': 'thing small',
      },
      'plant': {
        'label': 'Plant',
        'kind': 'thing small',
      },
    },
    'spots': [
      'lift_out',
      'mori_greet',
      'lobby',
      'office_door',
      'my_seat',
      'emi_seat',
      'copier_front',
      'coffee_front',
      'corridor_w',
      'corridor_e',
      'machine_front',
      'mio_by_desk',
      'kenji_desk',
    ],
    'seats': ['my_seat', 'emi_seat', 'mio_seat'],
    'zones': ['office', 'copy_room', 'kitchen', 'toilets', 'machine_room', 'corridor'],
    'people': ['emi', 'kenji', 'mori', 'aoi', 'rei', 'tama'],
    'hooks': [
      'copier',
      'catTo',
      'chairRoll',
      'coffee',
      'kettle',
      'rackAlarm',
      'machineDoor',
      'vendingDrop',
      'clockStop',
      'fan',
      'liftOpen',
      'liftClose',
      'sitDown',
      'lunchSit',
      'lunchOver',
    ],
  },
};

export const SHARED_THINGS = { mio: { label: 'Mio', kind: 'person' } };
