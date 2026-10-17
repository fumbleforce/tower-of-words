// A room behind a side door in a shop's east end wall (island-south.js SIDE_DOOR: the clothes shop's workroom), carved
// out of the building's mass the shop street's builder lays (plaza-buildings.js shopStreet), in its frame: u along
// the street, v across it, y up. The mass round the room stays solid, so the room's walls, floor and ceiling are the
// faces of the pieces left round it, and the end wall keeps a doorway; the kit's door (kit/building/door.js, with
// hole: true) frames the opening, and scenes/shotengai/tailor.js lines and furnishes the room.
//   sideRoom(door, U, V)                      the door's island numbers in the street's frame (U: x to u, V: z to v)
//   sideRoomWall(box, { ua, ub, h, depth, v0, room })   the building's mass as boxes, the room and doorway left out

export function sideRoom(door, U, V) {
  const [x0, z0, x1, z1] = door.room;
  return {
    u0: U(x0),
    u1: U(x1),
    v0: V(z0),
    v1: V(z1),
    y: door.ceiling,
    dv0: V(door.z - door.w / 2),
    dv1: V(door.z + door.w / 2),
    dh: door.h,
  };
}

export function sideRoomWall(box, { ua, ub, h, depth, v0, room }) {
  const W0 = ua + 0.03,
    W1 = ub - 0.03,
    V1 = v0 + depth,
    { u0, u1, y } = room;
  // u0..u1, v0..v1, y0..y1 as a box (box() stands on its bottom)
  const part = (a, b, c, d, y0, y1) => box(b - a, y1 - y0, d - c, (a + b) / 2, y0, (c + d) / 2);
  return [
    part(W0, W1, v0, V1, y, h), // over the room, the whole building
    part(W0, u0, v0, V1, 0, y), // the shop's floor west of the room
    part(u0, W1, v0, room.v0, 0, y), // in front of it, toward the arcade
    part(u0, W1, room.v1, V1, 0, y), // behind it, the back wall
    // the end wall, either side of the doorway and over it
    part(u1, W1, room.v0, room.dv0, 0, y),
    part(u1, W1, room.dv1, room.v1, 0, y),
    part(u1, W1, room.dv0, room.dv1, room.dh, y),
  ];
}
