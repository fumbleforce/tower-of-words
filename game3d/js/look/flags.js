// Which parts of the world look are on (review style-avenues-room, picked 2, 4 and 8; look/index.js):
//   surfaces  procedural materials on every model (avenue 2): Settings > Graphics > Surface detail; ?surf=0|1 forces it
//   bake      vertex colour and baked light (avenue 4): 'soft' (the game), 'hard' (the first version) or '0'; ?bake=
//   detail    small modelled detail in the props (avenue 8); ?detail=0 turns it off
// ?plainlook turns all three off (the look before, for comparison shots).
const Q = new URLSearchParams(location.search);
const plain = Q.has('plainlook');
export const LOOK = {
  surf: Q.has('surf') ? Q.get('surf') !== '0' : plain ? false : null,   // null: follow the setting
  bake: Q.has('bake') ? Q.get('bake') : plain ? '0' : 'soft',
  detail: Q.has('detail') ? Q.get('detail') !== '0' : !plain,
};
