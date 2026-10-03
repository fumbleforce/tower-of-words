export const TRAIN_DETAILS = {
  'things': {
    'aoi': {
      'label': 'Woman on her phone',
      'kind': 'person',
    },
    'kuroda': {
      'label': 'Sleeping man',
      'kind': 'person',
    },
    'reader': {
      'label': 'Man with a book',
      'kind': 'person small',
    },
    'music': {
      'label': 'Girl with headphones',
      'kind': 'person small',
    },
    'rei': {
      'label': 'Woman with a laptop',
      'kind': 'person',
    },
    'cup': {
      'label': 'Coffee',
      'kind': 'thing small',
    },
    'bun': {
      'label': 'Woman with a bun',
      'kind': 'person small',
    },
    'youth': {
      'label': 'Young man',
      'kind': 'person small',
    },
    'tama': {
      'label': 'Cat',
      'verb': 'Pet',
      'kind': 'person small',
    },
    'doors': {
      'label': 'Doors',
      'kind': 'thing',
    },
    'door_l': {
      'label': 'Doors',
      'kind': 'thing',
    },
    'door_r': {
      'label': 'Doors',
      'kind': 'thing',
    },
    'plant': {
      'label': 'Plant',
      'kind': 'thing small',
    },
    'bags': {
      'label': 'Bags',
      'kind': 'thing small',
    },
    'rack': {
      'label': 'Luggage rack',
      'kind': 'thing small',
    },
    'straps': {
      'label': 'Straps',
      'kind': 'thing small',
    },
    'window': {
      'label': 'Window',
      'kind': 'thing small',
    },
    'poster': {
      'label': 'Poster',
      'kind': 'thing small',
    },
    'sign': {
      'label': 'Station sign',
      'kind': 'thing small',
    },
    'foodbag': {
      'label': 'Her lunch bag',
      'verb': 'Catch',
      'kind': 'thing small',
    },
    'stander': {
      'label': 'Man with a bag',
      'kind': 'person small',
    },
    'platform': {
      'label': 'Platform',
      'kind': 'thing small',
      'reachAfter': 'doors', // outside the car: reached once the doors open (reach-check.mjs)
    },
    // day 2, the car standing between runs: the door test panel by the right-hand doors, and the way back
    'door_test': { 'label': 'Door test panel', 'kind': 'thing', 'verb': 'Test' },
    'station_exit': { 'label': 'To the station', 'kind': 'thing', 'verb': 'Go' },
  },
  'spots': [
    'aisle',
    'door_l',
    'door_r',
    'by_aoi',
    'by_kuroda',
    'platform',
    'walkway',
    'plat_l',
    'plat_l2',
    'plat_hamada',
  ],
  'seats': ['seat_aoi', 'seat_far_r', 'seat_near_l', 'seat_near_r', 'seat_mio'],
  'zones': ['door_zone', 'free_seat', 'platform_exit'],
  'people': ['kuroda', 'aoi', 'reader', 'rei', 'music', 'stander', 'bun', 'youth', 'tama'],
  'hooks': [
    'announce',
    'arrive',
    'doorsOpen',
    'doorsClose',
    'chime',
    'doorsHold',
    'alight',
    'depart',
    'wake',
    'bag',
    'cup',
    'catTo',
    'phone',
    'headphones',
    'shopBag',
    'printout',
    'stationSetup',
    'doorTest',
  ],
};
