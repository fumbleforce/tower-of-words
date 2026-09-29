// Portable creator selections. Asset data stays in the local parts library.
export const MAX_RECIPE_BYTES = 64 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fields(value, allowed, label) {
  if (!object(value)) throw new Error(`${label} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown ${label} field: ${key}.`);
}
function number(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}
export function parseRecipe(text, lib) {
  if (typeof text !== 'string' || text.length > MAX_RECIPE_BYTES) throw new Error('Recipe must be a JSON file smaller than 64 KB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Recipe is not valid JSON.'); }
  if (object(data) && Object.hasOwn(data, 'format')) {
    fields(data, ['format', 'version', 'recipe'], 'file');
    if (data.format !== 'amakawa-creator' || data.version !== 1) throw new Error('This recipe file version is not supported.');
    data = data.recipe;
  }
  fields(data, ['body', 'parts', 'colours', 'height', 'fit'], 'recipe');
  if (typeof data.body !== 'string' || !Object.hasOwn(lib.sources, data.body)) throw new Error('This recipe uses an unavailable body.');
  const slots = [...new Set(lib.parts.map(part => part.slot))];
  fields(data.parts, slots, 'parts');
  const parts = {};
  for (const slot of slots) {
    const id = data.parts[slot];
    if (typeof id !== 'string' || !Object.hasOwn(lib.byId, id) || lib.byId[id].slot !== slot) {
      throw new Error(`Choose an available ${slot} part.`);
    }
    parts[slot] = id;
  }
  const colours = {};
  if (data.colours !== undefined && data.colours !== null) {
    fields(data.colours, [...slots.filter(slot => slot !== 'head' && slot !== 'hands'), 'skin'], 'colours');
    for (const [slot, colour] of Object.entries(data.colours)) {
      if (colour === null || colour === '') continue;
      if (typeof colour !== 'string' || !/^#[0-9a-f]{6}$/i.test(colour)) throw new Error(`${slot} colour must use six hex digits, such as #245678.`);
      colours[slot] = colour.toLowerCase();
    }
  }
  const recipe = { body: data.body, parts, colours, height: number(data.height ?? 1.1, .1, 3, 'Height') };
  if (data.fit !== undefined) {
    fields(data.fit, slots, 'fit');
    recipe.fit = {};
    for (const [slot, fit] of Object.entries(data.fit)) {
      fields(fit, ['scale', 'offset'], `${slot} fit`);
      const out = recipe.fit[slot] = {};
      if (fit.scale !== undefined) out.scale = number(fit.scale, .05, 5, `${slot} scale`);
      if (fit.offset !== undefined) {
        if (!Array.isArray(fit.offset) || fit.offset.length !== 3) throw new Error(`${slot} offset needs three numbers.`);
        out.offset = fit.offset.map(n => number(n, -3, 3, `${slot} offset`));
      }
    }
  }
  return recipe;
}
export function recipeFile(recipe) {
  return JSON.stringify({ format: 'amakawa-creator', version: 1, recipe }, null, 2) + '\n';
}
