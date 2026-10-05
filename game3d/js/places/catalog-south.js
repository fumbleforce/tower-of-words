// The districts of the island's south half built to walk (docs/game/island.md): their things and registration IDs,
// each kept in its own file, gathered for the catalog (catalog.js).
import { SHOTENGAI_DETAILS, KARAOKE_DETAILS, KARAOKE_BOOTH_DETAILS } from './catalog-shotengai.js';
import { EAST_LANE_DETAILS } from './catalog-east-lane.js';
import { EAST_COAST_DETAILS, DORM_COMMONS_DETAILS } from './catalog-east-coast.js';
import { SPORTS_DETAILS, POOL_DETAILS, GYM_DETAILS } from './catalog-sports.js';
import { OFFICE_QUARTER_DETAILS } from './catalog-office-quarter.js';
import { HARBOUR_DETAILS } from './catalog-harbour.js';
import { WORKS_DETAILS } from './catalog-works.js';

export const SOUTH_HALF_DETAILS = {
  shotengai: SHOTENGAI_DETAILS,
  karaoke: KARAOKE_DETAILS,
  karaoke_booth: KARAOKE_BOOTH_DETAILS,
  east_lane: EAST_LANE_DETAILS,
  east_coast: EAST_COAST_DETAILS,
  dorm_commons: DORM_COMMONS_DETAILS,
  sports: SPORTS_DETAILS,
  pool: POOL_DETAILS,
  gym: GYM_DETAILS,
  office_quarter: OFFICE_QUARTER_DETAILS,
  harbour: HARBOUR_DETAILS,
  works: WORKS_DETAILS,
};
