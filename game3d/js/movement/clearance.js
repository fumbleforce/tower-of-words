export const CAPSULE_HEIGHT=1.2,DOOR_MARGIN=.05,PEOPLE_SCALE=1.18,capsuleHeight=t=>1.2*t;export function doorHeight(t){return Math.ceil(Math.round((capsuleHeight(t)+.05)*1e3)/50)*5/100}
