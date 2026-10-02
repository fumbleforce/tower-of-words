// The districts of the island's south half built to walk (docs/game/island.md): their things and registration IDs,
// each kept in its own file, gathered for the catalog (catalog.js).
import { SHOTENGAI_DETAILS } from './catalog-shotengai.js';
import { EAST_LANE_DETAILS } from './catalog-east-lane.js';
import { EAST_COAST_DETAILS } from './catalog-east-coast.js';

export const SOUTH_HALF_DETAILS = {
  shotengai: SHOTENGAI_DETAILS,
  east_lane: EAST_LANE_DETAILS,
  east_coast: EAST_COAST_DETAILS,
};
