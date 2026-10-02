// Every nook's walks (outdoor/nooks.js), for a place's plan to add to its walkable rects; kept apart from the kits so
// a plan stays free of Three.js.
export const nookWalks = (list) => list.flatMap((n) => n.walks || []);
