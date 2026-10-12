// Building IDs name destinations. A rendered part also needs an identity of its own:
// one market half entering the near ring must not hide the other half in the far model.
import { marketFootprints } from './market-route.js';

export function skylinePieces(building) {
  const pieces = marketFootprints(building);
  return pieces.length === 1 ? pieces : pieces.map((piece, i) => ({ ...piece, renderId: `${building.id}:part:${i}` }));
}
export const skylinePieceId = (building) => building.renderId || building.id;
