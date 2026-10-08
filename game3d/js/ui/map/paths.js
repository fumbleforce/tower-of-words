// Cartography includes the locally authored physical cross street behind the tower.
// Keeping its pure plan separate avoids loading 3D builders into the map's data layer.
import { PATHS, toIsland } from '../../scenes/island-layout.js';
import { CROSS } from '../../scenes/forecourt/cross-plan.js';

export const MAP_PATHS = [
  ...PATHS,
  {
    id: 'tower_cross_street',
    kind: 'lane',
    rect: [...toIsland('forecourt', CROSS[0], CROSS[2]), ...toIsland('forecourt', CROSS[1], CROSS[3])],
  },
];
