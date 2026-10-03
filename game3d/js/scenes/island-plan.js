// The south half of the island, planned for day 2 (docs/game/island.md, the home of every place here): the half's
// edge, its planned streets, walks, courts and green, and a label point for every place in island.md (its coast and
// every building are the layout's). Same frame and grid as scenes/island-layout.js, which re-exports this; traced
// from the straight-down picked map (art/island/island-map-4-topdown.png) like the layout, a few units out.
//
// Drawn by the island map only (?map=1, "Day 2 plan"; map/plan.js). No chunk builds it and no backdrop shows it:
// when a place is built, its entries move into the layout proper (PATHS, GREEN, BUILDINGS) with the chunk.
// `node tools/facts/check.mjs` checks PLACES against island.md's tables.
const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

// The half's north edge, west coast to east coast: north of the old works, then along the park's south edge, then
// round the onsen. North of it: the park, the sports field, the matsuri stage, the history hall and the shrine.
export const HALF_EDGE = pairs([-154, -134, -48, -134, -48, -112, 104, -112, 104, -124, 140, -124]);

// Planned streets (lane, 3 wide), walks (2 or 1.5), courts, piers. Every one on the grid, meeting the layout's
// paths and each other square on.
export const PLAN_PATHS = [
  {
    id: 'shed_street_far',
    kind: 'lane',
    rect: [-20.75, -52.5, -17.75, -27.4],
    detail: 'The shed street (layout shed_street_north) carried on north to the office street.',
  },
  {
    id: 'quarter_street',
    kind: 'lane',
    rect: [3, -52.5, 6, -18.1],
    detail: 'North from the cross street behind the tower (the tower’s rear door) to the office street.',
  },
  {
    id: 'back_lane_west',
    kind: 'lane',
    rect: [6, -33, 15.79, -30],
    detail: 'The back lane carried west past the canteen’s loading yard to the quarter street.',
  },
];

// Planned green, coarse.
export const PLAN_GREEN = [
  {
    id: 'quarter_park',
    rect: [-4, -44.5, 0, -36],
    detail: 'A strip of lawn and trees west of the quarter street.',
  },
];

// A label point for every place in island.md: b names a layout or plan building (its footprint's middle), else at.
export const PLACES = [
  // arrival and head office
  { id: 'station', en: 'Honsha station', ja: '本社駅', b: 'station' },
  {
    id: 'platforms',
    en: 'Monorail platforms',
    ja: 'ホーム',
    b: 'platform_shed',
  },
  { id: 'forecourt', en: 'Station forecourt', ja: '駅前広場', at: [-8, -1] },
  { id: 'bike_court', en: 'Bike parking', ja: '駐輪場', at: [-4, 6] },
  { id: 'head_office', en: 'Head office', ja: '本社', b: 'head_office' },
  {
    id: 'general_affairs',
    en: 'General affairs',
    ja: '総務部',
    b: 'head_office_wing',
  },
  {
    id: 'facilities_office',
    en: 'Facilities office',
    ja: '施設課',
    b: 'office_e1',
  },
  {
    id: 'west_coast_walk',
    en: 'West coast walk',
    ja: '海沿いの道',
    at: [-41.6, -8],
  },
  // office quarter
  { id: 'trading_office', en: 'Amakawa Trading', ja: '天川商事', b: 'w1' },
  { id: 'print_shop', en: 'Print shop', ja: '印刷所', b: 'w3' },
  { id: 'foods_office', en: 'Amakawa Foods', ja: '天川食品', b: 'm1' },
  { id: 'electric_office', en: 'Amakawa Electric', ja: '天川電機', b: 'm2' },
  { id: 'logistics_office', en: 'Amakawa Logistics', ja: '天川物流', b: 'm3' },
  {
    id: 'construction_office',
    en: 'Amakawa Construction',
    ja: '天川建設',
    b: 'm4',
  },
  { id: 'insurance_office', en: 'Amakawa Life', ja: '天川生命', b: 'm5' },
  { id: 'personnel_office', en: 'Personnel', ja: '人事部', b: 'm6' },
  { id: 'bank', en: 'Company bank', ja: '天川銀行', b: 'b_h' },
  // fountain plaza, canteen, clinic
  { id: 'plaza', en: 'Fountain plaza', ja: '噴水広場', at: [37.29, -2.75] },
  { id: 'canteen', en: 'Canteen', ja: '社員食堂', b: 'canteen' },
  {
    id: 'canteen_yard',
    en: 'Canteen loading yard',
    ja: '搬入口',
    at: [19.2, -28.5],
  },
  { id: 'clinic', en: 'Clinic', ja: 'クリニック', b: 'clinic' },
  { id: 'clinic_grove', en: 'Grove', ja: '木立の広場', at: [47.6, -39] },
  // shop street and seafront (bays: island-south.js BAYS, bay i's middle at -3 + 4.5 (i + 0.5))
  { id: 'shotengai', en: 'Shop street', ja: '商店街', at: [20, 20.15] },
  {
    id: 'store',
    en: 'Konbini, 100-yen and drugstore',
    ja: 'コンビニ',
    at: [30.75, 15.6],
  },
  { id: 'bakery', en: 'Bakery', ja: 'パン屋', at: [44.25, 15.6] },
  { id: 'bike_shop', en: 'Bike shop', ja: '自転車屋', at: [8.25, 15.6] },
  {
    id: 'game_centre',
    en: 'Game centre',
    ja: 'ゲームセンター',
    at: [53.25, 15.6],
  },
  { id: 'karaoke', en: 'Karaoke box', ja: 'カラオケ', at: [57.75, 24.6] },
  { id: 'izakaya', en: 'Izakaya', ja: '居酒屋', b: 'izakaya' },
  { id: 'ramen', en: 'Ramen shop', ja: 'ラーメン屋', b: 'ramen' },
  {
    id: 'promenade',
    en: 'Seafront promenade',
    ja: '海辺の遊歩道',
    at: [30, 29.6],
  },
  { id: 'beach', en: 'Beach', ja: '浜辺', at: [25, 42] },
  // east lane
  {
    id: 'training_centre',
    en: 'New-staff training centre',
    ja: '研修センター',
    b: 'block_e1',
  },
  { id: 'cafe', en: 'Café', ja: 'カフェ', b: 'm_e1' },
  { id: 'liquor_shop', en: 'Liquor and rice shop', ja: '酒屋', b: 'm_e2' },
  { id: 'barber', en: 'Barber', ja: '床屋', b: 'r8' },
  { id: 'pocket_park', en: 'Pocket park', ja: '小さな公園', at: [69.3, -5.5] },
  {
    id: 'travel_office',
    en: 'Amakawa Travel',
    ja: '天川トラベル',
    b: 'block_e2',
  },
  { id: 'family_flats', en: 'Family flats', ja: '家族寮', b: 'block_e3' },
  { id: 'director_house', en: 'Director’s house', ja: '所長の家', b: 'r9' },
  // dorms
  { id: 'dorm_court', en: 'Dorm courtyard', ja: '寮の前庭', at: [79.84, -1.3] },
  {
    id: 'coin_laundry',
    en: 'Coin laundry',
    ja: 'コインランドリー',
    at: [82.8, -6],
  },
  { id: 'sento', en: 'Sento', ja: '銭湯', at: [82.8, 3] },
  { id: 'eric_dorm', en: 'Eric’s dorm', ja: '社員寮', b: 'dorm_1' },
  {
    id: 'dorm_commons',
    en: 'Dorm common building',
    ja: '共用棟',
    b: 'dorm_gallery',
  },
  { id: 'inner_court', en: 'Dorm inner court', ja: '中庭', at: [101.6, 6.5] },
  { id: 'dorm_blocks', en: 'Dorm blocks', ja: '社員寮', b: 'dorm_3' },
  {
    id: 'north_residence',
    en: 'North residence',
    ja: '北レジデンス',
    b: 'housing_n',
  },
  { id: 'sea_terrace', en: 'Sea terrace', ja: '海のテラス', at: [126.5, 10.5] },
  // sports and baths
  { id: 'gym', en: 'Gym', ja: '体育館', b: 'gym' },
  { id: 'pool', en: 'Pool and showers', ja: 'プール', at: [67.7, -74] },
  {
    id: 'tennis_courts',
    en: 'Tennis courts',
    ja: 'テニスコート',
    at: [89.5, -72.5],
  },
  { id: 'onsen', en: 'Onsen', ja: '温泉', at: [122, -82] },
  {
    id: 'east_coast_walk',
    en: 'East coast walk',
    ja: '東の海岸道',
    at: [131, -16],
  },
  // harbour
  {
    id: 'ferry_terminal',
    en: 'Ferry terminal',
    ja: 'フェリー乗り場',
    b: 'ferry_terminal',
  },
  { id: 'supply_quay', en: 'Supply quay', ja: '荷揚げ場', at: [-80, -70] },
  {
    id: 'harbour_office',
    en: 'Harbour office',
    ja: '港の事務所',
    b: 'works_orange',
  },
  // old works
  { id: 'old_factory', en: 'Old factory', ja: '旧工場', b: 'factory' },
  { id: 'old_power_plant', en: 'Old power plant', ja: '旧発電所', b: 'nw_old' },
  {
    id: 'server_hall',
    en: 'Old server hall',
    ja: '旧サーバー棟',
    b: 'works_blue',
  },
  { id: 'works_yard', en: 'Works yard', ja: '工場跡の広場', at: [-64, -104] },
  {
    id: 'recycling_centre',
    en: 'Recycling centre',
    ja: 'リサイクルセンター',
    b: 'w2',
  },
  { id: 'research_lab', en: 'Amakawa Research', ja: '天川研究所', b: 'n4' },
];
