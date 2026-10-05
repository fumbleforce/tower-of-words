// The cast by role (docs/game/systems.md, Protagonists): game3d/data/cast/roles.json names each role's default person
// and whether another person may fill it; a cast set overrides some roles. A game keeps its resolved map in the save
// (`cast: { set, roles }`), so a later change to the data never changes an old game. Story files still name people
// by id; nothing on day 1 asks for a role yet. No DOM and no game imports.
import ROLES from '../data/cast/roles.json' with { type: 'json' };

export const ROLE_IDS = Object.keys(ROLES.roles);
export function castSet(set = 'default') {
  const over = ROLES.sets[set];
  if (!over) throw new Error(`no cast set ${set}`);
  const roles = {};
  for (const [role, r] of Object.entries(ROLES.roles)) roles[role] = over[role] || r.default;
  return { set, roles };
}
export const defaultCast = () => castSet('default');
// who fills a role in this game (an unknown role: null)
export const personFor = (cast, role) => cast?.roles?.[role] ?? ROLES.roles[role]?.default ?? null;
// put another person in a role (a plugin, or a later cast picker); a fixed role refuses
export function setRole(cast, role, person) {
  const r = ROLES.roles[role];
  if (!r) throw new Error(`no role ${role}`);
  if (!r.swappable && person !== r.default) throw new Error(`role ${role} is fixed to ${r.default}`);
  cast.roles[role] = person;
  return cast;
}
