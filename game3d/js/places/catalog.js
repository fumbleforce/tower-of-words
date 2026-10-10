import { extendOngoingCatalog } from './ongoing/catalog.js';
import { extendSundayCatalog } from './day4/catalog.js';
import { extendMondayCatalog } from './day5/catalog.js';
import { TRAIN_DETAILS } from './catalog-train.js';
import { SOUTH_HALF_DETAILS } from './catalog-south.js';
import { OFFICE_DETAILS } from './catalog-office.js';
// Labels and registration IDs shared by place factories and structural checks.
export const PLACE_DETAILS = {
  ferry_terminal: {
    things: {
      ferry_exit: { label: 'Harbour', kind: 'thing', verb: 'Go out' },
      ferry_staff: { label: 'Room attendant', kind: 'person', verb: 'Talk' },
      ferry_reader: { label: 'Reader', kind: 'person', verb: 'Talk' },
      ferry_traveller: { label: 'Traveller', kind: 'person', verb: 'Talk' },
      ferry_window_seat: { label: 'Window bench', kind: 'thing', verb: 'Sit', pin: 'near' },
      ferry_quiet_seat: { label: 'Quiet bench', kind: 'thing', verb: 'Sit', pin: 'near' },
      ferry_landing_seat: { label: 'Landing bench', kind: 'thing', verb: 'Sit', pin: 'near' },
      ferry_notice_seat: { label: 'Waiting bench', kind: 'thing', verb: 'Sit', pin: 'near' },
    },
    spots: [
      'ferry_in',
      'ferry_counter',
      'ferry_reader',
      'ferry_traveller',
      'ferry_luggage_corner',
      'ferry_notice_recess',
    ],
    seats: ['ferry_window_seat', 'ferry_quiet_seat', 'ferry_landing_seat', 'ferry_notice_seat'],
    zones: [],
    people: ['ferry_staff', 'ferry_reader', 'ferry_traveller'],
    hooks: ['ferryActivity'],
  },
  print_shop: {
    things: {
      print_exit: { label: 'North campus', kind: 'thing', verb: 'Go out' },
      directory_printer: { label: 'Island directory', kind: 'thing', verb: 'Print' },
      print_seat: { label: 'Waiting chair', kind: 'thing', verb: 'Sit', pin: 'near' },
    },
    spots: ['directory', 'proof', 'press'],
    seats: ['print_seat'],
    zones: [],
    people: [],
    hooks: ['printDirectory'],
  },
  campus: {
    things: {
      forecourt: { label: 'Head office', kind: 'thing', verb: 'Go' },
      office_quarter: { label: 'Office street', kind: 'thing', verb: 'Go' },
      office_shed: { label: 'Office street', kind: 'thing', verb: 'Go' },
      harbour: { label: 'Harbour walk', kind: 'thing', verb: 'Go' },
      print_shop: { label: 'Print shop', kind: 'thing', verb: 'Go in' },
      campus_bench: { label: 'Garden bench', kind: 'thing', verb: 'Sit', pin: 'near' },
    },
    spots: ['campus_in', 'print_door'],
    seats: ['campus_bench'],
    zones: ['forecourt_exit', 'office_quarter_exit', 'office_shed_exit', 'harbour_exit'],
    people: [],
    hooks: [],
  },
  train: TRAIN_DETAILS,
  gate: {
    things: {
      guard: {
        label: 'Mr. Ishibashi',
        kind: 'person',
      },
      kuroda: {
        label: 'Mr. Hamada',
        kind: 'person',
      },
      aoi: {
        label: 'Aoi',
        kind: 'person',
      },
      tama: {
        label: 'Tama',
        verb: 'Pet',
        kind: 'person small',
      },
      reader_l: {
        label: 'Card reader',
        kind: 'thing',
      },
      reader_r: {
        label: 'Card reader',
        kind: 'thing',
      },
      gate: {
        label: 'Gate',
        kind: 'thing',
      },
      desk: {
        label: 'Guard desk',
        kind: 'thing small',
      },
      guard_monitor: {
        label: 'Monitor',
        kind: 'thing small',
      },
      counter: {
        label: 'Visitor counter',
        kind: 'thing small',
      },
      signin: {
        label: 'Visitor book',
        kind: 'thing small',
      },
      lostfound: {
        label: 'Lost and found',
        kind: 'thing small',
      },
      screen: {
        label: 'Notice screen',
        kind: 'thing small',
      },
      kiosk: {
        label: 'Coffee machine',
        kind: 'thing small',
      },
      bench_l: {
        label: 'Bench',
        kind: 'thing small',
      },
      bench_r: {
        label: 'Bench',
        kind: 'thing small',
      },
      poster_l: { label: 'Poster', kind: 'thing small' },
      poster_r: { label: 'Poster', kind: 'thing small' },
      lift: {
        label: 'Station exit',
        kind: 'thing',
      },
      entrance: {
        label: 'Entrance',
        kind: 'thing small',
      },
      plant: {
        label: 'Plant',
        kind: 'thing small',
      },
      bowl: {
        label: "Tama's bowl",
        kind: 'thing small',
      },
      // background office workers (lobby.js extras): talked to through their idle: lines only; the two past the gate
      // are talked to across it until it opens (reachAfter: reach-check.mjs lifts that walk-grid block for them)
      worker_a: { label: 'Office worker', kind: 'person', reachAfter: 'gate' },
      worker_b: { label: 'Office worker', kind: 'person', reachAfter: 'gate' },
      commuter_1: { label: 'Office worker', kind: 'person' },
      commuter_2: { label: 'Office worker', kind: 'person' },
      commuter_3: { label: 'Office worker', kind: 'person' },
      // day 2: the two ways out, back to the platform and out to head office's forecourt
      platform_way: { label: 'To the platform', kind: 'thing', verb: 'Go' },
      forecourt_way: { label: 'Station exit', kind: 'thing', verb: 'Go' },
    },
    spots: [
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
    seats: ['bench_r', 'bench_l'],
    zones: ['arch', 'past_gate', 'lift_front', 'platform_way', 'forecourt_way'],
    people: ['guard', 'kuroda', 'aoi', 'rei', 'tama'],
    hooks: [
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
      campus: { label: 'North campus', kind: 'thing', verb: 'Go' },
      station_exit: { label: 'Station', kind: 'thing' },
      office_entrance: { label: 'Head office', kind: 'thing' },
      lift: { label: 'Lift to B2', kind: 'thing' },
      kuro: { label: 'Receptionist', kind: 'person' },
      label_printer: { label: 'Label printer', kind: 'thing small' },
      plaza_lane: { label: 'To the plaza', kind: 'thing', verb: 'Go' },
      shop_lane: { label: 'To the shopping street', kind: 'thing', verb: 'Go' },
      garden_bench: { label: 'Garden bench', kind: 'thing', verb: 'Sit' },
      fallen_bicycle: { label: 'Bicycle', kind: 'thing', verb: 'Stand up' },
    },
    spots: [
      'station_exit',
      'office_entrance',
      'lift_front',
      'plaza_lane',
      'shop_lane',
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
    zones: ['campus_exit', 'lift_front', 'station_exit', 'plaza_lane', 'shop_exit', 'reception_office'],
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
      // in the hall, a look line each (story/dorm-building.js)
      hall_board: {
        label: 'Notice board',
        kind: 'thing',
        verb: 'Read',
        pin: 'near',
      },
      manager_window: {
        label: "Manager's window",
        kind: 'thing',
        verb: 'Look',
        pin: 'near',
      },
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
      door_out: { label: 'Front door', kind: 'thing', verb: 'Go out' }, // day 2 on: out of the room
      // the stairs (places/dorm-floors.js), and the small things round the building with a look line each
      // (story/dorm-building.js), their pins only when he's close
      stairs_up: { label: 'Upstairs', kind: 'thing', verb: 'Go up' },
      stairs_down: { label: 'Downstairs', kind: 'thing', verb: 'Go down' },
      kitchen: {
        label: 'Shared kitchen',
        kind: 'thing',
        verb: 'Look',
        pin: 'near',
      },
      notices: {
        label: 'Notice board',
        kind: 'thing',
        verb: 'Read',
        pin: 'near',
      },
      laundry: { label: 'Laundry', kind: 'thing', verb: 'Look', pin: 'near' },
      drinks: {
        label: 'Drinks machine',
        kind: 'thing',
        verb: 'Look',
        pin: 'near',
      },
      washing: { label: 'Washing', kind: 'thing', verb: 'Look', pin: 'near' },
      planters: { label: 'Planters', kind: 'thing', verb: 'Look', pin: 'near' },
    },
    spots: [
      'landing',
      'door_203',
      'room_entry',
      'window_front',
      'desk_front',
      'landing_3f',
      'roof_door',
      'dorm_2f_end',
      'dorm_kitchen_shelf',
      'dorm_3f_end',
      'dorm_laundry_box',
      'dorm_roof_chairs',
      'dorm_roof_units',
    ],
    nooks: [
      'dorm_2f_end',
      'dorm_kitchen_shelf',
      'dorm_3f_end',
      'dorm_laundry_box',
      'dorm_roof_chairs',
      'dorm_roof_units',
    ], // docs/game/places.md, "Nooks"
    seats: ['desk_chair'],
    zones: ['door_203', 'room_exit'],
    people: [],
    hooks: ['enterRoom', 'leaveRoom'],
  },
  canteen: {
    things: {
      canteen_worker: { label: 'Canteen worker', kind: 'person' },
      canteen_exit: { label: 'Fountain plaza', kind: 'thing', verb: 'Go out' },
      canteen_seat_w: { label: 'Dining chair', kind: 'thing', verb: 'Sit', pin: 'near' },
      canteen_seat_e: { label: 'Dining chair', kind: 'thing', verb: 'Sit', pin: 'near' },
      canteen_shirt: { label: 'Diner in a shirt', kind: 'person' },
      canteen_cardigan: { label: 'Diner in a cardigan', kind: 'person' },
      canteen_polo: { label: 'Diner with a water cup', kind: 'person' },
      canteen_seat_shared: { label: 'Shared table chair', kind: 'thing', verb: 'Sit', pin: 'near' },
      canteen_water: { label: 'Water dispenser', kind: 'thing', verb: 'Use' },
      canteen_return: { label: 'Tray return', kind: 'thing', verb: 'Return tray' },
      canteen_collection: { label: 'My paid tray', kind: 'thing', verb: 'Collect' },
    },
    spots: ['canteen_in', 'meal_counter', 'water', 'tray_return'],
    seats: ['canteen_seat_w', 'canteen_seat_e', 'canteen_seat_shared'],
    nooks: [],
    zones: [],
    people: ['canteen_worker', 'canteen_shirt', 'canteen_cardigan', 'canteen_polo'],
    hooks: ['roomWorker', 'canteenDining'],
  },
  plaza: {
    things: {
      canteen_door: { label: 'Canteen', kind: 'thing', verb: 'Go in' },
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

extendSundayCatalog(PLACE_DETAILS);
extendMondayCatalog(PLACE_DETAILS);

export const SHARED_THINGS = { mio: { label: 'Mio', kind: 'person' } };

extendOngoingCatalog(PLACE_DETAILS);
